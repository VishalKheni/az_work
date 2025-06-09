require('dotenv').config()
const db = require("../../config/db");
const { Op, where, Sequelize, col } = require("sequelize");



exports.addCompanyHoliday = async (req, res) => {
    try {
        let { holiday_name, date, day, type, holiday_ids } = req.body;
        const user_id = req.user.id;
        type = parseInt(type);

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


        if (type === 0) {
            // Custom holiday
            const existingHoliday = await db.Holiday.findOne({
                where: {
                    user_id,
                    company_id: company.id,
                    holiday_name,
                    date,
                },
            });

            if (existingHoliday) {
                return res.status(400).json({ status: 0, message: 'Holiday with the same name and date already exists' });
            }

            const holiday = await db.Holiday.create({
                user_id,
                holiday_name,
                company_id: company.id,
                date,
                day,
                is_holiday_checked: true
            });

            return res.status(201).json({ status: 1, message: 'Company Holiday added successfully', data: holiday });

        } else if (type === 1) {
            const holidaysToClone = await db.Holiday.findAll({
                where: {
                    id: holiday_ids,
                    created_by_admin: true
                },
            });

            if (holidaysToClone.length === 0) {
                return res.status(404).json({ status: 0, message: 'No holidays found with given IDs' });
            }

            const createdHolidays = [];
            const duplicateHolidays = [];

            for (const h of holidaysToClone) {
                // Check for duplicate
                const exists = await db.Holiday.findOne({
                    where: {
                        user_id,
                        company_id: company.id,
                        holiday_name: h.holiday_name,
                        date: h.date,
                    }
                });

                if (!exists) {
                    var newHoliday = await db.Holiday.create({
                        user_id,
                        holiday_name: h.holiday_name,
                        company_id: company.id,
                        date: h.date,
                        day: h.day,
                        is_holiday_checked: true,
                        admin_holiday_id: h.id
                    });
                    createdHolidays.push(newHoliday);
                } else {
                    duplicateHolidays.push(exists);
                }
            }
            const createdHolidayIds = createdHolidays.map(h => h.id);

            const resHoliday = await db.Holiday.findAll({
                where: {
                    id: createdHolidayIds,
                },
            });
            let message;
            if (createdHolidays.length === 0) {
                message = 'All selected holidays already exist.';
            } else if (duplicateHolidays.length === 0) {
                message = 'Admin holidays added successfully.';
            } else {
                message = `Admin holiday added successfully`;
            }


            return res.status(201).json({
                status: 1,
                message: message,
                data: resHoliday,
            });
        } else {
            return res.status(400).json({ status: 0, message: 'Invalid holiday type' });
        }

    } catch (error) {
        console.error('Error while adding holiday:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.getCompanyHolidaysList = async (req, res) => {
    try {
        let { page, limit, filter, type } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;
        type = parseInt(type)

        
        const company = await db.Company.findOne({ where: { owner_id: req.user.id } });
        if (!company) {
            return res.status(400).json({ status: 0, message: 'Company Not Found' });
        }

        let whereCondition = {};

        if (type === 0) {
            whereCondition[Op.or] = [
                { created_by_admin: true },
                { created_by_admin: false }
            ];
            whereCondition.company_id = company.id;
        } else if (type === 1) {
            whereCondition.created_by_admin = true;
        }


        var order;
        if (filter === 'id_ASC') {
            order = [['id', 'ASC']];
        } else if (filter === 'id_DESC') {
            order = [['id', 'DESC']];
        } else if (filter === 'holiday_name_ASC') {
            order = [['holiday_name', 'ASC']];
        } else if (filter === 'holiday_name_DESC') {
            order = [['holiday_name', 'DESC']];
        } else if (filter === 'date_ASC') {
            order = [['date', 'ASC']];
        } else if (filter === 'date_DESC') {
            order = [['date', 'DESC']];
        } else if (filter === 'day_ASC') {
            order = [['day', 'ASC']];
        } else if (filter === 'day_DESC') {
            order = [['day', 'DESC']];
        }

        if (type === 0) {
            var { count: holidaycount, rows: holidays } = await db.Holiday.findAndCountAll({
                where: { user_id: req.user.id },
                limit,
                offset,
                order,
            });
            return res.status(200).json({
                status: 1,
                message: "Company Holiday List fetched successfully",
                pagination: {
                    totalHoliday: holidaycount,
                    totalPages: Math.ceil(holidaycount / limit),
                    currentPage: page,
                    limit: limit,
                },
                data: holidays,
            });
        } else if (type === 1) {
            var { count: admincount, rows: adminholidays } = await db.Holiday.findAndCountAll({
                where: { created_by_admin: true },
                attributes: {
                    exclude: ['is_holiday_checked', 'user_id'],
                    include: [
                        [
                            db.sequelize.literal(`(
                              CASE WHEN EXISTS (
                                SELECT * FROM \`tbl_holidays\` AS \`user_holidays\`
                                WHERE \`user_holidays\`.\`admin_holiday_id\` = \`holiday_model\`.\`id\`
                                AND \`user_holidays\`.\`user_id\` = ${req.user.id}
                              ) THEN 1 ELSE 0 END
                            )`),
                            'is_holiday_checked'
                        ]
                    ]
                },
                limit,
                offset,
                order,
            });
            return res.status(200).json({
                status: 1,
                message: "Admin Holiday List fetched successfully",
                pagination: {
                    totalHoliday: admincount,
                    totalPages: Math.ceil(admincount / limit),
                    currentPage: page,
                    limit: limit,
                },
                data: adminholidays,
            });
        }

    } catch (error) {
        console.error('Error while fetching holidays:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.editCompanyHoliday = async (req, res) => {
    try {
        const { holiday_id, holiday_name, date, day } = req.body;
        if (req.user?.is_company_active === "Deactive") {
            return res.status(400).json({
                status: 0,
                message: "Your account has been Deactive by the admin.",
            });
        }

        const holiday = await db.Holiday.findByPk(holiday_id, { attributes: { exclude: ['company_id'] } });
        if (!holiday) return res.status(404).json({ status: 0, message: 'Company Holiday Not Found' });
        if (holiday.created_by_admin) return res.status(403).json({ status: 0, message: 'Cannot edit holiday created by admin' });

        const duplicate = await db.Holiday.findOne({
            where: {
                user_id: holiday.user_id,
                holiday_name, date,
                id: { [db.Sequelize.Op.ne]: holiday_id }, // exclude the current record
            }
        });

        if (duplicate) return res.status(400).json({ status: 0, message: 'Another holiday with the same name and date already exists' });

        await holiday.update({ holiday_name, date, day, });
        return res.status(200).json({ status: 1, message: 'Company Holiday updated successfully', data: holiday });
    } catch (error) {
        console.error('updating Company holiday:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.deleteCompanyHoliday = async (req, res) => {
    try {
        const { holiday_id } = req.query;
        if (req.user?.is_company_active === "Deactive") {
            return res.status(400).json({
                status: 0,
                message: "Your account has been Deactive by the admin.",
            });
        }

        const holiday = await db.Holiday.findByPk(holiday_id);
        if (!holiday) return res.status(404).json({ status: 0, message: 'Company Holiday Not Found' });
        if (holiday.created_by_admin) return res.status(403).json({ status: 0, message: 'Cannot delete holiday created by admin' });
        await holiday.destroy();
        return res.status(200).json({ status: 1, message: 'Company Holiday deleted successfully' });
    } catch (error) {
        console.error('deleting Company holiday:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.checkIsHoliday = async (req, res) => {
    try {
        const { holiday_id } = req.body;
        if (req.user?.is_company_active === "Deactive") {
            return res.status(400).json({
                status: 0,
                message: "Your account has been Deactive by the admin.",
            });
        }
        const holiday = await db.Holiday.findByPk(holiday_id);
        if (!holiday) return res.status(404).json({ status: 0, message: 'Company Holiday Not Found' });
        const check = holiday.is_holiday_checked == false ? true : false;
        await holiday.update({ is_holiday_checked: check });
        const message = check ? 'checked' : 'unchecked';
        return res.status(200).json({ status: 1, message: `Company Holiday ${message} successfully`, is_holiday_checked: check });
    } catch (error) {
        console.error('checked Company holiday:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};
