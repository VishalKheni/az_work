require('dotenv').config()
const db = require("../../config/db");
const bcrypt = require('bcrypt')
const moment = require('moment');
const { Op, where, Sequelize, col, fn } = require("sequelize");
const fs = require('fs');
const path = require('path');


exports.addProject = async (req, res) => {
    try {
        const { client_id, project_name, start_date, end_date, status, address } = req.body;
        const { documents } = req.files;

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
            status,
            address
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
        const { project_id, client_id, project_name, start_date, end_date, status, address } = req.body;

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

        await project.update({ project_name, start_date, end_date, status, address });

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

        const project = await db.Project.findByPk(project_id);
        if (!project) return res.status(400).json({ status: 0, message: 'Project Not Found' });
        const projectDocuments = await db.Document.findAll({ where: { project_id: project.id } });

        for (const project of projectDocuments) {
            fs.unlinkSync(`public/${project.document_url}`);
        }

        await project.destroy();

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
                { project_name: { [Op.like]: `%${search}%` } },
                { '$client.client_name$': { [Op.like]: `%${search}%` } },
            ];
        }

        if (status) {
            whereCondition.status = { [Op.like]: `%${status}%` }
        };

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
            order: [['createdAt', 'DESC']]
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

        return res.status(200).json({
            status: 1,
            message: "Project detail fetched Successfully",
            data: projectDetail,
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
            where: { company_id: company.id },
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
