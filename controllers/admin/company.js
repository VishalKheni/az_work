require('dotenv').config()
const db = require("../../config/db");
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
const moment = require('moment');
const { sendOTPVerificationEmail } = require("../../helpers/email");
const { validateMobile, } = require('../../helpers/twilio');
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
        let { page, limit, status, branch_name, search } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;

        let whereCondition = {};

        if (status === 'active') {
            whereCondition.is_company_active = true;
            whereCondition.is_company_blocked = false;
        } else if (status === 'inactive') {
            whereCondition.is_company_active = false;
            whereCondition.is_company_blocked = false;
        } else if (status === 'blocked') {
            whereCondition.is_company_blocked = true;
        }

        if (search) {
            whereCondition[Op.or] = [
                { company_name: { [Op.like]: `%${search}%` } },
                { '$owner.email$': { [Op.like]: `%${search}%` } }
            ];
        }

        let branchCondition = {};
        if (branch_name) {
            branchCondition.branch_name = { [Op.like]: `%${branch_name}%` };
        }

        const { count, rows: companies } = await db.Company.findAndCountAll({
            where: { ...whereCondition },
            include: [
                {
                    model: db.User,
                    as: 'owner',
                    attributes: ['id', 'firstname', 'lastname', 'email', 'country_code', 'iso_code', 'phone_number']
                },
                {
                    model: db.Branch,
                    as: 'industry',
                    where: branchCondition,
                    attributes: ['id', 'branch_name', 'createdAt']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit,
            offset,
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
                    attributes: ['id', 'firstname', 'lastname', 'email', 'country_code', 'iso_code', 'phone_number', 'password', 'user_role']
                },
                {
                    model: db.Branch,
                    as: 'industry',
                    attributes: ['id', 'branch_name', 'createdAt']
                }
            ],
        });

        if (!company) return res.status(400).json({ status: 0, message: 'Company not found' });

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

exports.companyActiveDeactive = async (req, res) => {
    try {
        const { company_id } = req.body;

        const company = await db.Company.findByPk(company_id);
        if (!company) return res.status(404).json({ status: 0, message: 'Company not found' });

        const active = company.is_company_active === true ? false : true;

        await company.update({ is_company_active: active });
        return res.status(200).json({
            status: 1,
            message: active ? 'Company activated successfully' : 'Company deactivated successfully',
            is_company_active: company.is_company_active
        });

    } catch (error) {
        console.error('Error while ActiveDeactive company:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}


exports.companyBockUnblock = async (req, res) => {
    try {
        const { company_id } = req.body;

        const company = await db.Company.findByPk(company_id);
        if (!company) return res.status(404).json({ status: 0, message: 'Company not found' });

        const blobked_unbloced = company.is_company_blocked === true ? false : true;

        await company.update({ is_company_blocked: blobked_unbloced });
        return res.status(200).json({
            status: 1,
            message: blobked_unbloced ? 'Company Blocked successfully' : 'Company Unblocked successfully',
            is_company_blocked: company.is_company_blocked
        });

    } catch (error) {
        console.error('Error while BockUnblock company:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}

exports.changeCompanyPassword = async (req, res) => {
    const { user_id, newPassword } = req.body;
    try {
        const user = await db.User.findByPk(user_id);
        if (!user) return res.status(404).json({ status: 0, message: 'User not found.' });

        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) return res.status(400).json({ status: 0, message: 'New password cannot be the same as the old password.' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await user.update({ password: hashedPassword });
        return res.status(200).json({ status: 1, message: 'Password changed successfully.' });
    } catch (error) {
        console.error('Error changing password by admin:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error.' });
    }
};

