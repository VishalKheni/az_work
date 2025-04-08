require('dotenv').config()
const db = require("../../config/db");


exports.addCompanyHoliday = async (req, res) => {
    try {
        const { holiday_name, date, day } = req.body;
        const user_id = req.user.id;

        const company = await db.Company.findOne({ where: { owner_id: req.user.id } });
        if (!company) return res.status(400).json({ status: 0, message: 'Company Not Found' });

        const holiday = await db.Holiday.create({
            user_id,
            company_id:company.id,
            holiday_name,
            date,
            day,
        });

        return res.status(201).json({ status: 1, message: 'Company Holiday added successfully', data: holiday });

    } catch (error) {
        console.error('Error while adding holiday:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.getCompanyHolidaysList = async (req, res) => {
    try {
        let { page, limit } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;

        const { count, rows: holidays } = await db.Holiday.findAndCountAll({
            limit,
            offset,
            order: [['createdAt', 'Desc']],
        });

        return res.status(200).json({
            status: 1,
            message: "Company Holiday List fetched successfully",
            pagination: {
                totalHoliday: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                limit: limit,
            },
            data: holidays,
        });

    } catch (error) {
        console.error('Error while fetching holidays:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.editCompanyHoliday = async (req, res) => {
    try {
        const { holiday_id, holiday_name, date, day } = req.body;
        const holiday = await db.Holiday.findByPk(holiday_id, { attributes: { exclude: ['company_id'] } });
        if (!holiday) return res.status(404).json({ status: 0, message: 'Company Holiday Not Found' });
        if (holiday.created_by_admin) return res.status(403).json({ status: 0, message: 'Cannot edit holiday created by admin' });
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
