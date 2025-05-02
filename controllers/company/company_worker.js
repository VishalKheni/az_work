require('dotenv').config()
const db = require("../../config/db");
const bcrypt = require('bcrypt')
const moment = require('moment');
const { validateMobile, } = require('../../helpers/twilio');
const { sendEmailToWorker } = require("../../helpers/email");
const { validateFiles } = require('../../helpers/fileValidation');
const { Op, where, Sequelize, col, fn } = require("sequelize");
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
        const existingWorker = await db.User.findOne({ where: { email: req.body.email, company_id: company.id, user_role: "worker" } });
        if (existingWorker) {
            return res.status(400).json({ status: 0, message: 'Worker with this email already exists' });
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
            is_email_verified: true,
            is_worker_active: true,
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
            email: worker.email,
            password: password,
            company_name: company.company_name,
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
        let { page, limit, search, status } = req.query;
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


        if (status === 'active') {
            whereCondition.is_worker_active = true;
        } else if (status === 'inactive') {
            whereCondition.is_worker_active = false;
        }



        const { count, rows: worker } = await db.User.findAndCountAll({
            where: { ...whereCondition, user_role: "worker", company_id: company.id },
            attributes: { exclude: ['otp', 'otp_created_at', 'is_email_verified', 'login_type', 'is_company_add', 'is_account_created', 'is_password_add', 'password'] },
            include: [
                {
                    model: db.Job_category,
                    as: 'job_category',
                    attributes: ['id', 'category_name'],
                },
                {
                    model: db.Job_title,
                    as: 'job_title',
                    attributes: ['id', 'job_title'],
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
            attributes: { exclude: ['otp', 'otp_created_at', 'is_email_verified', 'login_type', 'is_company_add', 'is_account_created', 'is_password_add'] },
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

exports.workerJobCategoryList = async (req, res) => {
    try {
        const company = await db.Company.findOne({ where: { owner_id: req.user.id } });
        if (!company) return res.status(400).json({ status: 0, message: 'Company Not Found' });


        const job_category = await db.Job_category.findAll({
            where: { company_id: company.id },
        })
        return res.status(200).json({
            status: 1,
            message: 'Job category List fetched successfully',
            data: job_category,
        });
    } catch (error) {
        console.error('Error while fetching Job Category list:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.workerJobTitleList = async (req, res) => {
    try {
        const { category_id } = req.body;

        const titles = await db.Job_title.findAll({
            where: { job_category_id: category_id }
        });

        return res.status(200).json({
            status: 1,
            message: "Job Title List fetched successfully",
            data: titles
        });
    } catch (error) {
        console.error('Error while fetching Job Title List:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}

exports.addWorkerDocuments = async (req, res) => {
    try {
        const { worker_id, title } = req.body;
        const { documents } = req.files;

        const worker = await db.User.findByPk(worker_id);
        if (!worker) return res.status(400).json({ status: 0, message: 'Worker Not Found' });

        let documentsData = [];

        if (documents && documents.length > 0) {
            for (const doc of documents) {
                documentsData.push({
                    worker_id: worker.id,
                    document_url: `documents/${doc.filename}`,
                    title: title,
                    date: moment().toDate()
                });
            }
            await db.Document.bulkCreate(documentsData);
        }

        return res.status(201).json({
            status: 1,
            message: "Worker document added successfully",
            documents: documentsData
        });
    } catch (error) {
        console.error('Error while create project:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};


exports.deleteDocument = async (req, res) => {
    try {
        const { document_id } = req.query;

        const document = await db.Document.findByPk(document_id);
        if (!document) return res.status(400).json({ status: 0, message: 'Document Not Found' });
        fs.unlinkSync(`public/${document.document_url}`);
        await document.destroy();
        return res.status(200).json({
            status: 1,
            message: "Document deleted successfully",
        });
    } catch (error) {
        console.error('Error while delete document:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.workerActiveDeactive = async (req, res) => {
    try {
        const { worker_id } = req.body;

        const worker = await db.User.findByPk(worker_id);
        if (!worker) return res.status(404).json({ status: 0, message: 'Worker not found' });

        const active = worker.is_worker_active === true ? false : true;

        await worker.update({ is_worker_active: active });
        return res.status(200).json({
            status: 1,
            message: active ? 'Worker activated successfully' : 'Worker deactivated successfully',
            is_worker_active: worker.is_worker_active
        });

    } catch (error) {
        console.error('Error while ActiveDeactive worker:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}

exports.editWorkerProfile = async (req, res) => {
    try {
        const { worker_id, job_category_id, job_title_id, firstname, lastname, phone_number, country_code, iso_code, address, insurance_number, employment_date, password } = req.body;

        const worker = await db.User.findByPk(worker_id, {
            attributes: ['id', 'firstname', 'lastname', 'profile_image', 'phone_number', 'country_code', 'iso_code', 'address', 'job_category_id', 'job_title_id', 'insurance_number', 'employment_date', 'password'],
        });

        if (!worker) return res.status(404).json({ status: 0, message: "Worker not found" });

        if (req.files && req.files.profile_image) {
            const { profile_image } = req.files;
            if (worker.profile_image) {
                fs.unlinkSync(`public/${worker.profile_image}`);
            }
            await worker.update({ profile_image: `profile_images/${profile_image[0].filename}` });
        }
        if (password) {
            var hashedPassword = await bcrypt.hash(password, 10);
        }
        const updatedData = {
            firstname: firstname || worker.firstname,
            lastname: lastname || worker.lastname,
            phone_number: phone_number || worker.phone_number,
            password: password ? hashedPassword : worker.password,
            country_code: country_code || worker.country_code,
            iso_code: iso_code || worker.iso_code,
            address: address || worker.address,
            job_category_id: parseInt(job_category_id) || worker.job_category_id,
            job_title_id: parseInt(job_title_id) || worker.job_title_id,
            insurance_number: insurance_number || worker.insurance_number,
            employment_date: employment_date || worker.employment_date,
        }

        await worker.update(updatedData);
        return res.status(200).json({
            status: 1,
            message: "worker profile update Successfully",
            data: worker
        });

    } catch (error) {
        console.error('Error while add worker detail:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}

exports.getWorkerMonthlyHours = async (req, res) => {
    try {
        const { worker_id, year } = req.query;

        // Get worker details with company and branch info
        const worker = await db.User.findOne({
            where: { id: worker_id },
            include: [{
                model: db.Company,
                as: 'company',
                include: [{
                    model: db.Branch,
                    as: 'industry'
                }]
            }]
        });

        if (!worker) {
            return res.status(404).json({ message: "Worker not found." });
        }

        const branchMonthlyHours = parseFloat(worker.company?.industry?.monthly_hours || 0);
        const results = [];

        for (let month = 0; month < 12; month++) {
            const startOfMonth = moment.utc({ year, month, day: 1 }).startOf('month').toDate();
            const endOfMonth = moment.utc({ year, month, day: 1 }).endOf('month').toDate();

            // Fetch all duration entries for the month
            const workedEntries = await db.Clock_entry.findAll({
                where: {
                    worker_id,
                    date: { [Op.between]: [startOfMonth, endOfMonth] },
                },
                attributes: ['duration'],
                raw: true,
            });

            // Manually parse and sum all durations
            let totalSeconds = 0;
            for (const entry of workedEntries) {
                if (entry.duration) {
                    const [h = 0, m = 0, s = 0] = entry.duration.split(':').map(Number);
                    totalSeconds += (h * 3600) + (m * 60) + s;
                }
            }

            const totalWorkingHours = (totalSeconds / 3600).toFixed(2);
            const overtime = totalWorkingHours > branchMonthlyHours
                ? Math.round(totalWorkingHours - branchMonthlyHours)
                : 0;

            results.push({
                month: moment().month(month).format("MMMM"),
                monthly_hour: parseInt(branchMonthlyHours),
                total_working_hours: parseInt(totalWorkingHours),
                over_time: overtime,
            });
        }

        return res.status(200).json({
            status: 1,
            message: "Working Hours fetched successfully",
            working_hours: results
        });

    } catch (error) {
        console.error("error while fetching worker monthly hours", error);
        return res.status(500).json({ status: 0, message: "Internal server error" });
    }
};

exports.getWorkerTimeTable = async (req, res) => {
    try {
        let { worker_id, page, limit, month, year } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;

        const company = await db.Company.findOne({ where: { owner_id: req.user.id } });

        if (!company) {
            return res.status(400).json({ status: 0, message: 'Company Not Found' });
        }

        const whereCondition = {
            worker_id,
            [db.Sequelize.Op.and]: [
                db.sequelize.where(db.sequelize.fn('MONTH', db.sequelize.col('clock_in_time')), month),
                db.sequelize.where(db.sequelize.fn('YEAR', db.sequelize.col('clock_in_time')), year)
            ]
        };

        // Step 2: Get clock entries from ClockEntry directly
        const { count, rows: clockEntries } = await db.Clock_entry.findAndCountAll({
            where: {
                ...whereCondition
            },
            limit,
            offset,
            order: [['date', 'DESC']]
        });

        // const totalDurationResult = await db.Clock_entry.findOne({
        //     where: { ...whereCondition },
        //     attributes: [
        //         [
        //             db.sequelize.literal(`SEC_TO_TIME(SUM(TIME_TO_SEC(duration)))`),
        //             'total_duration'
        //         ]
        //     ],
        //     raw: true
        // });


        return res.status(200).json({
            status: 1,
            message: "Time table fetched successfully",
            pagination: {
                totalClockEntries: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                limit: limit,
            },
            // all_pages_total: totalDurationResult.total_duration,
            data: clockEntries
        });

    } catch (error) {
        console.error('Error while fetching worker time table:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.getTimetableDetail = async (req, res) => {
    try {
        let { clock_entry_id } = req.query;

        const clockEntries = await db.Clock_entry.findByPk(clock_entry_id, {
            include: [
                {
                    model: db.User,
                    as: 'worker',
                    attributes: ['id', 'firstname', 'lastname', 'profile_image'],
                },
            ]
        })

        if (!clockEntries) return res.status(404).json({ status: 0, message: "Clock Entries not found" })
        return res.status(200).json({
            status: 1,
            message: "Clock Entry detail fetched successfully",
            data: clockEntries
        });

    } catch (error) {
        console.error('Error while fetching worker time table:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.editTimetableStatus = async (req, res) => {
    try {
        let { clock_entry_id, status } = req.body;

        const clockEntries = await db.Clock_entry.findByPk(clock_entry_id)
        if (!clockEntries) return res.status(404).json({ status: 0, message: "Clock Entries not found" })

        if (status === 'approved') {
            clockEntries.status = 'approved';
            await clockEntries.save();
        }
        else if (status === 'rejected') {
            clockEntries.status = 'rejected';
            await clockEntries.save();
        }

        return res.status(200).json({
            status: 1,
            message: `Clock Entry ${status} successfully`,
            data: clockEntries
        });

    } catch (error) {
        console.error('Error while fetching worker time table:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};


exports.getTimeTableList = async (req, res) => {
    try {
        let { page, limit, search, month, year } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;
        const startOfMonth = moment.utc({ year, month, day: 1 }).startOf('month').toDate();
        const endOfMonth = moment.utc({ year, month, day: 1 }).endOf('month').toDate();

        const company = await db.Company.findOne({ where: { owner_id: req.user.id } });

        if (!company) {
            return res.status(400).json({ status: 0, message: 'Company Not Found' });
        }

        let whereCondition = {};

        if (search) {
            whereCondition[Op.or] = [
                { firstname: { [Op.like]: `%${search}%` } },
                { lastname: { [Op.like]: `%${search}%` } },
                where(
                    fn('CONCAT', col('firstname'), ' ', col('lastname')),
                    {
                        [Op.like]: `%${search}%`
                    }
                )
        
            ];
        }

        const { count, rows: worker } = await db.User.findAndCountAll({
            where: { ...whereCondition, user_role: "worker", company_id: company.id },
            attributes: ['id', 'firstname', 'lastname',],
            include: [
                {
                    model: db.absence_request,
                    as: 'absence_requests',
                    where: {
                        request_status: "accepted",
                        createdAt: { [Op.between]: [startOfMonth, endOfMonth] },
                    },
                    include: [
                        {
                            model: db.Absences,
                            as:'absence',
                            attributes: ["id",  "absence_type", "absence_logo", "status"]
                        }
                    ]
                },
            ],
            distinct: true,
            limit,
            offset,
            order: [['id', 'DESC']]
        })

        return res.status(200).json({
            status: 1,
            message: "Time table List fetched Successfully",
            pagination: {
                totalTimetable: count,
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