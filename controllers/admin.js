require('dotenv').config()
const db = require("../config/db");
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
const moment = require('moment');
const { sendOTPVerificationEmail } = require("../helpers/email");
const { validateMobile, } = require('../helpers/twilio');
const { Op, where, Sequelize, col } = require("sequelize");
let path = require('path');
let fs = require('fs');


exports.dashboard = async (req, res) => {
    try {
        const totalCompany = await db.User.count({ where: { user_role: "company", is_company_add: true } })
        const totalWorker = await db.User.count({ where: { user_role: "worker" } })
        const totalUsers = await db.User.count({
            where: {
              [Op.or]: [
                { user_role: "worker" },
                { user_role: "company", is_company_add: true }
              ]
            }
          });
                    
        return res.status(200).json({
            status: 1,
            message: 'Dashboard count fetched successfully',
            data: {
                totalCompany,
                totalWorker,
                totalUsers
            },
        });

    } catch (error) {
        console.error('Error while fetching dashboard:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}
exports.companyList = async (req, res) => {
    try {
        let { page, limit } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;

        const { count, rows: companies } = await db.Company.findAndCountAll({
            limit,
            offset,
            include: [
                {
                    model: db.User,
                    as: 'owner',
                    attributes: ['id', 'firstname', 'lastname', 'country_code', 'iso_code', 'phone_number']
                },
                {
                    model: db.Branch,
                    as: 'industry',
                    attributes: ['id', 'branch_name', 'createdAt']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        return res.status(200).json({
            status: 1,
            message: 'Company List fetched successfully',
            pagination: {
                totalCompanies: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                limit: limit,
            },
            data: companies,
        });
    } catch (error) {
        console.error('Error while fetching company list:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.companyDetail = async (req, res) => {
    try {
        const { company_id } = req.query;

        const company = await db.Company.findByPk(company_id, {
            include: [
                {
                    model: db.User,
                    as: 'owner',
                    attributes: ['id', 'firstname', 'lastname', 'country_code', 'iso_code', 'phone_number']
                },
                {
                    model: db.Branch,
                    as: 'industry',
                    attributes: ['id', 'branch_name', 'createdAt']
                }
            ],
        });

        if (!company) {
            return res.status(400).json({
                status: 0,
                message: 'Company not found',
            })
        }

        return res.status(200).json({
            status: 1,
            message: 'Company detail fetched successfully',
            data: company,
        });
    } catch (error) {
        console.error('Error while fetching company list:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};


exports.addBranch = async (req, res) => {
    try {
        const user_id = req.user.id;

        const { branch_name, weekly_hours, monthly_hours, yearly_hours, over_time } = req.body;

        const branch = await db.Branch.create({
            user_id,
            branch_name,
            weekly_hours,
            monthly_hours,
            yearly_hours,
            over_time
        });

        return res.status(201).json({ status: 1, message: 'Branch added successfully', data: branch });

    } catch (error) {
        console.error('Error while adding branch:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}

exports.allBranchList = async (req, res) => {
    let { page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const offset = (page - 1) * limit;

    try {
        const { count, rows: branch } = await db.Branch.findAndCountAll({
            where: { user_id: req.user.id },
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        })

        return res.status(200).json({
            status: 1,
            message: "Branch List fetched Successfully",
            pagination: {
                totalBranch: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                limit: limit,
            },
            data: branch,
        });
    } catch (error) {
        console.error('Error while signup:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }

}

exports.editBranch = async (req, res) => {
    const { branch_id, branch_name, weekly_hours, monthly_hours, yearly_hours, over_time } = req.body;

    try {
        const branch = await db.Branch.findByPk(branch_id);
        if (!branch) {
            return res.status(400).json({ status: 0, message: 'Branch Not Found' });
        }

        await branch.update({
            branch_name,
            weekly_hours,
            monthly_hours,
            yearly_hours,
            over_time
        })

        return res.status(200).json({ status: 1, message: 'Branch update successfully', data: branch });

    } catch (error) {
        console.error('Error while adding branch:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}

exports.deleteBranch = async (req, res) => {
    const { branch_id } = req.query;

    try {
        const branch = await db.Branch.findByPk(branch_id);
        if (!branch) {
            return res.status(400).json({ status: 0, message: 'Branch Not Found' });
        }
        await branch.destroy();
        return res.status(200).json({ status: 1, message: 'Branch deleted successfully' });

    } catch (error) {
        console.error('Error while edit branch:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}

exports.addHoliday = async (req, res) => {
    try {
        const { holiday_name, date, day } = req.body;
        const user_id = req.user.id;

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
        let { page, limit } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;

        const { count, rows: holidays } = await db.Holiday.findAndCountAll({
            attributes: { exclude: ['company_id'] },
            limit,
            offset,
            order: [['createdAt', 'Desc']],
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

exports.addAbsences = async (req, res) => {
    try {
        const { absence_type, status } = req.body;
        const user_id = req.user.id;

        const absence = await db.Absences.create({
            user_id,
            absence_type,
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
        const absence = await db.Absences.findByPk(absence_id)
        if (!absence) return res.status(404).json({ status: 0, message: 'Absence Not Found' });
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
        await absence.destroy();
        return res.status(201).json({ status: 1, message: 'Absence deleted successfully' });
    } catch (error) {
        console.error('Error while delete absence:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.getAbsencesList = async (req, res) => {
    try {
        let { page, limit } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;

        const { count, rows: absence } = await db.Absences.findAndCountAll({
            limit,
            offset,
            order: [['createdAt', 'Desc']],
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

