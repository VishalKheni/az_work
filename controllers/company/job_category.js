require('dotenv').config()
const db = require("../../config/db");
const bcrypt = require('bcrypt')
const moment = require('moment');
const { Op, where, Sequelize, fn, col } = require("sequelize");


function normalizeString(str) {
    if (typeof str !== 'string') return '';
    return str
        .trim()
        .replace(/\s*&+\s*/g, ' & ')
        .replace(/\s+/g, ' ');
}

exports.addJobCategory = async (req, res) => {
    try {
        let { Job_title } = req.body;

        if (req.user?.is_company_active === "Deactive") {
            return res.status(400).json({
                status: 0,
                message: "Your account has been Deactive by the admin.",
            });
        }

        // Trim and normalize input
        // category_name = normalizeString(category_name);
        Job_title = normalizeString(Job_title);

        const company = await db.Company.findOne({ where: { owner_id: req.user.id } });

        if (!company) {
            return res.status(400).json({ status: 0, message: 'Company Not Found' });
        }

        let jobTitle = await db.Job_title.findOne({
            where: {
                company_id: company.id,
                Job_title: Job_title
            }
        });

        // If job title does not exist, create a new one
        if (!jobTitle) {
            jobTitle = await db.Job_title.create({
                company_id: company.id,
                Job_title: Job_title
            });
        }else{
            return res.status(400).json({ status: 0, message: 'Job title already exists' });
        }

        return res.status(201).json({
            status: 1,
            message: "Job  title added successfully",
            data: {
                jobTitle
            }
        });
    } catch (error) {
        console.error('Error while adding Job Title:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};



exports.getJobCategoryList = async (req, res) => {
    try {
        let { page, limit, search, filter } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;

        const company = await db.Company.findOne({ where: { owner_id: req.user.id } });

        if (!company) {
            return res.status(400).json({ status: 0, message: 'Company Not Found' });
        }

        // Search condition
        let whereCondition = {
            company_id: company.id
        };

        if (search) {
            whereCondition[Op.or] = [
                { Job_title : { [Op.like]: `%${search}%` } }
            ];
        }

        let order;
        if (filter === 'id_ASC') {
            order = [['id', 'ASC']];
        } else if (filter === 'id_DESC') {
            order = [['id', 'DESC']];
        } else if (filter === 'Job_title_ASC') {
            order = [['Job_title', 'ASC']];
        } else if (filter === 'Job_title_DESC') {
            order = [['Job_title', 'DESC']];
        }

        const { count, rows: categories } = await db.Job_title.findAndCountAll({
            where: { ...whereCondition },
            distinct: true,
            limit,
            offset,
            order
        });

        return res.status(200).json({
            status: 1,
            message: "Job List fetched successfully",
            pagination: {
                totalCategories: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                limit: limit,
            },
            data: categories
        });

    } catch (error) {
        console.error('Error while fetching job category list:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.editJobCategory = async (req, res) => {
    try {
        const { job_title_id, Job_title } = req.body;

        if (req.user?.is_company_active === "Deactive") {
            return res.status(400).json({
                status: 0,
                message: "Your account has been deactivated by the admin.",
            });
        }

        const normalizedJobTitle = Job_title?.trim();

        // Find the company for the current user
        const company = await db.Company.findOne({
            where: { owner_id: req.user.id }
        });

        if (!company) {
            return res.status(400).json({ status: 0, message: 'Company not found' });
        }

        // Fetch the current job title
        const jobTitle = await db.Job_title.findOne({
            where: {
                id: job_title_id,
                company_id: company.id
            }
        });

        if (!jobTitle) {
            return res.status(404).json({ status: 0, message: 'Job title not found' });
        }

        // Check if the new title already exists for this company (and is not the current one)
        const existingTitle = await db.Job_title.findOne({
            where: {
                Job_title: normalizedJobTitle,
                company_id: company.id,
                id: { [db.Sequelize.Op.ne]: job_title_id }
            }
        });

        if (existingTitle) {
            return res.status(400).json({
                status: 0,
                message: "This job title already exists in your company"
            });
        }

        // Update the job title
        await jobTitle.update({ Job_title: normalizedJobTitle });

        return res.status(200).json({
            status: 1,
            message: 'Job title updated successfully',
            data: jobTitle
        });

    } catch (error) {
        console.error('Error while editing job title:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.deleteJobCategory = async (req, res) => {
    try {
        const { job_title_id } = req.query;

        if (req.user?.is_company_active === "Deactive") {
            return res.status(400).json({
                status: 0,
                message: "Your account has been Deactive by the admin.",
            });
        }

        // Find company of current user
        const company = await db.Company.findOne({ where: { owner_id: req.user.id } });
        if (!company) return res.status(400).json({ status: 0, message: 'Company Not Found' });

        // Fetch the category to update
        const category = await db.Job_title.findOne({ where: { id: job_title_id, company_id: company.id } });
        if (!category) return res.status(404).json({ status: 0, message: 'Job title not found' });
        const userCount = await db.User.count({ where: { job_title_id } });
        if (userCount > 0) {
            return res.status(400).json({
                status: 0,
                message: `Job title is assigned to ${userCount} worker and cannot be deleted.`,
            });
        }

        await category.destroy();
        return res.status(200).json({
            status: 1,
            message: 'Job title deleted successfully',
        });
    } catch (error) {
        console.error('Error while delete Job Category:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};


