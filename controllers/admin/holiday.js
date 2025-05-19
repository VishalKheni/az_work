require('dotenv').config()
const { where } = require('sequelize');
const db = require("../../config/db");


exports.addHoliday = async (req, res) => {
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
            created_by_admin: true
        });

        return res.status(201).json({ status: 1, message: 'Holiday added successfully', data: holiday });

    } catch (error) {
        console.error('Error while adding holiday:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.getHolidaysList = async (req, res) => {
    try {
        let { page, limit, filter } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;

        let order;
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

        const { count, rows: holidays } = await db.Holiday.findAndCountAll({
            where: { user_id: req.user.id, created_by_admin: true },
            attributes: { exclude: ['company_id'] },
            limit,
            offset,
            order: order ? order : [['createdAt', 'DESC']],
        });

        return res.status(200).json({
            status: 1,
            message: "Holiday List fetched successfully",
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

exports.editHoliday = async (req, res) => {
    try {
        const { holiday_id, holiday_name, date, day } = req.body;
        const holiday = await db.Holiday.findByPk(holiday_id, { attributes: { exclude: ['company_id'] } });
        if (!holiday) return res.status(404).json({ status: 0, message: 'Holiday Not Found' });
        const duplicate = await db.Holiday.findOne({
            where: {
                user_id: holiday.user_id, // ensure same user
                holiday_name,
                date,
                id: { [db.Sequelize.Op.ne]: holiday_id }, // exclude the current record
            }
        });

        if (duplicate) {
            return res.status(400).json({ status: 0, message: 'Another holiday with the same name and date already exists' });
        }


        await holiday.update({ holiday_name, date, day, });
        return res.status(200).json({ status: 1, message: 'Holiday updated successfully', data: holiday });
    } catch (error) {
        console.error('Error while updating holiday:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.deleteHoliday = async (req, res) => {
    try {
        const { holiday_id } = req.query;
        const holiday = await db.Holiday.findByPk(holiday_id);
        if (!holiday) return res.status(404).json({ status: 0, message: 'Holiday Not Found' });
        await holiday.destroy();
        return res.status(200).json({ status: 1, message: 'Holiday deleted successfully' });
    } catch (error) {
        console.error('Error while deleting holiday:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};
