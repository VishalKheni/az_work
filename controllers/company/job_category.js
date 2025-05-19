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
        let { category_name, Job_title } = req.body;

        if (req.user?.is_company_active === "Deactive") {
            return res.status(400).json({
                status: 0,
                message: "Your account has been Deactive by the admin.",
            });
        }

        // Trim and normalize input
        category_name = normalizeString(category_name);
        Job_title = normalizeString(Job_title);

        const company = await db.Company.findOne({ where: { owner_id: req.user.id } });

        if (!company) {
            return res.status(400).json({ status: 0, message: 'Company Not Found' });
        }

        // Check if the category already exists for this company
        let category = await db.Job_category.findOne({
            where: {
                company_id: company.id,
                category_name: category_name
            }
        });

        // If category does not exist, create a new one
        if (!category) {
            category = await db.Job_category.create({
                company_id: company.id,
                category_name: category_name
            });
        }

        // Check if the job title already exists under this category
        let jobTitle = await db.Job_title.findOne({
            where: {
                company_id: company.id,
                job_category_id: category.id,
                Job_title: Job_title
            }
        });

        // If job title does not exist, create a new one
        if (!jobTitle) {
            jobTitle = await db.Job_title.create({
                company_id: company.id,
                job_category_id: category.id,
                Job_title: Job_title
            });
        }

        return res.status(201).json({
            status: 1,
            message: "Job category and job title added successfully",
            data: {
                category,
                jobTitle
            }
        });
    } catch (error) {
        console.error('Error while adding Job Category and Job Title:', error);
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
                { category_name: { [Op.like]: `%${search}%` } },
                { '$job_titles.Job_title$': { [Op.like]: `%${search}%` } }
            ];
        }

        let order;
        if (filter === 'id_ASC') {
            order = [['id', 'ASC']];
        } else if (filter === 'id_DESC') {
            order = [['id', 'DESC']];
        } else if (filter === 'category_name_ASC') {
            order = [['category_name', 'ASC']];
        } else if (filter === 'category_name_DESC') {
            order = [['category_name', 'DESC']];
        } else if (filter === 'Job_title_ASC') {
            order = [[Sequelize.literal("`job_titles`.`Job_title`"), 'ASC']];
        } else if (filter === 'Job_title_DESC') {
            order = [[Sequelize.literal("`job_titles`.`Job_title`"), 'DESC']];
        }

        const { count, rows: categories } = await db.Job_category.findAndCountAll({
            where: { ...whereCondition },
            include: [
                {
                    model: db.Job_title,
                    as: 'job_titles',
                    required: false,
                }
            ],
            distinct: true,
            subQuery: false,
            limit,
            offset,
            order
        });

        return res.status(200).json({
            status: 1,
            message: "Job Category List fetched successfully",
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
        let { category_id, job_title_id, category_name, Job_title } = req.body;

        if (req.user?.is_company_active === "Deactive") {
            return res.status(400).json({
                status: 0,
                message: "Your account has been Deactive by the admin.",
            });
        }
        // Trim and normalize input
        const normalizedCategoryName = normalizeString(category_name);
        const normalizedJobTitle = normalizeString(Job_title);

        // Find company of current user
        const company = await db.Company.findOne({ where: { owner_id: req.user.id } });

        if (!company) {
            return res.status(400).json({ status: 0, message: 'Company Not Found' });
        }

        // Fetch the category to update
        const category = await db.Job_category.findOne({
            where: {
                id: category_id,
                company_id: company.id,
            }
        });

        if (!category) {
            return res.status(404).json({ status: 0, message: 'Job category not found' });
        }

        // Before updating category name, check if same name already exists (for same company but different category)
        if (normalizedCategoryName) {
            const existingCategory = await db.Job_category.findOne({
                where: {
                    company_id: company.id,
                    category_name: normalizedCategoryName,
                    id: { [db.Sequelize.Op.ne]: category_id } // Not same id
                }
            });

            if (existingCategory) {
                return res.status(400).json({ status: 0, message: 'Category name already exists' });
            }

            category.category_name = normalizedCategoryName;
            await category.save();
        }

        // Fetch the job title to update
        const jobTitle = await db.Job_title.findOne({
            where: {
                id: job_title_id,
                job_category_id: category.id,
                company_id: company.id
            }
        });

        if (!jobTitle) {
            return res.status(404).json({ status: 0, message: 'Job title not found' });
        }

        // Before updating job title, check if same title already exists (for same category)
        if (normalizedJobTitle) {
            const existingJobTitle = await db.Job_title.findOne({
                where: {
                    company_id: company.id,
                    job_category_id: category.id,
                    Job_title: normalizedJobTitle,
                    id: { [db.Sequelize.Op.ne]: job_title_id } // Not same id
                }
            });

            if (existingJobTitle) {
                return res.status(400).json({ status: 0, message: 'Job title already exists under this category' });
            }

            jobTitle.Job_title = normalizedJobTitle;
            await jobTitle.save();
        }

        return res.status(200).json({
            status: 1,
            message: 'Job category and job title updated successfully',
            data: {
                category,
                jobTitle
            }
        });
    } catch (error) {
        console.error('Error while editing Job Category and Job Title:', error);
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
        if (!category) return res.status(404).json({ status: 0, message: 'Job category not found' });

        await category.destroy();
        return res.status(200).json({
            status: 1,
            message: 'Job category deleted successfully',
        });
    } catch (error) {
        console.error('Error while delete Job Category:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};



// exports.addJobCategory = async (req, res) => {
//     try {
//         const { category_name, Job_title } = req.body;
//         const company = await db.Company.findOne({ where: { owner_id: req.user.id } });

//         if (!company) {
//             return res.status(400).json({ status: 0, message: 'Company Not Found' });
//         }

//         const category = await db.Job_category.create({ company_id: company.id, category_name });
//         const jobTitle = await db.Job_title.create({ company_id: company.id, job_category_id: category.id, Job_title });

//         return res.status(201).json({
//             status: 1,
//             message: "Job category added successfully",
//             data: { category, jobTitle }
//         });
//     } catch (error) {
//         console.error('Error while adding Job Category:', error);
//         return res.status(500).json({ status: 0, message: 'Internal server error' });
//     }
// };