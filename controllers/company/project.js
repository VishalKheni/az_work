require('dotenv').config()
const db = require("../../config/db");
const bcrypt = require('bcrypt')
const moment = require('moment');
const { Op, where, Sequelize, col, fn, literal } = require("sequelize");
const fs = require('fs');
const path = require('path');

const parseBreakTimeToSeconds = (timeStr) => {
    if (!timeStr) return 0;
    const [hours = 0, minutes = 0, seconds = 0] = timeStr.split(':').map(Number);
    return (hours * 3600) + (minutes * 60) + seconds;
};

// Helper to format seconds to HH:mm:ss
const formatSecondsToHHMMSS = (totalSeconds) => {
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
};


exports.addProject = async (req, res) => {
    try {
        const { client_id, project_name, start_date, end_date, address, latitude, longitude } = req.body;
        const { documents } = req.files;
        if (req.user?.is_company_active === "Deactive") {
            return res.status(400).json({
                status: 0,
                message: "Your account has been Deactive by the admin.",
            });
        }

        const company = await db.Company.findOne({ where: { owner_id: req.user.id } });

        if (!company) {
            return res.status(400).json({ status: 0, message: 'Company Not Found' });
        }

        const client = await db.Client.findByPk(client_id);
        if (!client) {
            return res.status(400).json({ status: 0, message: 'Client Not Found' });
        }

        const project = await db.Project.create({
            company_id: company.id,
            client_id: client.id,
            project_name,
            start_date,
            end_date,
            status: "active",
            address,
            latitude,
            longitude
        });

        let documentsData;
        if (documents && documents.length > 0) {
            documentsData = documents.map(doc => ({
                project_id: project.id,
                document_url: `documents/${doc.filename}`,
                title: path.parse(doc.originalname).name,
                date: moment().toDate()
            }));
            await db.Document.bulkCreate(documentsData);
        }

        return res.status(201).json({
            status: 1,
            message: "Project added successfully",
            data: { project, documents: documentsData }
        });
    } catch (error) {
        console.error('Error while create project:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};


exports.editProject = async (req, res) => {
    try {
        const { project_id, client_id, project_name, start_date, end_date, status, address, latitude, longitude } = req.body;
        if (req.user?.is_company_active === "Deactive") {
            return res.status(400).json({
                status: 0,
                message: "Your account has been Deactive by the admin.",
            });
        }

        const company = await db.Company.findOne({ where: { owner_id: req.user.id } });
        if (!company) return res.status(400).json({ status: 0, message: 'Company Not Found' });

        const project = await db.Project.findByPk(project_id);
        if (!project) return res.status(400).json({ status: 0, message: 'Project Not Found' });

        if (client_id) {
            let client = await db.Client.findByPk(client_id);
            if (!client) {
                return res.status(400).json({ status: 0, message: 'Client Not Found' });
            }
            await project.update({ client_id: client.id });
        }

        await project.update({ project_name, start_date, end_date, status, address, latitude, longitude });

        return res.status(200).json({
            status: 1,
            message: "Project update successfully",
            data: project
        });
    } catch (error) {
        console.error('Error while update project:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.deleteProject = async (req, res) => {
    try {
        const { project_id } = req.query;
        if (req.user?.is_company_active === "Deactive") {
            return res.status(400).json({
                status: 0,
                message: "Your account has been Deactive by the admin.",
            });
        }

        const project = await db.Project.findByPk(project_id);
        if (!project) return res.status(400).json({ status: 0, message: 'Project Not Found' });
        const projectDocuments = await db.Document.findAll({ where: { project_id: project.id } });

        for (const project of projectDocuments) {
            fs.unlinkSync(`public/${project.document_url}`);
        }

        await project.update({ is_deleted: true });

        return res.status(200).json({
            status: 1,
            message: "Project deleted successfully",
        });
    } catch (error) {
        console.error('Error while delete project:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.getProjectList = async (req, res) => {
    try {
        let { page, limit, search, status, filter } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;

        const company = await db.Company.findOne({ where: { owner_id: req.user.id } });
        if (!company) return res.status(400).json({ status: 0, message: 'Company Not Found' });

        let whereCondition = {
            company_id: company.id,
            is_deleted: false
        };
        if (search) {
            whereCondition[Op.or] = [
                { project_name: { [Op.like]: `%${search}%` } },
                { '$client.client_name$': { [Op.like]: `%${search}%` } },
            ];
        }

        if (status) {
            whereCondition.status = { [Op.like]: `%${status}%` }
        };

        let order;
        if (filter === 'id_ASC') {
            order = [['id', 'ASC']];
        } else if (filter === 'id_DESC') {
            order = [['id', 'DESC']];
        } else if (filter === 'project_name_DESC') {
            order = [['project_name', 'DESC']];
        } else if (filter === 'project_name_ASC') {
            order = [['project_name', 'ASC']];
        } else if (filter === 'client_name_ASC') {
            order = [literal('`client`.`client_name` ASC')];
        } else if (filter === 'client_name_DESC') {
            order = [literal('`client`.`client_name` DESC')];
        } else if (filter === 'start_date_ASC') {
            order = [['start_date', 'ASC']];
        } else if (filter === 'start_date_DESC') {
            order = [['start_date', 'DESC']];
        } else if (filter === 'end_date_ASC') {
            order = [['end_date', 'ASC']];
        } else if (filter === 'end_date_DESC') {
            order = [['end_date', 'DESC']];
        }


        const { count, rows: project } = await db.Project.findAndCountAll({
            where: { ...whereCondition },
            include: [
                {
                    model: db.Client,
                    as: 'client',
                    attributes: ['id', 'client_name', 'createdAt']
                }
            ],
            distinct: true,
            limit,
            offset,
            order
        })

        return res.status(200).json({
            status: 1,
            message: "Project List fetched Successfully",
            pagination: {
                totalProject: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                limit: limit,
            },
            data: project
        });

    } catch (error) {
        console.error('Error while get project List:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}

exports.getProjectDetail = async (req, res) => {
    try {
        let { project_id } = req.query;

        const projectDetail = await db.Project.findByPk(project_id, {
            include: [
                {
                    model: db.Client,
                    as: 'client',
                    attributes: ['id', 'client_name', 'createdAt']
                },
            ],
        });
        if (!projectDetail) return res.status(400).json({ status: 0, message: 'Project Not Found' });

        const company = await db.Company.findOne({ where: { owner_id: req.user.id } });
        const branchMonthlyHours = parseFloat(company?.monthly_hours || 0);
        const workers = await db.User.findAll({ where: { company_id: company.id, user_role: 'worker' }, attributes: ['id'] });
        const workerIds = workers.map(worker => worker.id);
        const today = moment();

        const clockEntries = await db.Clock_entry.findAll({
            where: {
                project_id,
                worker_id: { [Op.in]: workerIds },
                status: "approved",
                date: {
                    [Op.between]: [
                        today.clone().startOf('month').format('YYYY-MM-DD'),
                        today.clone().endOf('month').format('YYYY-MM-DD')
                    ]
                }
            },
            order: [['date', 'DESC']],
        });
        // console.log('clockEntries', clockEntries)


        let totalSeconds = 0;
        clockEntries.forEach(entry => {
            if (entry.duration) {
                totalSeconds += parseBreakTimeToSeconds(entry.duration);
            }
        });
        const totalWorkingHours = (totalSeconds / 3600).toFixed(2);
        const overtime = totalWorkingHours > branchMonthlyHours
            ? Math.round(totalWorkingHours - branchMonthlyHours)
            : 0;

        const totalHour = parseInt(branchMonthlyHours)
        const monthlyHour = parseInt(branchMonthlyHours) + overtime

        // const formattedDuration = formatSecondsToHHMMSS(totalSeconds);
        // console.log('formattedDuration', formattedDuration)
        return res.status(200).json({
            status: 1,
            message: "Project detail fetched Successfully",
            data: projectDetail, totalHour, monthlyHour, overtime,

        });

    } catch (error) {
        console.error('Error while get project detail:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}

exports.addProjectDocuments = async (req, res) => {
    try {
        const { project_id, title } = req.body;
        const { documents } = req.files;
        if (req.user?.is_company_active === "Deactive") {
            return res.status(400).json({
                status: 0,
                message: "Your account has been Deactive by the admin.",
            });
        }

        const project = await db.Project.findByPk(project_id);
        if (!project) return res.status(400).json({ status: 0, message: 'Project Not Found' });


        let documentsData;
        if (documents && documents.length > 0) {
            documentsData = documents.map(doc => ({
                project_id: project.id,
                document_url: `documents/${doc.filename}`,
                title: title,
                date: moment().toDate()
            }));
            await db.Document.bulkCreate(documentsData);
        }

        return res.status(201).json({
            status: 1,
            message: "Project document added successfully",
            documents: documentsData
        });
    } catch (error) {
        console.error('Error while create project:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};


exports.projectDocumentList = async (req, res) => {
    try {
        let { project_id, page, limit, search } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;

        const project = await db.Project.findByPk(project_id);
        if (!project) return res.status(400).json({ status: 0, message: 'Project Not Found' });

        let whereCondition = {
            project_id: project.id
        };

        if (search) {
            whereCondition[Op.or] = [
                { title: { [Op.like]: `%${search}%` } },
            ];
        }

        const { count, rows: documents } = await db.Document.findAndCountAll({
            where: { ...whereCondition },
            attributes: { exclude: ['worker_id', 'type'] },
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        });

        return res.status(200).json({
            status: 1,
            message: "Project document fetched Successfully",
            pagination: {
                totalDocuments: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                limit: limit,
            },
            data: documents
        });

    } catch (error) {
        console.error('Error while get project document:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}



exports.projectClientList = async (req, res) => {
    try {
        const company = await db.Company.findOne({ where: { owner_id: req.user.id } });
        if (!company) return res.status(400).json({ status: 0, message: 'Company Not Found' });

        const client = await db.Client.findAll({
            where: { company_id: company.id, is_deleted: false },
            attributes: ['id', 'client_name', 'createdAt'],
        });

        return res.status(200).json({
            status: 1,
            message: 'Client List fetched successfully',
            data: client,
        });
    } catch (error) {
        console.error('Error while fetching client list:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.projectImagesList = async (req, res) => {
    try {
        let { project_id, page, limit, search } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;

        const project = await db.Project.findByPk(project_id);
        if (!project) return res.status(400).json({ status: 0, message: 'Project Not Found' });

        let whereCondition = {
            project_id: project.id,
            type: 'image'
        };

        if (search) {
            whereCondition[Op.or] = [
                { title: { [Op.like]: `%${search}%` } },
                { '$user.firstname$': { [Op.like]: `%${search}%` } },
                { '$user.lastname$': { [Op.like]: `%${search}%` } },
            ];
        }

        const { count, rows: documents } = await db.Document.findAndCountAll({
            where: { ...whereCondition },
            include: [
                {
                    model: db.User,
                    as: 'user',
                    attributes: ['id', 'firstname', 'lastname']
                }
            ],
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        });

        return res.status(200).json({
            status: 1,
            message: "Project images fetched Successfully",
            pagination: {
                totalImages: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                limit: limit,
            },
            data: documents
        });

    } catch (error) {
        console.error('Error while get project document:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}


