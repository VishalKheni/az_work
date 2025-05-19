require('dotenv').config()
const db = require("../../config/db");
const { validateMobile, } = require('../../helpers/twilio');
const { Op, where, Sequelize, col } = require("sequelize");
let fs = require('fs');
const moment = require('moment');


exports.allAbsenceRequestList = async (req, res) => {
    try {
        let { page, limit, status, search, month, year, filter } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;

        const company = await db.Company.findOne({
            where: { owner_id: req.user.id },
        });

        const workers = await db.User.findAll({
            where: {
                company_id: company.id,
                user_role: 'worker'
            }
        });
        const workerIds = workers.map(user => user.id);

        // Build dynamic where condition
        const whereCondition = {
            worker_id: { [Op.in]: workerIds }
        };

        // Apply month/year filter using moment
        if (month && year) {
            const startDate = moment(`${year}-${month}`, 'YYYY-M').startOf('month').toDate();
            const endDate = moment(`${year}-${month}`, 'YYYY-M').endOf('month').toDate();

            whereCondition.createdAt = {
                [Op.between]: [startDate, endDate]
            };
        }

        if (search) {
            whereCondition[Op.or] = [
                { '$absence.absence_type$': { [Op.like]: `%${search}%` } },
                { '$workers.firstname$': { [Op.like]: `%${search}%` } },
                { '$workers.lastname$': { [Op.like]: `%${search}%` } }
            ];
        }

        if (status) {
            whereCondition.request_status = { [Op.like]: `%${status}%` };
        }

        let order;
        if (filter === 'id_ASC') {
            order = [['id', 'ASC']];
        } else if (filter === 'id_DESC') {
            order = [['id', 'DESC']];
        } else if (filter === 'worker_name_ASC') {
            order = [[Sequelize.literal("CONCAT(`workers`.`firstname`, ' ', `workers`.`lastname`)"), 'ASC']];
        } else if (filter === 'worker_name_DESC') {
            order = [[Sequelize.literal("CONCAT(`workers`.`firstname`, ' ', `workers`.`lastname`)"), 'DESC']];
        } else if (filter === 'absence_type_ASC') {
            order = [[Sequelize.literal("`absence`.`absence_type`"), 'ASC']];
        } else if (filter === 'absence_type_DESC') {
            order = [[Sequelize.literal("`absence`.`absence_type`"), 'DESC']];
        } else if (filter === 'date_ASC') {
            order = [['start_date', 'ASC']];
        } else if (filter === 'date_DESC') {
            order = [['start_date', 'DESC']];
        }

        const { count, rows: requestList } = await db.absence_request.findAndCountAll({
            where: { ...whereCondition },
            include: [
                {
                    model: db.Absences,
                    as: 'absence',
                    attributes: ['id', 'absence_type', 'absence_logo', 'status'],
                },
                {
                    model: db.User,
                    as: 'workers',
                    attributes: ['id', 'firstname', 'lastname'],
                }
            ],
            distinct: true,
            limit,
            offset,
            order
        });

        return res.status(200).json({
            status: 1,
            message: "Absence request list fetched successfully",
            pagination: {
                totalCategories: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                limit: limit,
            },
            data: requestList
        });

    } catch (error) {
        console.error('Error while fetching absence request list:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.absenceRequestDetail = async (req, res) => {
    try {
        const { absence_request_id } = req.query;

        const absenceRequest = await db.absence_request.findByPk(absence_request_id, {
            include: [
                {
                    model: db.Absences,
                    as: 'absence',
                    attributes: ['id', 'absence_type', 'absence_logo', 'status'],
                },
                {
                    model: db.User,
                    as: 'workers',
                    attributes: ['id', 'firstname', 'lastname', 'profile_image'],
                    include: [
                        {
                            model: db.Job_title,
                            as: 'job_title',
                            attributes: ['id', 'Job_title'],
                            required: false
                        }
                    ]
                }
            ]
        });

        if (!absenceRequest) return res.status(400).json({ status: 0, message: 'Request Not Found' });

        return res.status(200).json({ status: 1, message: 'Absence Request Detail fetched successfully', data: absenceRequest });

    } catch (error) {
        console.error('Error while fetching absence request detail:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}


exports.approveRejectAbsenceRequest = async (req, res) => {
    try {
        const { absence_request_id, status } = req.body;

        if (req.user?.is_company_active === "Deactive") {
            return res.status(400).json({
                status: 0,
                message: "Your account has been Deactive by the admin.",
            });
        }

        const absenceRequest = await db.absence_request.findByPk(absence_request_id);
        if (!absenceRequest) return res.status(400).json({ status: 0, message: 'Request Not Found' });

        // Update the status of the absence request
        if (status === 'accepted') {
            absenceRequest.request_status = 'accepted';
            await absenceRequest.save();
        } else if (status === 'rejected') {
            absenceRequest.request_status = 'rejected';
            await absenceRequest.save();
        }

        return res.status(200).json({ status: 1, message: `Absence Request ${status} successfully`, data: absenceRequest });

    } catch (error) {
        console.error('Error while approving absence request:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};