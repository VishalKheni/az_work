require('dotenv').config()
const db = require("../../config/db");
const bcrypt = require('bcrypt')
const moment = require('moment');
const { validateMobile, } = require('../../helpers/twilio');
const { sendEmailToWorker } = require("../../helpers/email");
const { validateFiles } = require('../../helpers/fileValidation');
const { Op, where, Sequelize, col, fn, literal } = require("sequelize");
const path = require('path');
const fs = require('fs');


function parseTimeToSeconds(timeStr) {
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
}

function formatSecondsToHHMMSS(totalSeconds) {
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

async function calculateBreakTimeForWorker(date, worker_id) {
    console.log("calculateBreakTimeForWorker");

    const targetDate = date;
    try {
        const entries = await db.Clock_entry.findAll({
            where: {
                date: targetDate,
                worker_id,
                clock_in_time: { [Op.not]: null },
                clock_out_time: { [Op.not]: null },
            },
            order: [['worker_id', 'ASC'], ['clock_in_time', 'ASC']],
        });

        const groupedEntries = {};

        // Group entries by worker_id
        for (const entry of entries) {
            const wid = entry.worker_id;
            if (!groupedEntries[wid]) groupedEntries[wid] = [];
            groupedEntries[wid].push(entry);
        }

        // For each worker group calculate break time and update entries
        for (const wid in groupedEntries) {
            const logs = groupedEntries[wid];
            let totalBreakSeconds = 0;

            for (let i = 0; i < logs.length - 1; i++) {
                const currentOut = moment(logs[i].clock_out_time);
                const nextIn = moment(logs[i + 1].clock_in_time);

                const breakSeconds = nextIn.diff(currentOut, 'seconds');
                if (breakSeconds >= 300) { // Only count breaks longer or equal to 5 minutes
                    totalBreakSeconds += breakSeconds;
                }
            }

            const formattedTotalBreak = formatSecondsToHHMMSS(totalBreakSeconds);

            // Update all entries of this worker on the target date with total break time
            await db.Clock_entry.update(
                { break_time: formattedTotalBreak },
                {
                    where: {
                        worker_id: wid,
                        date: targetDate,
                    }
                }
            );
        }

    } catch (error) {
        console.error('Cron job error:', error);
    }
}

exports.addWorker = async (req, res) => {
    try {
        const { job_title_id, iso_code, phone_number, country_code, password, vacation_days, experience } = req.body;
        const { profile_image, documents } = req.files;

        const company = await db.Company.findOne({ where: { owner_id: req.user.id } });
        if (!company) {
            return res.status(400).json({ status: 0, message: 'Company Not Found' });
        }
        if (req.user?.is_company_active === "Deactive") {
            return res.status(400).json({
                status: 0,
                message: "Your account has been Deactive by the admin.",
            });
        }
        const existingWorker = await db.User.findOne({ where: { email: req.body.email, company_id: company.id, user_role: "worker" } });
        const otherWorker = await db.User.findOne({
            where: {
                email: req.body.email,
                user_role: {
                    [Op.or]: ["company", "admin"]
                }
            }
        });
        if (existingWorker || otherWorker) {
            return res.status(400).json({ status: 0, message: 'Email already exists' });
        }

        const job_title = await db.Job_title.findByPk(job_title_id)
        if (!job_title) {
            return res.status(400).json({ status: 0, message: 'Job title Not Found' });
        }

        if (iso_code !== undefined && phone_number) {
            let valid = await validateMobile(iso_code, phone_number)
            if (valid.status == 0) {
                return res.status(400).json({ message: valid.message });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const worker = await db.User.create({
            ...req.body,
            user_role: "worker",
            country_code: `+$${country_code}`,
            experience: parseFloat(experience),
            company_id: company.id,
            job_title_id: job_title.id,
            password: hashedPassword,
            profile_image: `profile_images/${profile_image[0].filename}`,
            vacation_days: parseInt(vacation_days),
            country_code: `+${country_code}`,
            is_email_verified: true,
            is_worker_active: "Active",
        })
        let documentsData;
        if (documents && documents.length > 0) {
            documentsData = documents.map(doc => ({
                worker_id: worker.id,
                document_url: `documents/${doc.filename}`,
                title: path.parse(doc.originalname).name,
                date: moment().toDate()
            }));
            await db.Document.bulkCreate(documentsData);
        }

        const emailData = {
            email: worker.email,
            password: password,
            company_name: company.company_name,
            text: "your account has been successfully created"
        }
        await sendEmailToWorker(emailData);
        return res.status(200).json({
            status: 1,
            message: "Worker detail add Successfully",
            worker,
            documentsData
        });

    } catch (error) {
        console.error('Error while add worker detail:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}

exports.editWorkerProfile = async (req, res) => {
    try {
        const { worker_id, job_title_id, firstname, lastname, phone_number, country_code, iso_code, address, insurance_number, employment_date, password, vacation_days, experience } = req.body;

        if (req.user?.is_company_active === "Deactive") {
            return res.status(400).json({
                status: 0,
                message: "Your account has been Deactive by the admin.",
            });
        }
        const company = await db.Company.findOne({ where: { owner_id: req.user.id } });
        if (!company) {
            return res.status(400).json({ status: 0, message: 'Company Not Found' });
        }

        const worker = await db.User.findByPk(worker_id, {
            attributes: ['id', 'firstname', 'lastname', 'profile_image', 'phone_number', 'country_code', 'iso_code', 'address', 'job_title_id', 'insurance_number', 'password', 'employment_date'],
        });

        if (!worker) return res.status(404).json({ status: 0, message: "Worker not found" });

        if (req.files && req.files.profile_image) {
            const { profile_image } = req.files;
            if (worker.profile_image) {
                fs.unlinkSync(`public/${worker.profile_image}`);
            }
            await worker.update({ profile_image: `profile_images/${profile_image[0].filename}` });
        }
        if (password) {
            const isSamePassword = await bcrypt.compare(password, worker.password);
            if (isSamePassword) {
                return res.status(400).json({
                    status: 0,
                    message: "New password cannot be the same as the current password"
                });
            }
            var hashedPassword = await bcrypt.hash(password, 10);
            await db.User.update(
                { password: hashedPassword },
                { where: { id: worker.id } }
            );
            await db.Token.destroy({ where: { user_id: worker.id } })
            const emailData = {
                email: worker.email,
                password: password,
                company_name: company.company_name,
                text: "your password has been updated"
            }
            await sendEmailToWorker(emailData);
        }
        const updatedData = {
            firstname: firstname || worker.firstname,
            lastname: lastname || worker.lastname,
            phone_number: phone_number || worker.phone_number,
            country_code: `+${country_code}` || worker.country_code,
            iso_code: iso_code || worker.iso_code,
            address: address || worker.address,
            job_title_id: parseInt(job_title_id) || worker.job_title_id,
            insurance_number: insurance_number || worker.insurance_number,
            employment_date: employment_date || worker.employment_date,
            vacation_days: parseInt(vacation_days) || worker.vacation_days,
            experience: parseFloat(experience) || worker.experience
        }

        await worker.update(updatedData);
        return res.status(200).json({
            status: 1,
            message: "Worker profile update successfully",
            data: worker
        });

    } catch (error) {
        console.error('Error while add worker detail:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}

exports.getWorkerList = async (req, res) => {
    try {
        let { page, limit, search, status, filter } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;

        const company = await db.Company.findOne({ where: { owner_id: req.user.id } });

        if (!company) {
            return res.status(400).json({ status: 0, message: 'Company Not Found' });
        }

        let whereCondition = {};

        if (search) {
            whereCondition[Op.or] = [
                { firstname: { [Op.like]: `%${search}%` } },
                { lastname: { [Op.like]: `%${search}%` } },
                literal(`CONCAT(firstname, ' ', lastname) LIKE '%${search}%'`),
                // { '$job_category.category_name$': { [Op.like]: `%${search}%` } },
                { '$job_title.job_title$': { [Op.like]: `%${search}%` } }
            ];
        }

        if (status === 'active') {
            whereCondition.is_worker_active = 'Active';
        } else if (status === 'inactive') {
            whereCondition.is_worker_active = 'Deactive';
        }

        let order;
        if (filter === 'id_ASC') {
            order = [['id', 'ASC']];
        } else if (filter === 'id_DESC') {
            order = [['id', 'DESC']];
        } else if (filter === 'worker_name_ASC') {
            order = [[literal("CONCAT(firstname, ' ', lastname)"), 'ASC']];
        } else if (filter === 'worker_name_DESC') {
            order = [[literal("CONCAT(firstname, ' ', lastname)"), 'DESC']];
        } else if (filter === 'employment_date_ASC') {
            order = [['employment_date', 'ASC']];
        } else if (filter === 'employment_date_DESC') {
            order = [['employment_date', 'DESC']];
        } else if (filter === 'category_DESC') {
            order = [[literal('`job_category`.`category_name`'), 'DESC']];
        } else if (filter === 'category_ASC') {
            order = [[literal('`job_category`.`category_name`'), 'ASC']];
        } else if (filter === 'title_DESC') {
            order = [[literal('`job_title`.`job_title`'), 'DESC']];
        } else if (filter === 'title_ASC') {
            order = [[literal('`job_title`.`job_title`'), 'ASC']];
        } else if (filter === 'experience_ASC') {
            order = [['experience', 'ASC']];
        } else if (filter === 'experience_DESC') {
            order = [['experience', 'DESC']];
        }

        const { count, rows: worker } = await db.User.findAndCountAll({
            where: { ...whereCondition, user_role: "worker", company_id: company.id },
            attributes: { exclude: ['otp', 'otp_created_at', 'is_email_verified', 'login_type', 'is_company_add', 'is_account_created', 'is_password_add', 'password', 'is_company_active', 'is_company_blocked'] },
            include: [
                {
                    model: db.Job_title,
                    as: 'job_title',
                    attributes: ['id', 'job_title'],
                },
            ],
            distinct: true,
            subQuery: false,
            limit,
            offset,
            order
        })

        return res.status(200).json({
            status: 1,
            message: "Worker List fetched Successfully",
            pagination: {
                totalWorker: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                limit: limit,
            },
            data: worker
        });

    } catch (error) {
        console.error('Error while add worker detail:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}

exports.getWorkerDetail = async (req, res) => {
    try {
        const { worker_id } = req.query;

        const worker = await db.User.findByPk(worker_id, {
            attributes: { exclude: ['otp', 'otp_created_at', 'is_email_verified', 'login_type', 'is_company_add', 'is_account_created', 'is_password_add', 'is_company_active', 'is_company_blocked'] },
            include: [
                {
                    model: db.Job_title,
                    as: 'job_title'
                },
            ]
        })

        if (!worker) return res.status(404).json({ status: 0, message: "Worker not found" })

        return res.status(200).json({
            status: 1,
            message: "worker detail fetched Successfully",
            data: worker
        });

    } catch (error) {
        console.error('Error while add worker detail:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.getWorkerDocumentList = async (req, res) => {
    try {
        let { page, limit, search, filter, worker_id } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;

        const worker = await db.User.findOne({ where: { id: worker_id, user_role: "worker" } });
        if (!worker) return res.status(404).json({ status: 0, message: "Worker not found" });

        let whereCondition = {
            worker_id: worker.id,
            project_id: null,
            clock_entry_id: null
        };

        if (search) {
            whereCondition[Op.or] = [
                { title: { [Op.like]: `%${search}%` } },
            ];
        }

        let order;
        if (filter === 'id_ASC') {
            order = [['id', 'ASC']];
        } else if (filter === 'id_DESC') {
            order = [['id', 'DESC']];
        } else if (filter === 'title_ASC') {
            order = [['title', 'ASC']];
        } else if (filter === 'title_DESC') {
            order = [['title', 'DESC']];
        } else if (filter === 'date_ASC') {
            order = [['date', 'ASC']];
        } else if (filter === 'date_DESC') {
            order = [['date', 'DESC']];
        }

        const { count, rows: document } = await db.Document.findAndCountAll({
            where: { ...whereCondition },
            attributes: { exclude: ['type'] },
            distinct: true,
            limit,
            offset,
            order
        });

        return res.status(200).json({
            status: 1,
            message: "Worker document list fetched Successfully",
            pagination: {
                totalDocument: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                limit: limit,
            },
            data: document
        });
    } catch (error) {
        console.error('Error while add worker detail:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}


exports.deleteWorker = async (req, res) => {
    try {
        const { worker_id } = req.query;

        if (req.user?.is_company_active === "Deactive") {
            return res.status(400).json({
                status: 0,
                message: "Your account has been Deactive by the admin.",
            });
        }

        const worker = await db.User.findByPk(worker_id);
        if (!worker) return res.status(400).json({ status: 0, message: 'Worker not found' });
        const workerDocuments = await db.Document.findAll({ where: { worker_id: worker.id } });

        if (worker.profile_image) {
            fs.unlinkSync(`public/${worker.profile_image}`);
        }
        for (const doc of workerDocuments) {
            fs.unlinkSync(`public/${doc.document_url}`);
        }

        await worker.destroy();
        return res.status(200).json({
            status: 1,
            message: "worker deleted Successfully",
        });

    } catch (error) {
        console.error('Error while add worker detail:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}

exports.workerJobCategoryList = async (req, res) => {
    try {
        const company = await db.Company.findOne({ where: { owner_id: req.user.id } });
        if (!company) return res.status(400).json({ status: 0, message: 'Company Not Found' });


        const job_category = await db.Job_category.findAll({
            where: { company_id: company.id },
        })
        return res.status(200).json({
            status: 1,
            message: 'Job category List fetched successfully',
            data: job_category,
        });
    } catch (error) {
        console.error('Error while fetching Job Category list:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.workerJobTitleList = async (req, res) => {
    try {
        const company = await db.Company.findOne({ where: { owner_id: req.user.id } });
        if (!company) return res.status(400).json({ status: 0, message: 'Company Not Found' });

        const titles = await db.Job_title.findAll({
            where: { company_id: company.id }
        });

        return res.status(200).json({
            status: 1,
            message: "Job Title List fetched successfully",
            data: titles
        });
    } catch (error) {
        console.error('Error while fetching Job Title List:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}

exports.addWorkerDocuments = async (req, res) => {
    try {
        const { worker_id, title } = req.body;
        const { documents } = req.files;

        if (req.user?.is_company_active === "Deactive") {
            return res.status(400).json({
                status: 0,
                message: "Your account has been Deactive by the admin.",
            });
        }

        const worker = await db.User.findByPk(worker_id);
        if (!worker) return res.status(400).json({ status: 0, message: 'Worker Not Found' });

        let documentsData = [];

        if (documents && documents.length > 0) {
            for (const doc of documents) {
                documentsData.push({
                    worker_id: worker.id,
                    document_url: `documents/${doc.filename}`,
                    title: title,
                    date: moment().toDate()
                });
            }
            await db.Document.bulkCreate(documentsData);
        }

        return res.status(201).json({
            status: 1,
            message: "Worker document added successfully",
            documents: documentsData
        });
    } catch (error) {
        console.error('Error while create project:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.deleteDocument = async (req, res) => {
    try {
        const { document_id } = req.query;
        if (req.user?.is_company_active === "Deactive") {
            return res.status(400).json({
                status: 0,
                message: "Your account has been Deactive by the admin.",
            });
        }

        const document = await db.Document.findByPk(document_id);
        if (!document) return res.status(400).json({ status: 0, message: 'Document Not Found' });
        if (document.document_url) { fs.unlinkSync(`public/${document.document_url}`); }
        await document.destroy();
        return res.status(200).json({
            status: 1,
            message: "Document deleted successfully",
        });
    } catch (error) {
        console.error('Error while delete document:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.workerActiveDeactive = async (req, res) => {
    try {
        const { worker_id } = req.body;

        if (req.user?.is_company_active === "Deactive") {
            return res.status(400).json({
                status: 0,
                message: "Your account has been Deactive by the admin.",
            });
        }

        const worker = await db.User.findOne({ where: { id: worker_id, user_role: "worker" } });
        if (!worker) return res.status(404).json({ status: 0, message: 'Worker not found' });

        const active = worker.is_worker_active === 'Active' ? 'Deactive' : 'Active';
        await worker.update({ is_worker_active: active });
        if (active === "Deactive") {
            await db.Token.destroy({ where: { user_id: worker.id } });
            const entriesToDelete = await db.Clock_entry.findAll({
                where: {
                    worker_id: worker_id,
                    clock_out_time: null,
                    duration: null
                }
            });
            if (entriesToDelete.length > 0) {
                await db.Clock_entry.destroy({
                    where: {
                        worker_id: worker_id,
                        clock_out_time: null,
                        duration: null
                    },
                });
            }

        }
        return res.status(200).json({
            status: 1,
            message: worker.is_worker_active === 'Active' ? 'Worker activated successfully' : 'Worker deactivated successfully',
            is_worker_active: worker.is_worker_active
        });

    } catch (error) {
        console.error('Error while ActiveDeactive worker:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}


exports.getWorkerMonthlyHours = async (req, res) => {
    try {
        const { worker_id, year } = req.query;

        // Get worker details with company and branch info
        const worker = await db.User.findOne({
            where: { id: worker_id, user_role: "worker" },
            include: [{
                model: db.Company,
                as: 'company',
                include: [{
                    model: db.Branch,
                    as: 'industry'
                }]
            }]
        });

        if (!worker) {
            return res.status(404).json({ message: "Worker not found." });
        }

        // const branchMonthlyHours = parseFloat(worker.company?.industry?.monthly_hours || 0);
        const branchMonthlyHours = parseFloat(worker.company?.monthly_hours || 0);
        const results = [];
        const now = moment.utc();
        const currentYear = now.year();
        const currentMonth = now.month();
        const requestedYear = parseInt(year);
        var totalHour = 0;
        var overtime = 0;
        for (let month = 0; month < 12; month++) {
            const startOfMonth = moment.utc({ year, month, day: 1 }).startOf('month').toDate();
            const endOfMonth = moment.utc({ year, month, day: 1 }).endOf('month').toDate();
            // console.log('startOfMonth', startOfMonth)
            // console.log('endOfMonth', endOfMonth)

            if (requestedYear < currentYear || (requestedYear === currentYear && month <= currentMonth - 1)) {
                var workedEntries = await db.Clock_entry.findAll({
                    where: {
                        worker_id: worker_id,
                        date: { [Op.between]: [startOfMonth, endOfMonth] },
                        status: "approved"
                    },
                    attributes: ['duration'],
                    raw: true,
                });
                // console.log('workedEntries', workedEntries)

                // Manually parse and sum all durations
                if (workedEntries.length > 0) {
                    let totalSeconds = 0;
                    for (const entry of workedEntries) {
                        if (entry.duration) {
                            const [h = 0, m = 0, s = 0] = entry.duration.split(':').map(Number);
                            totalSeconds += (h * 3600) + (m * 60) + s;
                        }
                    }

                    totalWorkingHours = (totalSeconds / 3600).toFixed(2);
                    overtime = totalWorkingHours > branchMonthlyHours ? Math.floor(totalWorkingHours - branchMonthlyHours) : 0;
                    totalHour = parseInt(branchMonthlyHours) + overtime;
                }
            } else {
                // For current and future months, set total_hour and over_time to 0
                totalHour = 0;
                overtime = 0;
            }


            results.push({
                month: moment().month(month).format("MMMM"),
                monthly_hour: parseInt(branchMonthlyHours),
                // work_hour: parseInt(totalWorkingHours),
                total_hour: totalHour,
                over_time: overtime,
                // total_hour: workedEntries.length === 0 ? 0 : totalHour,
                // over_time: workedEntries.length === 0 ? 0 : overtime,
            });
        }
        // console.log('totalWorkingHours', totalWorkingHours)

        return res.status(200).json({
            status: 1,
            message: "Working Hours fetched successfully",
            working_hours: results
        });

    } catch (error) {
        console.error("error while fetching worker monthly hours", error);
        return res.status(500).json({ status: 0, message: "Internal server error" });
    }
};

exports.getWorkerTimeTable = async (req, res) => {
    try {
        let { worker_id, page, limit, month, year, search } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;

        const company = await db.Company.findOne({ where: { owner_id: req.user.id } });
        if (!company) {
            return res.status(400).json({ status: 0, message: 'Company Not Found' });
        }

        const whereCondition = {
            worker_id,
            clock_out_time: { [Op.ne]: null },
            [db.Sequelize.Op.and]: [
                db.sequelize.where(db.sequelize.fn('MONTH', db.sequelize.col('date')), month),
                db.sequelize.where(db.sequelize.fn('YEAR', db.sequelize.col('date')), year)
            ]
        };

        if (search) {
            whereCondition[Op.or] = [
                {
                    '$project.project_name$': {
                        [Op.like]: `%${search}%`
                    }
                }
            ];
        }
        // console.log('whereCondition', whereCondition)

        const { count, rows: clockEntries } = await db.Clock_entry.findAndCountAll({
            where: { ...whereCondition },
            include: [
                {
                    model: db.Project,
                    as: 'project',
                    attributes: ['id', 'project_name'],
                    required: false
                }
            ],
            subQuery: false,
            limit,
            offset,
            order: [['id', 'DESC']]
        });

        const allClockEntries = await db.Clock_entry.findAll({
            where: { ...whereCondition },
            attributes: ['duration'],
            include: [
                {
                    model: db.Project,
                    as: 'project',
                    attributes: ['id', 'project_name'],
                    required: false
                }
            ],
        });

        let allSeconds = 0;
        for (const entry of allClockEntries) {
            if (entry.duration) {
                allSeconds += parseTimeToSeconds(entry.duration);
            }
        }

        // Duration for current page only
        let currentPageSeconds = 0;
        for (const entry of clockEntries) {
            if (entry.duration) {
                currentPageSeconds += parseTimeToSeconds(entry.duration);
            }
        }

        return res.status(200).json({
            status: 1,
            message: "Time table fetched successfully",
            pagination: {
                totalClockEntries: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                limit: limit,
            },
            all_pages_total: formatSecondsToHHMMSS(allSeconds),
            current_page_total: formatSecondsToHHMMSS(currentPageSeconds),
            data: clockEntries
        });

    } catch (error) {
        console.error('Error while fetching worker time table:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.getTimetableDetail = async (req, res) => {
    try {
        let { clock_entry_id } = req.query;

        const clockEntries = await db.Clock_entry.findByPk(clock_entry_id, {
            include: [
                {
                    model: db.User,
                    as: 'worker',
                    attributes: ['id', 'firstname', 'lastname', 'profile_image'],
                    include: [
                        {
                            model: db.Job_title,
                            as: 'job_title',
                            attributes: ['id', 'job_title'],
                            required: false
                        }
                    ]
                },
                {
                    model: db.Project,
                    as: 'project',
                    attributes: ['id', 'project_name'],
                    required: false
                },
            ]
        })

        if (!clockEntries) return res.status(404).json({ status: 0, message: "Clock Entries not found" })
        return res.status(200).json({
            status: 1,
            message: "Clock Entry detail fetched successfully",
            data: clockEntries
        });

    } catch (error) {
        console.error('Error while fetching worker time table:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.editTimetableStatus = async (req, res) => {
    try {
        let { clock_entry_id, status } = req.body;

        if (req.user?.is_company_active === "Deactive") {
            return res.status(400).json({
                status: 0,
                message: "Your account has been Deactive by the admin.",
            });
        }

        const clockEntries = await db.Clock_entry.findByPk(clock_entry_id)
        if (!clockEntries) return res.status(404).json({ status: 0, message: "Clock Entries not found" })

        if (status === 'approved') {
            clockEntries.status = 'approved';
            await clockEntries.save();
        }
        else if (status === 'rejected') {
            clockEntries.status = 'rejected';
            await clockEntries.save();
        }

        return res.status(200).json({
            status: 1,
            message: `Clock Entry ${status} successfully`,
            data: clockEntries
        });

    } catch (error) {
        console.error('Error while fetching worker time table:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.getTimeTableList = async (req, res) => {
    try {
        let { page, limit, search, month, year } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;
        month = parseInt(month) - 1;
        year = parseInt(year);
        const startOfMonth = moment.utc({ year, month, day: 1 }).startOf('month').toDate();
        const endOfMonth = moment.utc({ year, month, day: 1 }).endOf('month').toDate();

        const company = await db.Company.findOne({ where: { owner_id: req.user.id } });
        if (!company) {
            return res.status(400).json({ status: 0, message: 'Company Not Found' });
        }

        let whereCondition = {};

        if (search) {
            whereCondition[Op.or] = [
                { firstname: { [Op.like]: `%${search}%` } },
                { lastname: { [Op.like]: `%${search}%` } },
                where(fn('CONCAT', col('firstname'), ' ', col('lastname')), { [Op.like]: `%${search}%` })
            ];
        }

        const { count, rows: worker } = await db.User.findAndCountAll({
            where: { ...whereCondition, user_role: "worker", company_id: company.id },
            attributes: ['id', 'firstname', 'lastname', 'profile_image'],
            include: [
                {
                    model: db.absence_request,
                    as: 'absence_requests',
                    required: false,
                    where: {
                        request_status: "accepted",
                        [Op.or]: [
                            {
                                type: 0,
                                start_date: { [Op.between]: [startOfMonth, endOfMonth] }
                            },
                            {
                                type: 1,
                                [Op.or]: [
                                    {
                                        start_date: { [Op.between]: [startOfMonth, endOfMonth] }
                                    },
                                    {
                                        end_date: { [Op.between]: [startOfMonth, endOfMonth] }
                                    },
                                    {
                                        start_date: { [Op.lte]: startOfMonth },
                                        end_date: { [Op.gte]: endOfMonth }
                                    }
                                ]
                            }
                        ],
                    },
                    include: [
                        {
                            model: db.Absences,
                            as: 'absence',
                            attributes: ["id", "absence_type", "absence_logo", "status"],
                        }
                    ]
                },
            ],
            distinct: true,
            limit,
            offset,
            order: [['id', 'DESC']]
        })

        return res.status(200).json({
            status: 1,
            message: "Time table List fetched Successfully",
            pagination: {
                totalTimetable: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                limit: limit,
            },
            data: worker
        });

    } catch (error) {
        console.error('Error while add worker detail:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}

exports.editClockTime = async (req, res) => {
    const { worker_id, clock_entry_id, clock_in_time, clock_out_time } = req.body;

    try {
        const entry = await db.Clock_entry.findOne({ where: { id: clock_entry_id, worker_id: worker_id } });
        if (!entry) {
            return res.status(404).json({ status: 0, message: 'Clock entry not found' });
        }

        // Update times
        if (clock_in_time) {
            entry.clock_in_time = clock_in_time;
            await entry.save()
        }
        if (clock_out_time) {
            entry.clock_out_time = clock_out_time;
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
        const dateOnly = moment(entry.date).format('YYYY-MM-DD');
        await calculateBreakTimeForWorker(dateOnly, worker_id);
        const updatedentry = await db.Clock_entry.findOne({ where: { id: clock_entry_id, worker_id: worker_id } });
        return res.json({ status: 1, message: 'Clock entry updated successfully', data: updatedentry });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


// exports.editClockTime = async (req, res) => {
//     const { worker_id, clock_entry_id, clock_in_time, clock_out_time } = req.body;

//     try {
//         const entry = await db.Clock_entry.findOne({ where: { id: clock_entry_id, worker_id } });
//         if (!entry) {
//             return res.status(404).json({ status: 0, message: 'Clock entry not found' });
//         }

//         let isUpdated = false;

//         // Update clock in time if provided
//         if (clock_in_time && clock_in_time !== entry.clock_in_time) {
//             entry.clock_in_time = clock_in_time;
//             isUpdated = true;
//         }

//         // Update clock out time if provided
//         if (clock_out_time && clock_out_time !== entry.clock_out_time) {
//             entry.clock_out_time = clock_out_time;
//             isUpdated = true;
//         }

//         // If times changed, update duration
//         if (isUpdated && entry.clock_in_time && entry.clock_out_time) {
//             const start = moment(entry.clock_in_time);
//             const end = moment(entry.clock_out_time);
//             const duration = moment.utc(end.diff(start)).format('HH:mm:ss');
//             entry.duration = duration;
//         }
// console.log('isUpdated', isUpdated)
//         // Save only if any update happened
//         if (isUpdated) {
//             await entry.save();
//             const dateOnly = moment(entry.date).format('YYYY-MM-DD');
//             await calculateBreakTimeForWorker(dateOnly, worker_id);
//         }

//         return res.json({ status: 1, message: 'Clock entry updated successfully', data: entry });
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ message: 'Internal server error' });
//     }
// };
