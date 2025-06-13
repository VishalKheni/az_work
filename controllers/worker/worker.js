require('dotenv').config()
const db = require("../../config/db");
const moment = require('moment');
const { Op, where, Sequelize, col } = require("sequelize");
const { validateFiles, } = require('../../helpers/fileValidation');
const fs = require('fs');
const user = require('../../models/user');


function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    // const R = 6371; // Earth's radius in km
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

exports.addclockEntrry = async (req, res) => {
    try {
        const { project_id, type, address, latitude, longitude } = req.body;
        const { id: worker_id, company_id } = req.user;

        const now = moment.utc(); // Get current time in UTC
        const today = now.format('YYYY-MM-DD'); // Format in UTC date

        let project = await db.Project.findByPk(project_id, {
            attributes: ['id', 'project_name', 'latitude', 'longitude']
        })
        if (!project) {
            return res.status(404).json({ status: 0, message: "Project Not found" })
        }

        const distance = getDistanceFromLatLonInKm(parseFloat(latitude), parseFloat(longitude), parseFloat(project.latitude), parseFloat(project.longitude));
        const messasgeType = type === 'clock_in' ? 'in' : 'out';
        if (distance > 500) { // 500 meters     
            return res.status(400).json({
                status: 0,
                message: `You are too far from the project location. Must be within 500 meters to clock ${messasgeType}.`,
            });
        }

        if (type === 'clock_in') {
            const lastClockIn = await db.Clock_entry.findOne({
                where: {
                    worker_id,
                    date: today,
                    type: 'clock_in',
                    clock_out_time: null,
                },
                order: [['clock_in_time', 'DESC']],
            });
            if (lastClockIn) {
                return res.status(400).json({ status: 0, message: "Alredy clock in for this day" })
            }
            const clockin = await db.Clock_entry.create({
                worker_id,
                project_id: project.id,
                date: today,
                company_id,
                clock_in_time: now.toDate(),
                clock_in_address: address,
                latitude,
                longitude,
                break_time: "00:00:00",
                type,
            });
            return res.status(201).json({
                status: 1, message: 'Clock in successful',
                data: clockin,
                project: {
                    id: project.id,
                    project_name: project.project_name,
                }
            });
        }
        if (type === 'clock_out') {
            const lastClockIn = await db.Clock_entry.findOne({
                where: {
                    worker_id,
                    date: today,
                    type: 'clock_in',
                    clock_out_time: null,
                },
                order: [['clock_in_time', 'DESC']],
            });

            if (!lastClockIn) {
                return res.status(400).json({ status: 0, message: 'No active clock in found' });
            }

            lastClockIn.clock_out_time = now.toDate();
            lastClockIn.clock_out_address = address;
            lastClockIn.latitude = latitude;
            lastClockIn.longitude = longitude;
            lastClockIn.type = 'clock_out';

            const clockInTime = moment.utc(lastClockIn.clock_in_time);
            const clockOutTime = moment.utc(now);
            const sessionDurationMs = clockOutTime.diff(clockInTime);

            // Get previous entry (if any) to calculate break time
            const previousEntry = await db.Clock_entry.findOne({
                where: {
                    worker_id,
                    date: today,
                    clock_out_time: { [Op.not]: null },
                },
                order: [['clock_out_time', 'DESC']],
            });

            // let breakMs = 0;
            // if (previousEntry) {
            //     const prevClockOut = moment.utc(previousEntry.clock_out_time);
            //     breakMs = clockInTime.diff(prevClockOut);
            //     if (breakMs < 0) breakMs = 0;
            // }

            function msToHHMMSS(ms) {
                const totalSeconds = Math.floor(ms / 1000);
                const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
                const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
                const seconds = (totalSeconds % 60).toString().padStart(2, '0');
                return `${hours}:${minutes}:${seconds}`;
            }

            lastClockIn.duration = msToHHMMSS(sessionDurationMs);
            await lastClockIn.save();
            // lastClockIn.break_time = msToHHMMSS(breakMs);

            return res.status(200).json({
                status: 1,
                message: 'Clock out successful',
                workDuration: msToHHMMSS(sessionDurationMs),
                // breakDuration: msToHHMMSS(breakMs),
                data: lastClockIn,
                project: {
                    id: project.id,
                    project_name: project.project_name,
                }
            });
        }

        return res.status(400).json({ status: 0, message: 'Invalid clock type' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.getAllWorkHistory = async (req, res) => {
    try {
        const { id: worker_id } = req.user;
        let { page, limit } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;

        const { count, rows: histrory } = await db.Clock_entry.findAndCountAll({
            where: { worker_id },
            attributes: { exclude: ['type'] },
            include: [
                {
                    model: db.Project,
                    as: 'project',
                    attributes: ['id', 'project_name'],
                    include: [
                        {
                            model: db.Document,
                            as: "project_documents",
                            where: { type: 'image', },
                            required: false
                        }
                    ]
                }
            ],
            distinct: true,
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        })
        return res.status(200).json({
            status: 1,
            message: "Work history fetched Successfully",
            pagination: {
                totalData: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                limit: limit,
            },
            data: histrory
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}

exports.getProjectList = async (req, res) => {
    try {
        const today = moment().format('YYYY-MM-DD');
        // const projectList = await db.Project.findAll({ where: { company_id: req.user.company_id, status: 'active', is_deleted: false } });
        const projectList = await db.Project.findAll({
            where: {
                company_id: req.user.company_id,
                status: 'active',
                is_deleted: false,
                start_date: { [Op.lte]: today },
                end_date: { [Op.gte]: today },
            },
            attributes:{exclude: ['is_deleted']},
        });

        return res.status(200).json({
            status: 1,
            message: "Project List fetched successfully",
            data: projectList
        })
    } catch (error) {
        console.log('error', error)
        res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}


exports.getHistrory = async (req, res) => {
    try {
        const { id: worker_id } = req.user;
        let { page, limit, start_date, end_date } = req.query;

        page = parseInt(page) || 1;
        limit = parseInt(limit) || 5;
        const offset = (page - 1) * limit;

        const where = {
            worker_id,
            clock_in_time: { [Op.ne]: null },
            clock_out_time: { [Op.ne]: null }
        };

        if (start_date) {
            const startOfDay = moment(start_date).startOf('day').toDate();
            const endOfDay = moment(start_date).endOf('day').toDate();
            where.date = {
                [Op.between]: [startOfDay, endOfDay]
            };
        } if (start_date && end_date) {
            const start = moment(start_date).startOf('day').toDate();
            console.log('start', start)
            const end = moment(end_date).endOf('day').toDate();
            console.log('end', end)
            where.date = {
                [Op.between]: [start, end]
            };
        }

        const records = await db.Clock_entry.findAll({
            where,
            attributes: { exclude: ['type'] },
            include: [
                {
                    model: db.Project,
                    as: 'project',
                    attributes: ['id', 'project_name'],
                    required: false
                },
                {
                    model: db.Document,
                    as: 'clock_images',
                    where: { type: 'image' },
                    required: false
                }
            ],
            order: [['date', 'DESC'], ['createdAt', 'DESC']]
        });

        // Group entries by date
        const groupedMap = new Map();

        for (const entry of records) {
            const dateStr = moment(entry.date).format('YYYY-MM-DD');
            if (!groupedMap.has(dateStr)) {
                groupedMap.set(dateStr, []);
            }
            groupedMap.get(dateStr).push(entry);
        }

        // Convert to array (no break_time sum)
        const groupedArray = Array.from(groupedMap.entries()).map(([date, entries]) => ({
            date,
            break_time: entries[0].break_time,
            clock_entry: entries
        }));

        // Sort and paginate
        groupedArray.sort((a, b) => new Date(b.date) - new Date(a.date));
        const totalData = groupedArray.length;
        const paginatedData = groupedArray.slice(offset, offset + limit);

        return res.status(200).json({
            status: 1,
            message: "Work history fetched successfully",
            pagination: {
                totalData,
                totalPages: Math.ceil(totalData / limit),
                currentPage: page,
                limit
            },
            data: paginatedData
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.AllProjectList = async (req, res) => {
    try {
        let { page, limit, search } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;

        const whereCondition = {
            company_id: req.user.company_id,
            status: {
                [Op.in]: ['active', 'completed', 'deactive']
            }
        };


        if (search) {
            whereCondition.project_name = {
                [Op.like]: `%${search}%`
            };
        }

        const { count, rows: projectList } = await db.Project.findAndCountAll({
            where: { ...whereCondition },
            distinct: true,
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        });

        return res.status(200).json({
            status: 1,
            message: "All Project List fetched successfully",
            pagination: {
                totalData: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                limit: limit,
            },
            data: projectList
        })
    } catch (error) {
        console.log('error', error)
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}

exports.addclockImgaes = async (req, res) => {
    try {
        const { project_id, clock_entry_id } = req.body;
        const { clock_images } = req.files;
        const date = moment.utc().format('YYYY-MM-DD'); // Format in UTC date

        const project = await db.Project.findByPk(project_id);
        if (!project) return res.status(400).json({ status: 0, message: 'Project Not Found' });
        const clock_entry = await db.Clock_entry.findByPk(clock_entry_id);
        if (!clock_entry) return res.status(400).json({ status: 0, message: 'clock In Not Found' });

        const fileValidation = await validateFiles(clock_images, ["jpg", "jpeg", "png", "webp"], 25 * 1024 * 1024);
        if (!fileValidation.valid) return res.status(400).json({ status: 0, message: fileValidation.message });


        let clockImages;
        if (clock_images && clock_images.length > 0) {
            clockImages = clock_images.map(doc => ({
                project_id: project.id,
                worker_id: req.user.id,
                clock_entry_id: clock_entry.id,
                document_url: `clock_images/${doc.filename}`,
                date: date,
                type: "image"
            }));
            await db.Document.bulkCreate(clockImages);
        }

        return res.status(201).json({
            status: 1,
            message: "Clock out images added successfully",
            images: clockImages
        });
    } catch (error) {
        console.error('Error while create project:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};


exports.absencesList = async (req, res) => {
    try {
        const absencesList = await db.Absences.findAll({ where: { company_id: req.user.company_id, is_deleted: false } });
        // const absencesList = await db.Absences.findAll({ where: { created_by_admin: true } });

        return res.status(200).json({
            status: 1,
            message: "absences List fetched successfully",
            data: absencesList
        })
    } catch (error) {
        console.log('error', error)
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}

// exports.sendAbsencesRequest = async (req, res) => {
//     try {
//         let { absence_id, type, start_date, end_date, reason } = req.body;
//         type = parseInt(type);

//         const absence = await db.Absences.findByPk(absence_id);
//         if (!absence) {
//             return res.status(404).json({ status: 0, message: "Absence Not found" })
//         }


//         let requestedDays = 0;
//         const start = moment(start_date).startOf('day');
//         const end = type === 1 ? moment(end_date).startOf('day') : start.clone();


//         if (type === 0) {
//             // single day absence
//             if (start.day() === 0 || start.day() === 6) {
//                 return res.status(400).json({
//                     status: 0,
//                     message: "Cannot apply for absence on weekends (Saturday or Sunday)."
//                 });
//             }
//             requestedDays = 1;
//         } else if (type === 1) {
//             requestedDays = end.diff(start, 'days') + 1;
//         }


//         const overlappingRequests = await db.absence_request.findAll({
//             where: {
//                 worker_id: req.user.id,
//                 request_status: { [Op.in]: ['pending', 'accepted'] },
//                 [Op.or]: [
//                     {
//                         type: 0,
//                         start_date: {
//                             [Op.between]: [start.toDate(), end.toDate()]
//                         }
//                     },
//                     {
//                         type: 1,
//                         start_date: { [Op.lte]: end.toDate() },
//                         end_date: { [Op.gte]: start.toDate() }
//                     }
//                 ]
//             }
//         });

//         if (overlappingRequests.length > 0) {
//             return res.status(400).json({
//                 status: 0,
//                 message: "You've already applied for leave during these dates. Try selecting a different range."
//             });
//         }


//         if (absence.absence_type === "Vacation") {
//             // Fetch previous requests that are vacation type by joining the absence table
//             const previousRequests = await db.absence_request.findAll({
//                 where: {
//                     worker_id: req.user.id,
//                     absence_id: absence_id,
//                     request_status: { [Op.in]: ['pending', 'accepted'] },
//                 },
//                 include: [{
//                     model: db.Absences,
//                     as: 'absence',
//                     where: { absence_type: 'Vacation' },
//                     attributes: ['absence_type'] // no need to fetch full absence details
//                 }]
//             });

//             let totalUsedVacationDays = 0;

//             previousRequests.forEach(request => {
//                 if (request.type === 0) {
//                     totalUsedVacationDays += 1;
//                 } else if (request.type === 1) {
//                     const start = moment(request.start_date).startOf('day');
//                     const end = moment(request.end_date).startOf('day');
//                     const days = end.diff(start, 'days') + 1;
//                     totalUsedVacationDays += days;
//                 }
//             });
//             const availableVacationDays = req.user.vacation_days || 0;
//             if (totalUsedVacationDays + requestedDays > availableVacationDays) {
//                 return res.status(400).json({
//                     status: 0,
//                     message: `Your vacation day limit has been reached.`
//                 });
//             }
//         }

//         const absenceRequest = await db.absence_request.create({
//             worker_id: req.user.id,
//             absence_id: absence.id,
//             start_date: start_date,
//             end_date: type == 1 ? end_date : null,
//             reason: reason,
//             type: type
//         });

//         return res.status(201).json({
//             status: 1,
//             message: "Absence request sent successfully",
//             data: absenceRequest
//         });
//     } catch (error) {
//         console.log('error', error)
//         return res.status(500).json({ status: 0, message: 'Internal server error' });
//     }
// }


exports.sendAbsencesRequest = async (req, res) => {
    try {
        let { absence_id, type, start_date, end_date, reason } = req.body;
        type = parseInt(type);

        const absence = await db.Absences.findByPk(absence_id);
        if (!absence) {
            return res.status(404).json({ status: 0, message: "Absence Not found" });
        }

        let requestedDays = 0;
        const start = moment(start_date).startOf('day');
        const end = type === 1 ? moment(end_date).startOf('day') : start.clone();

        // Fetch holidays in the month of start_date
        const month = start.month() + 1;
        const year = start.year();

        const holidays = await db.Holiday.findAll({
            where: {
                company_id: req.user.company_id,
                is_holiday_checked: true,
                [db.Sequelize.Op.and]: [
                    db.sequelize.where(db.sequelize.fn('MONTH', db.sequelize.col('date')), month),
                    db.sequelize.where(db.sequelize.fn('YEAR', db.sequelize.col('date')), year)
                ]
            },
            attributes: ['date'],
        });

        const holidayDates = holidays.map(h => moment(h.date).format('YYYY-MM-DD'));

        // Type 0 - Single Day Absence
        if (type === 0) {
            const formattedDate = start.format('YYYY-MM-DD');
            if (start.day() === 0 || start.day() === 6) {
                return res.status(400).json({
                    status: 0,
                    message: "Cannot apply for absence on weekends (Saturday or Sunday)."
                });
            }

            if (holidayDates.includes(formattedDate)) {
                return res.status(400).json({
                    status: 0,
                    message: "Cannot apply absence on a holiday."
                });
            }

            requestedDays = 1;
        } else if (type === 1) {
            requestedDays = end.diff(start, 'days') + 1;
        }

        // Type 1 - Multi Day Absence
        // else if (type === 1) {
        //     const dateRange = [];
        //     let current = start.clone();
        //     while (current.isSameOrBefore(end)) {
        //         dateRange.push(current.format('YYYY-MM-DD'));
        //         current.add(1, 'days');
        //     }

        //     const conflictHoliday = dateRange.find(date => holidayDates.includes(date));
        //     console.log('dateRange', dateRange)
        //     if (conflictHoliday) {
        //         return res.status(400).json({
        //             status: 0,
        //             message: "You've already applied for leave during these dates. Try selecting a different range."
        //         });
        //     }

        //     requestedDays = dateRange.length;
        // }

        // Overlapping request check
        const overlappingRequests = await db.absence_request.findAll({
            where: {
                worker_id: req.user.id,
                request_status: { [Op.in]: ['pending', 'accepted'] },
                [Op.or]: [
                    {
                        type: 0,
                        start_date: {
                            [Op.between]: [start.toDate(), end.toDate()]
                        }
                    },
                    {
                        type: 1,
                        start_date: { [Op.lte]: end.toDate() },
                        end_date: { [Op.gte]: start.toDate() }
                    }
                ]
            }
        });

        if (overlappingRequests.length > 0) {
            return res.status(400).json({
                status: 0,
                message: "You've already applied for leave during these dates. Try selecting a different range."
            });
        }

        // Vacation day limit check
        if (absence.absence_type === "Vacation") {
            const previousRequests = await db.absence_request.findAll({
                where: {
                    worker_id: req.user.id,
                    absence_id: absence_id,
                    request_status: { [Op.in]: ['pending', 'accepted'] },
                },
                include: [{
                    model: db.Absences,
                    as: 'absence',
                    where: { absence_type: 'Vacation' },
                    attributes: ['absence_type']
                }]
            });

            let totalUsedVacationDays = 0;

            previousRequests.forEach(request => {
                if (request.type === 0) {
                    totalUsedVacationDays += 1;
                } else if (request.type === 1) {
                    const s = moment(request.start_date).startOf('day');
                    const e = moment(request.end_date).startOf('day');
                    totalUsedVacationDays += e.diff(s, 'days') + 1;
                }
            });

            const availableVacationDays = req.user.vacation_days || 0;
            if (totalUsedVacationDays + requestedDays > availableVacationDays) {
                return res.status(400).json({
                    status: 0,
                    message: `Your vacation day limit has been reached.`
                });
            }
        }

        const absenceRequest = await db.absence_request.create({
            worker_id: req.user.id,
            absence_id: absence.id,
            start_date: start_date,
            end_date: type == 1 ? end_date : null,
            reason: reason,
            type: type
        });

        return res.status(201).json({
            status: 1,
            message: "Absence request sent successfully",
            data: absenceRequest
        });
    } catch (error) {
        console.log('error', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}

exports.workerAbsenceRequestList = async (req, res) => {
    try {
        let { page, limit } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;

        const { count, rows: requestList } = await db.absence_request.findAndCountAll({
            where: { worker_id: req.user.id },
            include: [
                {
                    model: db.Absences,
                    as: 'absence',
                    attributes: ['id', 'absence_type', 'absence_logo', 'status'],
                },
            ],
            distinct: true,
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        });

        return res.status(200).json({
            status: 1,
            message: "Absence request list fetched successfully",
            pagination: {
                totalAbsence: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                limit: limit,
            },
            data: requestList
        });

    } catch (error) {
        console.error('Error while fetching absence request list:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.accountDetail = async (req, res) => {
    try {
        const requestList = await db.User.findOne({
            where: { id: req.user.id },
            attributes: ['id', 'job_title_id', 'firstname', 'lastname', 'profile_image', 'email', 'country_code', 'iso_code', 'phone_number', 'address', 'insurance_number', 'employment_date', 'vacation_days', 'experience'],
            include: [
                {
                    model: db.Job_title,
                    as: 'job_title',
                    attributes: ['id', 'job_title'],
                    required: false
                },
            ],
        });

        return res.status(200).json({
            status: 1,
            message: "Account detail fetched successfully",
            data: requestList
        });

    } catch (error) {
        console.error('account Detail list:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};


exports.homeScreenCount = async (req, res) => {
    try {
        const { month, year } = req.query;
        // const currentDate = moment.utc();


        const adjustedMonth = month ? parseInt(month) - 1 : currentDate.month(); // must subtract 1 for 0-based month
        const selectedYear = year ? parseInt(year) : currentDate.year();

        const startOfMonth = moment.utc({ year: selectedYear, month: adjustedMonth }).startOf('month').toDate();
        const endOfMonth = moment.utc({ year: selectedYear, month: adjustedMonth }).endOf('month').toDate();

        // 1. Get user
        const user = await db.User.findOne({
            where: { id: req.user.id },
            attributes: ['id', 'company_id', 'vacation_days'],
        });

        if (!user) {
            return res.status(404).json({ status: 0, message: 'User not found' });
        }

        // 2. Get all clock entries with duration
        const entries = await db.Clock_entry.findAll({
            where: {
                worker_id: req.user.id,
                status: "approved",
                clock_in_time: {
                    [Op.between]: [startOfMonth, endOfMonth]
                },
                duration: { [Op.ne]: null }
            },
            attributes: ['duration']
        });
        // console.log('entries', entries)
        let totalSeconds = 0;
        entries.forEach(entry => {
            const [hh, mm, ss] = entry.duration.split(':').map(Number);
            totalSeconds += (hh * 3600) + (mm * 60) + ss;
        });

        const company = await db.Company.findOne({
            where: { id: user.company_id },
            include: [{
                model: db.Branch,
                as: 'industry',
                attributes: ['weekly_hours', 'monthly_hours', 'yearly_hours'],
                required: false
            }]
        });

        // const totalMonthlyHours = company?.industry?.monthly_hours || 0;
        const totalMonthlyHours = company?.monthly_hours || 0;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const totalRoundedHours = hours + (minutes >= 60 ? 1 : 0);  // avoid overcounting
        const overTime = totalRoundedHours > totalMonthlyHours
            ? totalRoundedHours - totalMonthlyHours
            : 0;

        const YearlyHours = company?.yearly_hours || 0;
        const yearlySessions = await db.Clock_entry.findAll({
            where: {
                worker_id: req.user.id,
                status: "approved",
                clock_in_time: {
                    [Op.between]: [
                        moment.utc().year(selectedYear).startOf('year').format('YYYY-MM-DD'),
                        moment.utc().year(selectedYear).endOf('year').format('YYYY-MM-DD')
                    ]
                },
                duration: {
                    [Op.ne]: null
                }
            },
            attributes: ['duration']
        });
        let totalYearlySeconds = 0;
        yearlySessions.forEach(entry => {
            const [hh, mm, ss] = entry.duration.split(':').map(Number);
            totalYearlySeconds += (hh * 3600) + (mm * 60) + ss;
        });

        const totalYearlyHours = totalYearlySeconds / 3600;
        const hourlyAccount = Math.round(totalYearlyHours - Math.round(YearlyHours))
        // const hourlyAccount = Math.round(YearlyHours - Math.round(totalYearlyHours))


        // vacation days count
        const usedRequests = await db.absence_request.findAll({
            where: {
                worker_id: req.user.id,
                request_status: 'accepted',
                createdAt: {
                    [Op.between]: [
                        moment.utc().year(selectedYear).startOf('year').format('YYYY-MM-DD'),
                        moment.utc().year(selectedYear).endOf('year').format('YYYY-MM-DD')
                    ]
                },
            },
            include: [
                {
                    model: db.Absences,
                    as: 'absence',
                    where: { absence_type: 'Vacation' },
                    // required: false
                },
            ]
        });
        let usedDays = 0;
        usedRequests.forEach(request => {
            const startDate = moment(request.start_date);
            const endDate = request.type === 0 || !request.end_date
                ? startDate
                : moment(request.end_date);

            let tempDate = moment(startDate);

            while (tempDate.isSameOrBefore(endDate)) {
                const dayOfWeek = tempDate.isoWeekday(); // 1 (Monday) to 7 (Sunday)
                if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                    usedDays++;
                }
                tempDate.add(1, 'day');
            }
        });

        // Planned vacation days (future)
        const plannedRequests = await db.absence_request.findAll({
            where: {
                worker_id: req.user.id,
                request_status: 'pending',
                createdAt: {
                    [Op.between]: [
                        moment.utc().year(selectedYear).startOf('year').format('YYYY-MM-DD'),
                        moment.utc().year(selectedYear).endOf('year').format('YYYY-MM-DD')
                    ]
                },
            },
            include: [
                {
                    model: db.Absences,
                    as: 'absence',
                    where: { absence_type: 'Vacation' },
                },
            ]
        });

        let plannedDays = 0;
        plannedRequests.forEach(request => {
            const startDate = moment(request.start_date);
            const endDate = request.type === 0 || !request.end_date
                ? startDate
                : moment(request.end_date);

            let tempDate = moment(startDate);

            while (tempDate.isSameOrBefore(endDate)) {
                const dayOfWeek = tempDate.isoWeekday(); // 1 = Monday, 7 = Sunday
                if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                    plannedDays++;
                }
                tempDate.add(1, 'day');
            }
        });
        const remainingDays = parseInt(user.vacation_days) - usedDays - plannedDays;


        const Date = moment.utc().format('YYYY-MM-DD');
        const todaySessions = await db.Clock_entry.findAll({
            where: {
                worker_id: req.user.id,
                date: Date,
            },
            order: [['id', 'DESC']],
            limit: 1
        });
        const mappedSessions = todaySessions.map(session => ({
            id: session.id,
            project_id: session.project_id,
            type: session.type,
            clock_in_time: session.clock_in_time,
            clock_out_time: session.clock_out_time,
        }));

        const todayDate = moment.utc().format('YYYY-MM-DD');
        const DAILY_FIXED_HOURS = company?.weekly_hours
            ? company?.weekly_hours / 5
            : 0;

        const overtimeEntries = await db.Clock_entry.findAll({
            where: {
                worker_id: req.user.id,
                status: "approved",
                date: {
                    [Op.between]: [
                        moment.utc().startOf('year').format('YYYY-MM-DD'),
                        todayDate
                    ]
                },
                duration: {
                    [Op.ne]: null
                }
            },
            attributes: ['date', 'duration']
        });

        // Group durations by date
        const dailyDurations = {};

        overtimeEntries.forEach(entry => {
            const [hh, mm, ss] = entry.duration.split(':').map(Number);
            const totalSeconds = (hh * 3600) + (mm * 60) + ss;

            if (!dailyDurations[entry.date]) {
                dailyDurations[entry.date] = 0;
            }
            dailyDurations[entry.date] += totalSeconds;
        });

        // Calculate overtime per day
        let totalOvertimeHours = 0;
        let todayOvertime = 0;

        for (const date in dailyDurations) {
            const hoursWorked = dailyDurations[date] / 3600;
            const overtime = hoursWorked > DAILY_FIXED_HOURS
                ? hoursWorked - DAILY_FIXED_HOURS
                : 0;

            if (date === todayDate) {
                todayOvertime = overtime;
            }
            totalOvertimeHours += overtime;
        }

        // console.log("Today's Overtime:", todayOvertime);
        // console.log("Total Overtime Till Today:", totalOvertimeHours);

        let clock_in_time = null;
        if (mappedSessions.length > 0) {
            const firstSession = mappedSessions[0];
            if (firstSession.clock_in_time && !firstSession.clock_out_time) {
                clock_in_time = moment(firstSession.clock_in_time).utc().format('HH:mm:ss');
            }
            var project = await db.Project.findByPk(mappedSessions[0].project_id, {
                attributes: ['id', 'project_name']
            })
        }

        return res.status(200).json({
            status: 1,
            message: "Home screen count fetched successfully",
            work_summary: {
                clock_entry_id: mappedSessions.length > 0 ? mappedSessions[0].id : null,
                type: mappedSessions.length > 0 ? mappedSessions[0].type : null,
                clock_in_time: clock_in_time,
                project: mappedSessions.length > 0 ? project : null,
                total_monthly_hours: parseInt(totalMonthlyHours),
                monthly_worked_time: totalRoundedHours,
                over_time: overTime,
                total_yearly_hours: parseInt(YearlyHours),
                hourly_account: hourlyAccount,
                total_overtime_hours: Math.round(totalOvertimeHours),
                total_vacation_days: parseInt(user.vacation_days),
                used_days: usedDays,
                planned_days: plannedDays,
                remaining_days: remainingDays,
            }
        });

    } catch (error) {
        console.error('homeScreenCount Error:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};


exports.AbsenceScrenCalendar = async (req, res) => {
    try {
        let { month, year } = req.query;
        year = parseInt(year);
        month = parseInt(month);
        const startOfMonth = moment({ year, month: month - 1 }).startOf('month').format('YYYY-MM-DD');
        const endOfMonth = moment({ year, month: month - 1 }).endOf('month').format('YYYY-MM-DD');

        const user = await db.User.findOne({
            where: { id: req.user.id },
            attributes: ['id', 'company_id', 'vacation_days', 'employment_date', 'work_balance'],
            include: [
                {
                    model: db.Clock_entry,
                    as: "clock_entries",
                    where: {
                        worker_id: req.user.id,
                        status: "approved",
                        date: {
                            [Op.between]: [startOfMonth, endOfMonth]
                        },
                        duration: { [Op.ne]: null }
                    },
                    required: false,
                    attributes: ['date'],
                    order: [['date', 'ASC']],
                },
                {
                    model: db.absence_request,
                    as: "absence_requests",
                    where: {
                        worker_id: req.user.id,
                        request_status: "accepted",
                        [Op.or]: [
                            {
                                type: 0,
                                start_date: {
                                    [Op.between]: [startOfMonth, endOfMonth]
                                }
                            },
                            {
                                type: 1,
                                [Op.or]: [
                                    {
                                        start_date: {
                                            [Op.between]: [startOfMonth, endOfMonth]
                                        }
                                    },
                                    {
                                        end_date: {
                                            [Op.between]: [startOfMonth, endOfMonth]
                                        }
                                    },
                                    {
                                        start_date: {
                                            [Op.lte]: startOfMonth
                                        },
                                        end_date: {
                                            [Op.gte]: endOfMonth
                                        }
                                    }
                                ]
                            }
                        ]
                    },
                    attributes: ['id', 'worker_id', 'absence_id', 'start_date', 'end_date'],
                    order: [['id', 'ASC']],
                    required: false,
                    include: [
                        {
                            model: db.Absences,
                            as: 'absence',
                            attributes: ['id', 'absence_type', 'absence_logo', 'status'],
                            required: false,
                        },
                    ],
                }
            ]
        });

        if (!user) {
            return res.status(404).json({ status: 0, message: 'User not found' });
        }

        const uniqueClockDates = [
            ...new Set(user.clock_entries.map(entry => entry.date))
        ].sort().map(date => ({ date }));

        const sortedAbsences = user.absence_requests.sort((a, b) =>
            new Date(a.start_date) - new Date(b.start_date)
        );
        const holidays = await db.Holiday.findAll({
            where: {
                company_id: req.user.company_id,
                is_holiday_checked: true,
                [db.Sequelize.Op.and]: [
                    db.sequelize.where(db.sequelize.fn('MONTH', db.sequelize.col('date')), month),
                    db.sequelize.where(db.sequelize.fn('YEAR', db.sequelize.col('date')), year)
                ]
            },
            attributes: { exclude: ['user_id', 'admin_holiday_id', 'created_by_admin', 'createdAt', 'updatedAt'] },
            order: [['date', 'DESC']]
        });

        var getHolidays = holidays?.map((holiday) => {
            return {
                ...holiday.toJSON(),
                image_url: "absence_logo/calendar.png"
            };
        });


        const entries = await db.Clock_entry.findAll({
            where: {
                worker_id: req.user.id,
                status: "approved",
                date: {
                    [Op.between]: [startOfMonth, endOfMonth]
                },
                duration: { [Op.ne]: null }
            },
            attributes: ['duration']
        });

        let totalSeconds = 0;
        entries.forEach(entry => {
            const [hh, mm, ss] = entry.duration.split(':').map(Number);
            totalSeconds += (hh * 3600) + (mm * 60) + ss;
        });

        const company = await db.Company.findOne({
            where: { id: user.company_id },
            include: [{
                model: db.Branch,
                as: 'industry',
                attributes: ['monthly_hours', 'yearly_hours'],
                required: false
            }]
        });

        // const totalMonthlyHours = company?.industry?.monthly_hours || 0;
        const totalMonthlyHours = company?.monthly_hours || 0;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const totalRoundedHours = hours + (minutes >= 60 ? 1 : 0);  // avoid overcounting
        const overTime = totalRoundedHours > totalMonthlyHours
            ? totalRoundedHours - totalMonthlyHours
            : 0;

        const usedRequests = await db.absence_request.findAll({
            where: {
                worker_id: req.user.id,
                request_status: 'accepted',
                // updatedAt: {
                //     [Op.between]: [startOfMonth, endOfMonth]
                // }
            },
            include: [
                {
                    model: db.Absences,
                    as: 'absence',
                    where: { absence_type: 'vacation' },
                    // required: false
                },
            ]
        });

        let usedDays = 0;
        usedRequests.forEach(request => {
            const startDate = moment(request.start_date);
            const endDate = request.type === 0 || !request.end_date
                ? startDate
                : moment(request.end_date);

            let tempDate = moment(startDate);

            while (tempDate.isSameOrBefore(endDate)) {
                const dayOfWeek = tempDate.isoWeekday(); // 1 (Monday) to 7 (Sunday)
                if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                    usedDays++;
                }
                tempDate.add(1, 'day');
            }
        });

        // Planned vacation days (future)
        const plannedRequests = await db.absence_request.findAll({
            where: {
                worker_id: req.user.id,
                request_status: 'pending',
                // start_date: { [Op.gt]: moment().format('YYYY-MM-DD') },
            },
            include: [
                {
                    model: db.Absences,
                    as: 'absence',
                    where: { absence_type: 'vacation' },
                    // required: false
                },
            ]
        });
        let plannedDays = 0;
        plannedRequests.forEach(request => {
            const startDate = moment(request.start_date);
            const endDate = request.type === 0 || !request.end_date
                ? startDate
                : moment(request.end_date);

            let tempDate = moment(startDate);

            while (tempDate.isSameOrBefore(endDate)) {
                const dayOfWeek = tempDate.isoWeekday(); // 1 = Monday, 7 = Sunday
                if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                    plannedDays++;
                }
                tempDate.add(1, 'day');
            }
        });
        const remainingDays = parseInt(user.vacation_days) - usedDays - plannedDays;


        // const today = moment(); // Or use moment() in production
        // const startMonth = moment(today).startOf('month');
        // const endOfRange = moment(today); // Only up to current date

        const today = moment();
        const startMonth = moment({ year, month: month - 1 }).startOf('month');
        const endMonth = moment(startOfMonth).endOf('month');
        const isCurrentMonth = today.month() === startMonth.month() && today.year() === startMonth.year();
        const endOfRange = isCurrentMonth ? today : endMonth;

        // 1. Count working days (Mon–Fri) from start of month to today
        let totalWorkingDays = 0;
        let dayCursor = moment(startMonth);
        while (dayCursor.isSameOrBefore(endOfRange, 'day')) {
            const dayOfWeek = dayCursor.isoWeekday(); // 1 (Mon) - 7 (Sun)
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                totalWorkingDays++;
            }
            dayCursor.add(1, 'day');
        }

        // present day count
        const clockentries = await db.Clock_entry.findAll({
            where: {
                worker_id: req.user.id,
                status: "approved",
                date: {
                    [Op.between]: [startMonth.format('YYYY-MM-DD'), endOfRange.format('YYYY-MM-DD')]
                },
                duration: {
                    [Op.ne]: null
                }
            },
            attributes: ['date'] // Only need date to count unique days
        });

        const presentDates = new Set();
        clockentries.forEach(entry => {
            presentDates.add(moment(entry.date).format('YYYY-MM-DD'));
        });
        // -----------------------------------------

        // 2. Fetch accepted absences in current month (only up to today)
        const absences = await db.absence_request.findAll({
            where: {
                worker_id: req.user.id,
                request_status: 'accepted',
                [Op.or]: [
                    {
                        type: 0,
                        start_date: {
                            [Op.between]: [startOfMonth, endOfMonth]
                        }
                    },
                    {
                        type: 1,
                        [Op.or]: [
                            {
                                start_date: {
                                    [Op.between]: [startOfMonth, endOfMonth]
                                }
                            },
                            {
                                end_date: {
                                    [Op.between]: [startOfMonth, endOfMonth]
                                }
                            },
                            {
                                start_date: {
                                    [Op.lte]: startOfMonth
                                },
                                end_date: {
                                    [Op.gte]: endOfMonth
                                }
                            }
                        ]
                    }
                ]
            }
        });
        // 3. Identify absent weekdays (Mon–Fri only)
        const absentDates = new Set();
        absences.forEach(abs => {
            const startDate = moment(abs.start_date);
            const endDate = abs.type === 0 || !abs.end_date
                ? startDate
                : moment(abs.end_date);

            let current = moment(startDate);
            while (current.isSameOrBefore(endDate, 'day') && current.isSameOrBefore(endOfRange, 'day')) {
                const dayOfWeek = current.isoWeekday();
                if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                    absentDates.add(current.format('YYYY-MM-DD'));
                }
                current.add(1, 'day');
            }
        });


        let totalAbsenceDays = 0;
        for (const absence of absences) {
            if (absence.type === 0 && absence.start_date) {
                const day = moment(absence.start_date).isoWeekday();
                if (day >= 1 && day <= 5) {
                    totalAbsenceDays += 1;
                }
            } else if (absence.type === 1 && absence.start_date && absence.end_date) {
                const start = moment(absence.start_date).startOf('day');
                const end = moment(absence.end_date).startOf('day');

                let current = moment(start);
                while (current.isSameOrBefore(end, 'day') && current.isSameOrBefore(endOfMonth, 'day')) {
                    const dayOfWeek = current.isoWeekday();
                    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                        totalAbsenceDays += 1;
                    }
                    current.add(1, 'day');
                }
            }
        }


        // const totalAbsentDays = absentDates.size; absences
        const totalPresentDays = presentDates.size;
        const attendancePercentage = totalWorkingDays === 0 ? '0.00' :
            ((totalPresentDays / totalWorkingDays) * 100).toFixed(2);



        return res.status(200).json({
            status: 1,
            message: "Absence scrren calendar fetched successfully",
            data: {
                planed_hours: parseInt(totalMonthlyHours),
                worked_hour: totalRoundedHours,
                // balance: overTime,
                balance: user.work_balance,
                vacation_token: user.vacation_days,
                vacation_remaining: remainingDays,
                percentage: parseFloat(attendancePercentage),
                total_present_days: totalPresentDays,
                total_absent_days: totalAbsenceDays,
                clock_entries: uniqueClockDates,
                absence_requests: sortedAbsences,
                holidays: getHolidays
            }
        });

    } catch (error) {
        console.error('Absence scrren calendar Error:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });

    }
}


exports.deleteimage = async (req, res) => {
    try {
        const { image_id } = req.query;

        const image = await db.Document.findOne({ where: { id: image_id, type: "image" } });
        if (!image) return res.status(400).json({ status: 0, message: 'Image Not Found' });

        const filePath = `public/${image.document_url}`;
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await image.destroy();

        return res.status(200).json({
            status: 1,
            message: "Image deleted successfully",
        });
    } catch (error) {
        console.error('Error while delete project:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.editClockEntry = async (req, res) => {
    const { clock_entry_id, clock_in_time, clock_out_time, reason } = req.body;

    try {
        const entry = await db.Clock_entry.findByPk(clock_entry_id);
        if (!entry) {
            return res.status(404).json({ status: 0, message: 'Clock entry not found' });
        }

        if (entry.status === "approved") {
            return res.json({ status: 0, message: "Clock entry is alredy approved" });
        }
        // Update times
        if (clock_in_time) {
            entry.clock_in_time = clock_in_time;
            entry.clock_in_reason = reason;
            await entry.save()
        }
        if (clock_out_time) {
            entry.clock_out_time = clock_out_time;
            entry.clock_out_reason = reason;
            await entry.save()
        }

        // Calculate duration if both times are present
        if (entry.clock_in_time && entry.clock_out_time) {
            const start = moment(entry.clock_in_time);
            const end = moment(entry.clock_out_time);
            const duration = moment.utc(end.diff(start)).format('HH:mm:ss');
            entry.duration = duration;
            await entry.save()
        }

        return res.json({ status: 1, message: 'Clock entry updated successfully', data: entry });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.companyDetail = async (req, res) => {
    try {
        const company = await db.Company.findOne({
            where: { id: req.user.company_id },
            attributes: ['id', 'company_name', 'company_logo', 'country_code', 'iso_code', 'phone_number', 'address'],
            include: [
                {
                    model: db.Branch,
                    as: 'industry',
                    attributes: ['id', 'branch_name']
                }
            ]
        });
        if (!company) return res.status(404).json({ status: 0, message: 'Company Not Found' });


        return res.status(200).json({
            status: 1,
            message: "Company detail fetched successfully",
            data: company
        });
    } catch (error) {
        console.error('Error while delete project:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};


// extra testing apis
exports.addclockEntrryV1 = async (req, res) => {
    try {
        const { project_id, type, address, latitude, longitude, worker_id, date, clock_in_time, clock_out_time } = req.body;

        const worker = await db.User.findOne({
            where: { id: worker_id, user_role: 'worker' },
            attributes: ['id', 'company_id']
        });
        if (!worker) {
            return res.status(404).json({ status: 0, message: "Worker not found" });
        }

        let project = await db.Project.findByPk(project_id, {
            attributes: ['id', 'project_name', 'latitude', 'longitude']
        });
        if (!project) {
            return res.status(404).json({ status: 0, message: "Project not found" });
        }

        const distance = getDistanceFromLatLonInKm(parseFloat(latitude), parseFloat(longitude), parseFloat(project.latitude), parseFloat(project.longitude));
        console.log('distance', distance)
        if (distance > 0.5) {
            return res.status(400).json({
                status: 0,
                message: `You are too far from the project location. Must be within 500 meters to clock in.`,
            });
        }

        if (type === 'clock_in') {
            const existingClockIn = await db.Clock_entry.findOne({
                where: {
                    worker_id: worker.id,
                    date,
                    type: 'clock_in',
                    clock_out_time: null,
                },
                order: [['clock_in_time', 'DESC']],
            });
            if (existingClockIn) {
                return res.status(400).json({ status: 0, message: "Already clocked in for this day" });
            }

            const clockin = await db.Clock_entry.create({
                worker_id,
                project_id: project.id,
                date,
                company_id: worker.company_id,
                clock_in_time: moment.utc(clock_in_time).toDate(),
                clock_in_address: address,
                latitude,
                longitude,
                break_time: "00:00:00",
                type,
            });

            return res.status(201).json({
                status: 1,
                message: 'Clock-in successful',
                data: clockin,
                project: {
                    id: project.id,
                    project_name: project.project_name,
                }
            });
        }

        if (type === 'clock_out') {
            const lastClockIn = await db.Clock_entry.findOne({
                where: {
                    worker_id: worker.id,
                    date,
                    type: 'clock_in',
                    clock_out_time: null,
                },
                order: [['clock_in_time', 'DESC']],
            });

            if (!lastClockIn) {
                return res.status(400).json({ status: 0, message: 'No active clock-in found' });
            }

            const clockInTime = moment.utc(lastClockIn.clock_in_time);
            const clockOutMoment = moment.utc(clock_out_time);
            const sessionDurationMs = clockOutMoment.diff(clockInTime);

            // Calculate break time
            const previousEntry = await db.Clock_entry.findOne({
                where: {
                    worker_id,
                    date,
                    clock_out_time: { [Op.not]: null },
                },
                order: [['clock_out_time', 'DESC']],
            });

            // let breakMs = 0;
            // if (previousEntry) {
            //     const prevClockOut = moment.utc(previousEntry.clock_out_time);
            //     breakMs = clockInTime.diff(prevClockOut);
            //     if (breakMs < 0) breakMs = 0;
            // }

            function msToHHMMSS(ms) {
                const totalSeconds = Math.floor(ms / 1000);
                const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
                const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
                const seconds = (totalSeconds % 60).toString().padStart(2, '0');
                return `${hours}:${minutes}:${seconds}`;
            }

            lastClockIn.clock_out_time = clockOutMoment.toDate();
            lastClockIn.clock_out_address = address;
            lastClockIn.latitude = latitude;
            lastClockIn.longitude = longitude;
            lastClockIn.type = 'clock_out';
            lastClockIn.duration = msToHHMMSS(sessionDurationMs);
            await lastClockIn.save();
            // lastClockIn.break_time = msToHHMMSS(breakMs);

            return res.status(200).json({
                status: 1,
                message: 'Clock out successful',
                workDuration: msToHHMMSS(sessionDurationMs),
                // breakDuration: msToHHMMSS(breakMs),
                data: lastClockIn,
                project: {
                    id: project.id,
                    project_name: project.project_name,
                }
            });
        }

        return res.status(400).json({ status: 0, message: 'Invalid clock type' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};


const parseBreakTimeToSeconds = (breakTimeStr) => {
    const [hours, minutes, seconds] = breakTimeStr.split(':').map(Number);
    return (hours * 3600) + (minutes * 60) + seconds;
};

const formatSecondsToHHMMSS = (totalSeconds) => {
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
};


exports.updatebreakTime = async (req, res) => {
    try {
        const { worker_id, date } = req.body;

        // Validate worker
        const worker = await db.User.findOne({
            where: { id: worker_id, user_role: 'worker' },
            attributes: ['id']
        });

        if (!worker) {
            return res.status(404).json({ status: 0, message: "Worker not found" });
        }

        const startOfDay = moment(date).startOf('day').toDate();
        const endOfDay = moment(date).endOf('day').toDate();

        // Get all entries for given worker and date
        const entries = await db.Clock_entry.findAll({
            where: {
                worker_id: worker.id,
                date: {
                    [Op.between]: [startOfDay, endOfDay]
                },
                clock_out_time: { [Op.not]: null },
                break_time: { [Op.not]: null }
            }
        });

        let totalBreakSeconds = 0;

        for (const entry of entries) {
            const breakSeconds = parseBreakTimeToSeconds(entry.break_time);
            if (breakSeconds > 300) {
                totalBreakSeconds += breakSeconds;
            }
        }

        if (totalBreakSeconds > 0) {
            const formattedBreakTime = formatSecondsToHHMMSS(totalBreakSeconds);

            await db.Clock_entry.update(
                { break_time: formattedBreakTime },
                { where: { worker_id: worker.id, date } }
            );

            return res.status(200).json({
                status: 1,
                message: `break time updated successfully`,
                break_time: formattedBreakTime
            });
        } else {
            return res.status(200).json({
                status: 1,
                message: "No break time over 5 minutes found"
            });
        }

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};


exports.absencesScreenCount = async (req, res) => {
    try {
        const { month, year } = req.query;
        const currentDate = moment.utc();


        const startOfMonth = moment.utc().startOf('month').toDate();
        const endOfMonth = moment.utc().endOf('month').toDate();

        const user = await db.User.findOne({
            where: { id: req.user.id },
            attributes: ['id', 'company_id', 'vacation_days', 'employment_date'],
        });

        if (!user) {
            return res.status(404).json({ status: 0, message: 'User not found' });
        }

        const entries = await db.Clock_entry.findAll({
            where: {
                worker_id: req.user.id,
                status: "approved",
                date: {
                    [Op.between]: [startOfMonth, endOfMonth]
                },
                duration: { [Op.ne]: null }
            },
            attributes: ['duration']
        });

        let totalSeconds = 0;
        entries.forEach(entry => {
            const [hh, mm, ss] = entry.duration.split(':').map(Number);
            totalSeconds += (hh * 3600) + (mm * 60) + ss;
        });

        const company = await db.Company.findOne({
            where: { id: user.company_id },
            include: [{
                model: db.Branch,
                as: 'industry',
                attributes: ['monthly_hours', 'yearly_hours'],
                required: false
            }]
        });

        const totalMonthlyHours = company?.industry?.monthly_hours || 0;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const totalRoundedHours = hours + (minutes >= 60 ? 1 : 0);  // avoid overcounting
        const overTime = totalRoundedHours > totalMonthlyHours
            ? totalMonthlyHours - totalRoundedHours
            : 0;
        const Compensation = totalRoundedHours > totalMonthlyHours
            ? totalRoundedHours - totalMonthlyHours
            : 0;


        const usedRequests = await db.absence_request.findAll({
            where: {
                worker_id: req.user.id,
                request_status: 'accepted',
                createdAt: {
                    [Op.between]: [startOfMonth, endOfMonth]
                }
                // end_date: { [Op.lte]: moment().format('YYYY-MM-DD') },
            },
            include: [
                {
                    model: db.Absences,
                    as: 'absence',
                    where: { absence_type: 'vacation' },
                    // required: false
                },
            ]
        });


        let usedDays = 0;
        usedRequests.forEach(request => {
            const startDate = moment(request.start_date);
            const endDate = request.type === 0 || !request.end_date
                ? startDate
                : moment(request.end_date);

            let tempDate = moment(startDate);

            while (tempDate.isSameOrBefore(endDate)) {
                const dayOfWeek = tempDate.isoWeekday(); // 1 (Monday) to 7 (Sunday)
                if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                    usedDays++;
                }
                tempDate.add(1, 'day');
            }
        });

        // Planned vacation days (future)
        const plannedRequests = await db.absence_request.findAll({
            where: {
                worker_id: req.user.id,
                request_status: 'pending',
                // start_date: { [Op.gt]: moment().format('YYYY-MM-DD') },
            },
            include: [
                {
                    model: db.Absences,
                    as: 'absence',
                    where: { absence_type: 'vacation' },
                    // required: false
                },
            ]
        });
        // console.log('plannedRequests', plannedRequests)
        // let plannedDays = 0;
        // plannedRequests.forEach(request => {
        //     const startDate = moment(request.start_date);
        //     const endDate = request.type === 0 || !request.end_date10
        //         ? startDate
        //         : moment(request.end_date);

        //     const diffDays = endDate.diff(startDate, 'days') + 1;
        //     plannedDays += diffDays;
        // });
        // const remainingDays = parseInt(user.vacation_days) - usedDays - plannedDays;
        let plannedDays = 0;
        plannedRequests.forEach(request => {
            const startDate = moment(request.start_date);
            const endDate = request.type === 0 || !request.end_date
                ? startDate
                : moment(request.end_date);

            let tempDate = moment(startDate);

            while (tempDate.isSameOrBefore(endDate)) {
                const dayOfWeek = tempDate.isoWeekday(); // 1 = Monday, 7 = Sunday
                if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                    plannedDays++;
                }
                tempDate.add(1, 'day');
            }
        });
        const remainingDays = parseInt(user.vacation_days) - usedDays - plannedDays;


        const today = moment(); // Or use moment() in production
        const startMonth = moment(today).startOf('month');
        const endOfRange = moment(today); // Only up to current date

        // 1. Count working days (Mon–Fri) from start of month to today
        let totalWorkingDays = 0;
        let dayCursor = moment(startMonth);
        while (dayCursor.isSameOrBefore(endOfRange, 'day')) {
            const dayOfWeek = dayCursor.isoWeekday(); // 1 (Mon) - 7 (Sun)
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                totalWorkingDays++;
            }
            dayCursor.add(1, 'day');
        }

        // present day count
        const clockentries = await db.Clock_entry.findAll({
            where: {
                worker_id: req.user.id,
                status: "approved",
                date: {
                    [Op.between]: [startMonth.format('YYYY-MM-DD'), endOfRange.format('YYYY-MM-DD')]
                },
                duration: {
                    [Op.ne]: null
                }
            },
            attributes: ['date'] // Only need date to count unique days
        });
        const presentDates = new Set();
        clockentries.forEach(entry => {
            presentDates.add(moment(entry.date).format('YYYY-MM-DD'));
        });
        // -----------------------------------------

        // 2. Fetch accepted absences in current month (only up to today)
        const absences = await db.absence_request.findAll({
            where: {
                worker_id: req.user.id,
                request_status: 'accepted',
                updatedAt: {
                    [Op.between]: [startOfMonth, endOfMonth]
                }
            }
        });

        // 3. Identify absent weekdays (Mon–Fri only)
        const absentDates = new Set();
        absences.forEach(abs => {
            const startDate = moment(abs.start_date);
            const endDate = abs.type === 0 || !abs.end_date
                ? startDate
                : moment(abs.end_date);

            let current = moment(startDate);
            while (current.isSameOrBefore(endDate, 'day') && current.isSameOrBefore(endOfRange, 'day')) {
                const dayOfWeek = current.isoWeekday();
                if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                    absentDates.add(current.format('YYYY-MM-DD'));
                }
                current.add(1, 'day');
            }
        });


        let totalAbsenceDays = 0;
        for (const absence of absences) {
            if (absence.type === 0 && absence.start_date) {
                const day = moment(absence.start_date).isoWeekday();
                if (day >= 1 && day <= 5) {
                    totalAbsenceDays += 1;
                }
            } else if (absence.type === 1 && absence.start_date && absence.end_date) {
                const start = moment(absence.start_date).startOf('day');
                const end = moment(absence.end_date).startOf('day');

                let current = moment(start);
                while (current.isSameOrBefore(end, 'day') && current.isSameOrBefore(endOfMonth, 'day')) {
                    const dayOfWeek = current.isoWeekday();
                    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                        totalAbsenceDays += 1;
                    }
                    current.add(1, 'day');
                }
            }
        }


        // const totalAbsentDays = absentDates.size; absences
        const totalPresentDays = presentDates.size;
        const attendancePercentage = totalWorkingDays === 0 ? '0.00' :
            ((totalPresentDays / totalWorkingDays) * 100).toFixed(2);


        return res.status(200).json({
            status: 1,
            message: "Absences Screen count fetched successfully",
            work_summary: {
                planed_hours: parseInt(totalMonthlyHours),
                worked_hour: totalRoundedHours,
                balance: overTime,
                compensation: Compensation,
                vacation_token: user.vacation_days,
                vacation_remaining: remainingDays,
                percentage: parseFloat(attendancePercentage),
                total_present_days: totalPresentDays,
                total_absent_days: totalAbsenceDays,
            }
        });

    } catch (error) {
        console.error('homeScreenCount Error:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};
