require('dotenv').config()
const db = require("../../config/db");


exports.addCompanyHoliday = async (req, res) => {
    try {
        const { holiday_name, date, day } = req.body;
        const user_id = req.user.id;

        const existingHoliday = await db.Holiday.findOne({
            where: {
                user_id,
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
            order: [['id', 'Desc']],
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
