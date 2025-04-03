require('dotenv').config()
const db = require("../../config/db");
const bcrypt = require('bcrypt')
const moment = require('moment');


exports.addJobCategory = async (req, res) => {
    try {
        const { category_name, Job_title } = req.body;
        const company = await db.Company.findOne({ where: { owner_id: req.user.id } });

        if (!company) {
            return res.status(400).json({ status: 0, message: 'Company Not Found' });
        }

        // Check if the category already exists for this company
        let category = await db.Job_category.findOne({
            where: { company_id: company.id, category_name }
        });

        // If category does not exist, create a new one
        if (!category) {
            category = await db.Job_category.create({
                company_id: company.id,
                owner_id: company.owner_id,
                category_name
            });
        }

        // Check if the job title already exists under this category
        let jobTitle = await db.Job_title.findOne({
            where: { company_id: company.id, job_category_id: category.id, Job_title }
        });

        // If job title does not exist, create a new one
        if (!jobTitle) {
            jobTitle = await db.Job_title.create({
                company_id: company.id,
                job_category_id: category.id,
                Job_title
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


// exports.addJobCategory = async (req, res) => {
//     try {
//         const { category_name, Job_title } = req.body;
//         const company = await db.Company.findOne({ where: { owner_id: req.user.id } });

//         if (!company) {
//             return res.status(400).json({ status: 0, message: 'Company Not Found' });
//         }

//         // Check if the category already exists for this company
//         let category = await db.Job_category.findOne({
//             where: { company_id: company.id, category_name }
//         });

//         // If category does not exist, create a new one
//         if (!category) {
//             category = await db.Job_category.create({
//                 company_id: company.id,
//                 owner_id: company.owner_id,
//                 category_name
//             });
//         }

//         // Create job title under the category
//         const jobTitle = await db.Job_title.create({
//             company_id: company.id,
//             job_category_id: category.id,
//             Job_title
//         });

//         return res.status(201).json({
//             status: 1,
//             message: "Job category added successfully",
//             data: {
//                 category,
//                 jobTitle
//             }
//         });

//     } catch (error) {
//         console.error('Error while adding Job Category:', error);
//         return res.status(500).json({ status: 0, message: 'Internal server error' });
//     }
// };

