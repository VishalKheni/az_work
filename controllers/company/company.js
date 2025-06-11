require('dotenv').config()
const db = require("../../config/db");
const { validateMobile, } = require('../../helpers/twilio');
const { Op, where, Sequelize, col } = require("sequelize");
let fs = require('fs');
const moment = require('moment');


exports.branchList = async (req, res) => {
    try {
        const branch = await db.Branch.findAll();
        return res.status(200).json({
            status: 1,
            message: "branch List fetched Successfully",
            branch
        });
    } catch (error) {
        console.error('Error while signup:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }

}

exports.companyDetail = async (req, res) => {
    try {
        const company = await db.Company.findOne({
            where: { owner_id: req.user.id },
            include: [
                {
                    model: db.User,
                    as: 'owner',
                    attributes: ['id', 'firstname', 'lastname', 'email', 'country_code', 'iso_code', 'phone_number']
                },
                {
                    model: db.Branch,
                    as: 'industry',
                    attributes: ['id', 'branch_name', 'createdAt']
                }
            ]
        });

        if (!company) {
            return res.status(404).json({ status: 0, message: 'Company not found' });
        }

        return res.status(200).json({
            status: 1,
            message: "company detail fetched Successfully",
            company
        });
    } catch (error) {
        console.error('Error while signup:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}

exports.editCompany = async (req, res) => {
    try {
        const { company_id, industry_id, company_name, email, country_code, iso_code, phone_number, address, owner_phone_number, owner_country_code, owner_iso_code, owner_firstname, owner_lastname, weekly_hours, monthly_hours, yearly_hours, } = req.body;
        const company_logo = req.files?.company_logo;

        if (iso_code && phone_number) {
            let valid = await validateMobile(iso_code, phone_number)
            if (valid.status == 0) return res.status(400).json({ status: 0, message: valid.message });
        }
        if (owner_iso_code && owner_phone_number) {
            let valid = await validateMobile(owner_iso_code, owner_phone_number)
            if (valid.status == 0) return res.status(400).json({ status: 0, message: `Owner ${valid.message}` });
        }

        const company = await db.Company.findByPk(company_id);
        if (!company) return res.status(404).json({ status: 0, message: 'Company not found' });
        const owner = await db.User.findByPk(company.owner_id, { attributes: ['id', 'firstname', 'lastname', 'email', 'country_code', 'iso_code', 'phone_number', 'updatedAt'] });
        if (!owner) return res.status(400).json({ status: 0, message: 'Owner not found' });

        if (req.user?.is_company_active === "Deactive") {
            return res.status(400).json({
                status: 0,
                message: "Your account has been Deactive by the admin.",
            });
        }

        if (industry_id) {
            const branch = await db.Branch.findByPk(industry_id);
            if (!branch) return res.status(404).json({ status: 0, message: 'Industry not found' });
            await company.update({ industry_id: branch.id });
        }

        if (company_logo) {
            fs.unlinkSync(`public/${company.company_logo}`);
            await company.update({ company_logo: `company_logo/${company_logo[0].filename}` });
        }

        const companyUpdatedData = {
            company_name: company_name ?? company.company_name,
            country_code: country_code ? `+${country_code}` : company.country_code,
            iso_code: iso_code ?? company.iso_code,
            phone_number: phone_number ?? company.phone_number,
            address: address ?? company.address,
            weekly_hours: weekly_hours ?? company.weekly_hours,
            monthly_hours: monthly_hours ?? company.monthly_hours,
            yearly_hours: yearly_hours ?? company.yearly_hours,
        };
        await company.update(companyUpdatedData);

        const ownerUpdatedData = {
            firstname: owner_firstname ?? owner.firstname,
            lastname: owner_lastname ?? owner.lastname,
            email: email ?? owner.email,
            country_code: owner_country_code ? `+${owner_country_code}` : owner.country_code,
            iso_code: owner_iso_code ?? owner.iso_code,
            phone_number: owner_phone_number ?? owner.phone_number,
        };
        await owner.update(ownerUpdatedData);

        return res.status(200).json({
            status: 1,
            message: "Company detail update successfully",
            data: {
                company,
                owner
            }
        });
    } catch (error) {
        console.error('Error while edit company:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}


exports.getCompanyMonthlyHoursv1 = async (req, res) => {
    try {
        const { year } = req.query;

        const company = await db.Company.findOne({
            where: { owner_id: req.user.id },
            include: [
                {
                    model: db.Branch,
                    as: 'industry'
                },
                {
                    model: db.User,
                    as: 'worker',
                    attributes: ['id', 'company_id']
                }
            ]
        });
        if (!company) {
            return res.status(404).json({ message: "Company not found." });
        }

        const branchMonthlyHours = parseFloat(company?.monthly_hours || 0);
        const workerIds = company.worker.map(user => user.id); // extract all worker ids
        const results = [];
        const now = moment.utc();
        const currentYear = now.year();
        const currentMonth = now.month(); // 0-based (0 = January, 11 = December)
        const requestedYear = parseInt(year);

        for (let month = 0; month < 12; month++) {
            const startOfMonth = moment.utc({ year, month, day: 1 }).startOf('month').toDate();
            const endOfMonth = moment.utc({ year, month, day: 1 }).endOf('month').toDate();

            let totalWorkingHours = 0;
            let overtime = 0;
            let totalHour = parseInt(branchMonthlyHours);

            // Only calculate hours for months up to the previous month if the year is the current year
            if (requestedYear < currentYear || (requestedYear === currentYear && month <= currentMonth - 1)) {
                const workedEntries = await db.Clock_entry.findAll({
                    where: {
                        worker_id: { [Op.in]: workerIds },
                        date: { [Op.between]: [startOfMonth, endOfMonth] },
                        status: "approved"
                    },
                    attributes: ['duration'],
                    raw: true,
                });

                // Manually parse and sum all durations
                let totalSeconds = 0;
                for (const entry of workedEntries) {
                    if (entry.duration) {
                        const [h = 0, m = 0, s = 0] = entry.duration.split(':').map(Number);
                        totalSeconds += (h * 3600) + (m * 60) + s;
                    }
                }

                totalWorkingHours = (totalSeconds / 3600).toFixed(2);
                overtime = totalWorkingHours > branchMonthlyHours ? Math.round(totalWorkingHours - branchMonthlyHours) : 0;
                totalHour = parseInt(branchMonthlyHours) + overtime;
            } else {
                // For current and future months, set total_hour and over_time to 0
                totalHour = 0;
                overtime = 0;
            }

            results.push({
                month: moment().month(month).format("MMMM"),
                monthly_hour: parseInt(branchMonthlyHours),
                over_time: overtime,
                total_hour: totalHour
            });
        }

        return res.status(200).json({
            status: 1,
            message: "Company Working Hours fetched successfully",
            working_hours: results
        });

    } catch (error) {
        console.error("error Company Working Hours", error);
        return res.status(500).json({ status: 0, message: "Internal server error" });
    }
};

exports.getCompanyMonthlyHours = async (req, res) => {
    try {
        const { year } = req.query;

        const company = await db.Company.findOne({
            where: { owner_id: req.user.id },
            include: [
                {
                    model: db.Branch,
                    as: 'industry'
                },
                {
                    model: db.User,
                    as: 'worker',
                    attributes: ['id', 'company_id']
                }
            ]
        });
        if (!company) {
            return res.status(404).json({ message: "Company not found." });
        }

        const branchMonthlyHours = parseFloat(company?.monthly_hours || 0);
        const workerIds = company.worker.map(user => user.id); // extract all worker ids
        const results = [];
        const now = moment.utc();
        const currentYear = now.year();
        const currentMonth = now.month();
        const requestedYear = parseInt(year);

        for (let month = 0; month < 12; month++) {
            const startOfMonth = moment.utc({ year, month, day: 1 }).startOf('month').toDate();
            const endOfMonth = moment.utc({ year, month, day: 1 }).endOf('month').toDate();

            let totalWorkingHours = 0;
            let overtime = 0;
            let totalHour = 0; // Default to 0

            // Process all months for past years, and for the current year, process only up to the previous month
            if (requestedYear < currentYear || (requestedYear === currentYear && month <= currentMonth - 1)) {
                const workedEntries = await db.Clock_entry.findAll({
                    where: {
                        worker_id: { [Op.in]: workerIds },
                        date: { [Op.between]: [startOfMonth, endOfMonth] },
                        status: "approved"
                    },
                    attributes: ['duration'],
                    raw: true,
                });

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
                    totalHour = parseInt(totalWorkingHours); // Use actual worked hours
                }
            } else {
                totalHour = 0;
                overtime = 0;
            }

            results.push({
                month: moment().month(month).format("MMMM"),
                monthly_hour: parseInt(branchMonthlyHours),
                over_time: overtime,
                total_hour: totalHour
            });
        }

        return res.status(200).json({
            status: 1,
            message: "Company Working Hours fetched successfully",
            working_hours: results
        });

    } catch (error) {
        console.error("error Company Working Hours", error);
        return res.status(500).json({ status: 0, message: "Internal server error" });
    }
};

exports.getWeeklyHours = async (req, res) => {
    try {
        const { month, year } = req.query;
        const userMonth = parseInt(month);
        const adjustedMonth = userMonth - 1;

        const company = await db.Company.findOne({
            where: { owner_id: req.user.id },
            include: [
                { model: db.Branch, as: 'industry' },
                { model: db.User, as: 'worker', attributes: ['id'] }
            ]
        });
        if (!company) {
            return res.status(404).json({ status: 0, message: "Company not found." });
        }

        const weeklyLimit = parseFloat(company?.weekly_hours || 0);
        const workerIds = company.worker.map(user => user.id);

        const results = [];
        const startOfMonth = moment.utc({ year: parseInt(year), month: adjustedMonth }).startOf('month');
        const endOfMonth = moment.utc({ year: parseInt(year), month: adjustedMonth }).endOf('month');

        // Fetch all entries for the month once
        const allWorkedEntries = await db.Clock_entry.findAll({
            where: {
                worker_id: { [Op.in]: workerIds },
                status: "approved",
                date: {
                    [Op.between]: [startOfMonth.toDate(), endOfMonth.clone().endOf('day').toDate()],
                },
            },
            attributes: ['duration', 'date'],
            raw: true,
        });

        let currentWeekStart = startOfMonth.clone();
        let weekNumber = 1;

        while (currentWeekStart.isSameOrBefore(endOfMonth)) {
            let currentWeekEnd = currentWeekStart.clone().add(6, 'days');

            if (currentWeekEnd.isAfter(endOfMonth)) {
                currentWeekEnd = endOfMonth.clone().endOf('day');

                // If the remaining days are less than 4, merge with previous week
                if (endOfMonth.diff(currentWeekStart, 'days') < 4 && results.length > 0) {
                    const lastWeek = results[results.length - 1];
                    const workedEntries = allWorkedEntries.filter(entry => {
                        const entryDate = moment.utc(entry.date);
                        return entryDate.isBetween(currentWeekStart, currentWeekEnd, null, '[]');
                    });

                    let totalSeconds = 0;
                    for (const entry of workedEntries) {
                        if (entry.duration) {
                            const [h = 0, m = 0, s = 0] = entry.duration.split(':').map(Number);
                            totalSeconds += (h * 3600) + (m * 60) + s;
                        }
                    }

                    const totalWorkingHours = totalSeconds / 3600;
                    const newTotal = lastWeek.total_working_hours + totalWorkingHours;
                    lastWeek.total_working_hours = parseFloat(Math.round(newTotal.toFixed(2)));
                    lastWeek.over_time = newTotal > weeklyLimit ? Math.round(newTotal - weeklyLimit) : 0;
                    lastWeek.week_end = currentWeekEnd.format('YYYY-MM-DD');
                    break;
                }
            } else {
                currentWeekEnd = currentWeekEnd.clone().endOf('day');
            }

            const workedEntries = allWorkedEntries.filter(entry => {
                const entryDate = moment.utc(entry.date);
                return entryDate.isBetween(currentWeekStart, currentWeekEnd, null, '[]');
            });

            let totalSeconds = 0;
            for (const entry of workedEntries) {
                if (entry.duration) {
                    const [h = 0, m = 0, s = 0] = entry.duration.split(':').map(Number);
                    totalSeconds += (h * 3600) + (m * 60) + s;
                }
            }

            const totalWorkingHours = totalSeconds / 3600;
            const overtime = totalWorkingHours > weeklyLimit ? Math.round(totalWorkingHours - weeklyLimit) : 0;

            results.push({
                week: `Week ${weekNumber}`,
                // week_start: currentWeekStart.format('YYYY-MM-DD'),
                // week_end: currentWeekEnd.format('YYYY-MM-DD'),
                weekly_hour: parseInt(weeklyLimit),
                total_working_hours: parseFloat(Math.round(totalWorkingHours.toFixed(2))),
                over_time: overtime
            });

            weekNumber++;
            currentWeekStart = currentWeekEnd.clone().add(1, 'second').startOf('day');
        }

        return res.status(200).json({
            status: 1,
            message: "Weekly Working Hours fetched successfully",
            year: parseInt(year),
            month: moment().month(adjustedMonth).format('MMMM'),
            weekly_hours: results,
        });

    } catch (error) {
        console.error("Error in Company Weekly Working Hours:", error);
        return res.status(500).json({ status: 0, message: "Internal server error" });
    }
};

exports.dashboardCount = async (req, res) => {
    try {

        const company = await db.Company.findOne({
            where: { owner_id: req.user.id },
        });
        const totalWorkers = await db.User.count({
            where: {
                company_id: company.id,
                user_role: 'worker'
            }
        });

        const activeWorkers = await db.User.count({
            where: {
                company_id: company.id,
                is_worker_active: "Active",
                user_role: 'worker'
            }
        });
        const deactiveWorkers = await db.User.count({
            where: {
                company_id: company.id,
                is_worker_active: "Deactive",
                user_role: 'worker'
            }
        });

        const totalProject = await db.Project.count({
            where: { company_id: company.id, }
        });

        const runningProject = await db.Project.count({
            where: { company_id: company.id, status: "active" }
        });
        const completedProject = await db.Project.count({
            where: { company_id: company.id, status: "completed" }
        });
        const runningProjectList = await db.Project.findAll({
            where: { company_id: company.id, status: "active" },
            order: [['createdAt', 'DESC']],
        });

        return res.status(200).json({
            status: 1,
            message: "Dashboard count fetched successfully",
            data: {
                totalWorkers,
                activeWorkers,
                deactiveWorkers,
                totalProject,
                runningProject,
                completedProject,
                runningProjectList
            }
        });

    } catch (error) {
        console.error("error Company Weekly Working Hours", error);
        return res.status(500).json({ status: 0, message: "Internal server error" });
    }
};

exports.dashboardRequestList = async (req, res) => {
    try {
        let { page, limit, filter } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;

        const company = await db.Company.findOne({
            where: { owner_id: req.user.id },
        });

        const workers = await db.User.findAll({ where: { company_id: company.id, user_role: 'worker' } });
        const workerIds = workers.map(user => user.id);

        let order;
        if (filter === 'id_ASC') {
            order = [['id', 'ASC']];
        } else if (filter === 'id_DESC') {
            order = [['id', 'DESC']];
        } else if (filter === 'worker_name_ASC') {
            order = [[Sequelize.literal("CONCAT(`workers`.`firstname`, ' ', `workers`.`lastname`)"), 'ASC']];
        } else if (filter === 'worker_name_DESC') {
            order = [[Sequelize.literal("CONCAT(`workers`.`firstname`, ' ', `workers`.`lastname`)"), 'DESC']];
        } else if (filter === 'date_ASC') {
            order = [['start_date', 'ASC']];
        } else if (filter === 'date_DESC') {
            order = [['start_date', 'DESC']];
        } else if (filter === 'absence_type_ASC') {
            order = [[Sequelize.literal('`absence`.`absence_type`'), 'ASC']];
        } else if (filter === 'absence_type_DESC') {
            order = [[Sequelize.literal('`absence`.`absence_type`'), 'DESC']];
        } else if (filter === 'paid_ASC') {
            order = [[Sequelize.literal("CASE WHEN `absence`.`status` = 'paid' THEN 0 ELSE 1 END"), 'ASC']];
        } else if (filter === 'paid_DESC') {
            order = [[Sequelize.literal("CASE WHEN `absence`.`status` = 'paid' THEN 0 ELSE 1 END"), 'DESC']];
        } else if (filter === 'unpaid_ASC') {
            order = [[Sequelize.literal("CASE WHEN `absence`.`status` = 'unpaid' THEN 1 ELSE 0 END"), 'ASC']];
        } else if (filter === 'unpaid_DESC') {
            order = [[Sequelize.literal("CASE WHEN `absence`.`status` = 'unpaid' THEN 1 ELSE 0 END"), 'DESC']];
        }

        const { count, rows: requestList } = await db.absence_request.findAndCountAll({
            where: {
                request_status: "pending",
                worker_id: { [Op.in]: workerIds },
            },
            include: [
                {
                    model: db.Absences,
                    as: 'absence',
                    attributes: ['id', 'absence_type', 'absence_logo', 'status'],
                },
                {
                    model: db.User,
                    as: 'workers',
                    attributes: ['id', 'firstname', 'lastname'],
                }
            ],
            distinct: true,
            limit,
            offset,
            order
        });

        return res.status(200).json({
            status: 1,
            message: "Absences List fetched successfully",
            pagination: {
                totalAbsences: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                limit: limit,
            },
            data: requestList
        });

    } catch (error) {
        console.error('Error while fetching job category list:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};


exports.upcomingHolidayList = async (req, res) => {
    try {
        let { month, year } = req.query;
        const monthIndex = parseInt(month) - 1;


        const company = await db.Company.findOne({
            where: { owner_id: req.user.id },
        });

        if (!company) {
            return res.status(404).json({ status: 0, message: "Company not found" });
        }


        const startOfMonth = moment.utc({ year: parseInt(year), month: monthIndex, day: 1 }).startOf('month').toDate();
        const endOfMonth = moment.utc({ year: parseInt(year), month: monthIndex, day: 1 }).endOf('month').toDate();

        const holidays = await db.Holiday.findAll({
            where: {
                is_holiday_checked: true,
                [Op.and]: [
                    {
                        [Op.or]: [
                            { company_id: null },
                            { company_id: company.id },
                            { user_id: req.user.id }
                        ]
                    },
                ],
                date: {
                    [Op.between]: [startOfMonth, endOfMonth]
                }
            },
            distinct: true,
            order: [['id', 'DESC']],
        });

        const holidaysWithImages = holidays.map((holiday) => {
            return {
                ...holiday.toJSON(),
                image_url: "https://app.arbeitszeit.swiss:8800/company_logo/fi_5793801.png"
            };
        });

        return res.status(200).json({
            status: 1,
            message: "Upcoming Holidays fetched successfully",
            data: holidaysWithImages
        });
    } catch (error) {
        console.error('Error while fetching holidays:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

