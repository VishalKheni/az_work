require('dotenv').config()
const db = require("../config/db");
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
const moment = require('moment');
const { validateMobile, } = require('../helpers/twilio');
const { sendEmailToWorker } = require("../helpers/email");
const { validateFiles } = require('../helpers/fileValidation');
const { Op, where, Sequelize, col } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
let path = require('path');
let fs = require('fs');


exports.branchList = async (req, res) => {
    try {
        const branch = await db.Branch.findAll();
        return res.status(200).json({
            status: 1,
            message: "branch List fetched Successfully",
            branch
        });
    } catch (error) {
        console.error('Error while signup:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }

}

exports.companyDetail = async (req, res) => {
    try {
        const company = await db.Company.findOne({
            where: { owner_id: req.user.id },
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
            ]
        });

        if (!company) {
            return res.status(404).json({ status: 0, message: 'Company not found' });
        }

        return res.status(200).json({
            status: 1,
            message: "company detail fetched Successfully",
            company
        });
    } catch (error) {
        console.error('Error while signup:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}

exports.addWorker = async (req, res) => {
    try {
        const { job_category_id, job_title_id, iso_code, phone_number, password } = req.body;
        const { profile_image, documents } = req.files;

        const company = await db.Company.findOne({ where: { owner_id: req.user.id } });
        if (!company) {
            return res.status(400).json({ status: 0, message: 'Company Not Found' });
        }
        const job_category = await db.Job_category.findByPk(job_category_id)
        if (!job_category) {
            return res.status(400).json({ status: 0, message: 'Job Category Not Found' });
        }
        const job_title = await db.Job_title.findByPk(job_title_id)
        if (!job_title) {
            return res.status(400).json({ status: 0, message: 'Job title Not Found' });
        }

        let valid = await validateMobile(iso_code, phone_number)
        if (valid.status == 0) {
            return res.status(400).json({ message: valid.message });
        }

        if (profile_image) {
            const validation = await validateFiles(profile_image, ["jpg", "jpeg", "png", "webp"]);
            if (!validation.valid) return res.status(400).json({ Status: 0, message: validation.message });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const worker = await db.User.create({
            ...req.body,
            user_role: "worker",
            company_id: company.id,
            job_category_id: job_category.id,
            job_title_id: job_title.id,
            password: hashedPassword,
            profile_image: `profile_images/${profile_image[0].filename}`,
            is_email_verified: true
        })
        let documentsData;
        if (documents && documents.length > 0) {
            const validation = await validateFiles(documents, ["jpg", "jpeg", "png", "webp"]);
            if (!validation.valid) return res.status(400).json({ Status: 0, message: validation.message });
            documentsData = documents.map(doc => ({
                worker_id: worker.id,
                document_url: `documents/${doc.filename}`,
                title: doc.originalname,
                date: moment().toDate()
            }));
            await db.Document.bulkCreate(documentsData);
        }

        const emailData = {
            username: `${worker.firstname} ${worker.lastname}`,
            company_name: company.company_name,
            email: worker.email,
            password: password
        }
        await sendEmailToWorker(emailData);
        return res.status(200).json({
            status: 1,
            message: "worker detail add Successfully",
            worker,
            documentsData
        });

    } catch (error) {
        console.error('Error while add worker detail:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}

exports.getWorkerDetail = async (req, res) => {
    try {
        const { worker_id } = req.query;

        const worker = await db.User.findByPk(worker_id, {
            attributes: { exclude: ['otp', 'otp_created_at', 'is_email_verified', 'login_type', 'is_company_add',] },
            include: [
                {
                    model: db.Job_category,
                    as: 'job_category',
                },
                {
                    model: db.Job_title,
                    as: 'job_title'
                },
                {
                    model: db.Document,
                    as: 'documents',
                    attributes: { exclude: ['project_id'] },
                }
            ]
        })

        return res.status(200).json({
            status: 1,
            message: "worker detail fetched Successfully",
            data: worker
        });

    } catch (error) {
        console.error('Error while add worker detail:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}

exports.deleteWorker = async (req, res) => {
    try {
        const { worker_id } = req.query;

        const worker = await db.User.findByPk(worker_id);
        if (!worker) return res.status(400).json({ status: 0, message: 'Worker not found' });
        const workerDocuments = await db.Document.findAll({ where: { worker_id: worker.id } });

        if (worker.profile_image) {
            fs.unlinkSync(`public/${worker.profile_image}`);
            console.log('profileImagePath', `public/${worker.profile_image}`)
        }
        for (const doc of workerDocuments) {
            fs.unlinkSync(`public/${doc.document_url}`);
            console.log('documentPath', `public/${doc.document_url}`)
        }

        await worker.destroy();
        return res.status(200).json({
            status: 1,
            message: "worker deleted Successfully",
        });

    } catch (error) {
        console.error('Error while add worker detail:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}

// exports.addJobCategory = async (req, res) => {
//     try {
//         const { category_name, Job_title } = req.body;
//         const company = await db.Company.findOne({ where: { owner_id: req.user.id } });
//         if (!company) {
//             return res.status(400).json({ status: 0, message: 'Company Not Found' });
//         }

//         const category = await db.Job_category.create({
//             company_id: company.id,
//             owner_id: company.owner_id,
//             category_name
//         })
//         const jobTitle = await db.Job_title.create({
//             company_id: company.id,
//             job_category_id: category.id,
//             Job_title
//         })

//         return res.status(201).json({
//             status: 1,
//             message: "Job category add Successfully",
//             data: {
//                 category,
//                 jobTitle
//             }
//         });

//     } catch (error) {
//         console.error('Error while add Job Category:', error);
//         return res.status(500).json({ status: 0, message: 'Internal server error' });
//     }
// }

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
