require('dotenv').config()
const db = require("../../config/db");
const bcrypt = require('bcrypt')
const moment = require('moment');
const { validateMobile, } = require('../../helpers/twilio');
const { sendEmailToWorker } = require("../../helpers/email");
const { validateFiles } = require('../../helpers/fileValidation');
const { Op, where, Sequelize, col } = require("sequelize");
const path = require('path');
const fs = require('fs');

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
            documentsData = documents.map(doc => ({
                worker_id: worker.id,
                document_url: `documents/${doc.filename}`,
                title: path.parse(doc.originalname).name, 
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


exports.getWorkerList = async (req, res) => {
    try {
        let { page, limit, search } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;

        const company = await db.Company.findOne({ where: { owner_id: req.user.id } });

        if (!company) {
            return res.status(400).json({ status: 0, message: 'Company Not Found' });
        }

        let whereCondition = {};

        if (search) {
            whereCondition[Op.or] = [
                { firstname: { [Op.like]: `%${search}%` } },
                { lastname: { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows: worker } = await db.User.findAndCountAll({
            where: { ...whereCondition, user_role: "worker", company_id: company.id },
            attributes: { exclude: ['otp', 'otp_created_at', 'is_email_verified', 'login_type', 'is_company_add', 'password'] },
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
            ],
            distinct: true,
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        })

        return res.status(200).json({
            status: 1,
            message: "Worker List fetched Successfully",
            pagination: {
                totalWorker: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                limit: limit,
            },
            data: worker
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

        if (!worker) return res.status(404).json({ status: 0, message: "Worker not found" })

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
        }
        for (const doc of workerDocuments) {
            fs.unlinkSync(`public/${doc.document_url}`);
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

