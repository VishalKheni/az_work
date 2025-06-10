require('dotenv').config()
const db = require("../../config/db");
let fs = require('fs');
const path = require('path');


exports.addAbsences = async (req, res) => {
    try {
        const { absence_type, status } = req.body;
        const { absence_logo } = req.files;
        const user_id = req.user.id;

        const existingAbsence = await db.Absences.findOne({
            where: {
                user_id,
                absence_type,
            },
        });

        if (existingAbsence) {
            return res.status(400).json({
                status: 0,
                message: 'Absence with the same type already exists.',
            });
        }

        const absence = await db.Absences.create({
            user_id,
            absence_type,
            absence_logo: `absence_logo/${absence_logo[0].filename}`,
            status,
            created_by_admin: true
        });

        return res.status(201).json({ status: 1, message: 'Absence added successfully', data: absence });

    } catch (error) {
        console.error('Error while adding absence:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.editAbsences = async (req, res) => {
    try {
        const { absence_id, absence_type, status } = req.body;
        const { absence_logo } = req.files;
        const absence = await db.Absences.findByPk(absence_id)
        if (!absence) return res.status(404).json({ status: 0, message: 'Absence Not Found' });
        if (req.files && absence_logo) {
            if (absence.absence_logo) { fs.unlinkSync(`public/${absence.absence_logo}`) }
            absence.absence_logo = `absence_logo/${absence_logo[0].filename}`;
            await absence.save();
        }

        await absence.update({ absence_type, status });
        return res.status(201).json({ status: 1, message: 'Absence update successfully', data: absence });
    } catch (error) {
        console.error('Error while edit absence:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.deleteAbsences = async (req, res) => {
    try {
        const { absence_id } = req.query;
        const absence = await db.Absences.findByPk(absence_id);
        if (!absence) return res.status(404).json({ status: 0, message: 'Absence Not Found' });
        // fs.unlinkSync(`public/${absence.absence_logo}`)
        const logoPath = path.join('public', absence.absence_logo);
        if (fs.existsSync(logoPath)) {
            fs.unlinkSync(logoPath);
        }
        await absence.destroy();
        return res.status(201).json({ status: 1, message: 'Absence deleted successfully' });
    } catch (error) {
        console.error('Error while delete absence:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.getAbsencesList = async (req, res) => {
    try {
        let { page, limit, filter } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;

        let order;
        if (filter === 'id_DESC') {
            order = [['id', 'DESC']];
        } else if (filter === 'absence_type_ASC') {
            order = [['absence_type', 'ASC']];
        } else if (filter === 'paid_ASC') {
            order = [[db.sequelize.literal(`CASE WHEN status = 'paid' THEN 0 ELSE 1 END`), 'ASC'], ['createdAt', 'ASC']];
        } else if (filter === 'unpaid_ASC') {
            order = [[db.sequelize.literal(`CASE WHEN status = 'unpaid' THEN 0 ELSE 1 END`), 'ASC'], ['createdAt', 'ASC']];
        } else if (filter === 'absence_type_DESC') {
            order = [['absence_type', 'DESC']];
        } else if (filter === 'paid_DESC') {
            order = [[db.sequelize.literal(`CASE WHEN status = 'paid' THEN 0 ELSE 1 END`), 'DESC'], ['createdAt', 'DESC']];
        } else if (filter === 'unpaid_DESC') {
            order = [[db.sequelize.literal(`CASE WHEN status = 'unpaid' THEN 0 ELSE 1 END`), 'DESC'], ['createdAt', 'DESC']];
        }

        const { count, rows: absence } = await db.Absences.findAndCountAll({
            where: { user_id: req.user.id },
            limit,
            offset,
            order
        });

        return res.status(200).json({
            status: 1,
            message: "Absence List fetched successfully",
            pagination: {
                totalAbsence: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                limit: limit,
            },
            data: absence,
        });

    } catch (error) {
        console.error('Error while fetching absence:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};
