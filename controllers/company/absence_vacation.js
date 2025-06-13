require('dotenv').config()
const db = require("../../config/db");
const { validateMobile, } = require('../../helpers/twilio');
const { Op, where, Sequelize, col, literal } = require("sequelize");
let fs = require('fs');
const moment = require('moment');


exports.allAbsenceRequestList = async (req, res) => {
    try {
        let { page, limit, status, search, month, year, filter } = req.query;
        const startDate = moment.utc(`${year}-${month}`, 'YYYY-M').startOf('month').toDate();
        const endDate = moment.utc(`${year}-${month}`, 'YYYY-M').endOf('month').toDate();

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
            worker_id: { [Op.in]: workerIds },
            createdAt: {
                [Op.between]: [startDate, endDate]
            }
        };


        if (search) {
            whereCondition[Op.or] = [
                { '$absence.absence_type$': { [Op.like]: `%${search}%` } },
                { '$workers.firstname$': { [Op.like]: `%${search}%` } },
                { '$workers.lastname$': { [Op.like]: `%${search}%` } },
                literal(`CONCAT(workers.firstname, ' ', workers.lastname) LIKE '%${search}%'`)
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




exports.addCompanyAbsence = async (req, res) => {
    try {
        let { absence_type, status, absence_ids, type } = req.body;
        const absence_logo = req.files?.absence_logo || {};
        const user_id = req.user.id;
        type = parseInt(type);


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

        if (type === 0) {
            const existingAbsence = await db.Absences.findOne({
                where: {
                    user_id,
                    company_id: company.id,
                    absence_type,
                    status,
                },
            });

            if (existingAbsence) {
                return res.status(400).json({
                    status: 0,
                    message: 'Absence with the same type already exists.',
                });
            }

            const newAbsence = await db.Absences.create({
                user_id,
                company_id: company.id,
                absence_type,
                absence_logo: `absence_logo/${absence_logo[0].filename}`,
                status,
            });

            return res.status(201).json({
                status: 1,
                message: 'Absence added successfully',
                data: newAbsence,
            });

        } else if (type === 1) {
            let absence_ids = [];
            absence_ids = JSON.parse(req.body.absence_ids);

            const adminAbsences = await db.Absences.findAll({
                where: {
                    id: absence_ids,
                    created_by_admin: true
                }
            });

            if (adminAbsences.length === 0) {
                return res.status(404).json({ status: 0, message: 'No admin absences found with given IDs' });
            }

            const createdAbsences = [];
            const duplicateAbsences = [];

            for (const a of adminAbsences) {
                const exists = await db.Absences.findOne({
                    where: {
                        user_id,
                        company_id: company.id,
                        absence_type: a.absence_type,
                        status: a.status,
                        admin_absence_id: a.id
                    }
                });

                if (!exists) {
                    const newAbsence = await db.Absences.create({
                        user_id,
                        company_id: company.id,
                        absence_type: a.absence_type,
                        absence_logo: a.absence_logo,
                        status: a.status,
                        admin_absence_id: a.id,
                    });

                    createdAbsences.push(newAbsence);
                } else {
                    duplicateAbsences.push(exists);
                }
            }

            const createdIds = createdAbsences.map(a => a.id);
            const resAbsences = await db.Absences.findAll({
                where: { id: createdIds }
            });

            let message;
            if (createdAbsences.length === 0) {
                message = 'All selected admin absences already exist.';
            } else if (duplicateAbsences.length === 0) {
                message = 'Admin absences added successfully.';
            } else {
                message = 'Admin absences added successfully.';
            }

            return res.status(201).json({
                status: 1,
                message,
                data: resAbsences,
            });
        }
    } catch (error) {
        console.error('Error while adding holiday:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.getCompanyAbsencesList = async (req, res) => {
    try {
        let { page, limit, filter, type } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;
        type = parseInt(type)
        const company = await db.Company.findOne({ where: { owner_id: req.user.id } });
        if (!company) {
            return res.status(400).json({ status: 0, message: 'Company Not Found' });
        }


        var order;
        if (filter === 'id_DESC') {
            order = [['id', 'DESC']];
        } else if (filter === 'absence_type_ASC') {
            order = [['absence_type', 'ASC']];
        } else if (filter === 'paid_ASC') {
            order = [[db.sequelize.literal(`CASE WHEN status = 'paid' THEN 0 ELSE 1 END`), 'ASC'], ['createdAt', 'ASC']];
        } else if (filter === 'unpaid_ASC') {
            order = [[db.sequelize.literal(`CASE WHEN status = 'unpaid' THEN 0 ELSE 1 END`), 'ASC'], ['createdAt', 'ASC']];
        } else if (filter === 'absence_type_DESC') {
            order = [['absence_type', 'DESC']];
        } else if (filter === 'paid_DESC') {
            order = [[db.sequelize.literal(`CASE WHEN status = 'paid' THEN 0 ELSE 1 END`), 'DESC'], ['createdAt', 'DESC']];
        } else if (filter === 'unpaid_DESC') {
            order = [[db.sequelize.literal(`CASE WHEN status = 'unpaid' THEN 0 ELSE 1 END`), 'DESC'], ['createdAt', 'DESC']];
        }

        if (type === 0) {
            var { count: absencescount, rows: absences } = await db.Absences.findAndCountAll({
                where: { user_id: req.user.id, is_deleted: false },
                limit,
                offset,
                order,
            });
            return res.status(200).json({
                status: 1,
                message: "Company absences List fetched successfully",
                pagination: {
                    totalHoliday: absencescount,
                    totalPages: Math.ceil(absencescount / limit),
                    currentPage: page,
                    limit: limit,
                },
                data: absences,
            });
        } else if (type === 1) {
            var { count: admincount, rows: adminAbsences } = await db.Absences.findAndCountAll({
                where: { created_by_admin: true, is_deleted: false },
                attributes: {
                    exclude: ['user_id', 'company_id', 'admin_absence_id'],
                    include: [
                        [
                            db.sequelize.literal(`(
                                CASE WHEN EXISTS (
                                    SELECT * FROM \`tbl_absences\` AS \`user_absences\`
                                    WHERE \`user_absences\`.\`admin_absence_id\` = \`absences_model\`.\`id\`
                                    AND \`user_absences\`.\`user_id\` = ${req.user.id}
                                ) THEN TRUE ELSE FALSE END
                            )`),
                            'is_absences_checked'
                        ]
                    ]
                },
                limit,
                offset,
                order,
            });
            adminAbsences = adminAbsences.map(absence => absence.toJSON());
            const isChecked = adminAbsences.every(item => item.is_absences_checked === 1);
            return res.status(200).json({
                status: 1,
                message: "Admin Absences List fetched successfully",
                pagination: {
                    totalHoliday: admincount,
                    totalPages: Math.ceil(admincount / limit),
                    currentPage: page,
                    limit: limit,
                },
                is_all_checked: isChecked,
                data: adminAbsences,
            });
        }


    } catch (error) {
        console.error('Error while fetching holidays:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.editCompanyAbsences = async (req, res) => {
    try {
        const { absence_id, absence_type, status } = req.body;
        const { absence_logo } = req.files;
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

        const absence = await db.Absences.findOne({ where: { id: absence_id, user_id: req.user.id } });
        if (!absence) return res.status(404).json({ status: 0, message: 'Absence Not Found' });

        const duplicateAbsence = await db.Absences.findOne({
            where: {
                id: { [db.Sequelize.Op.ne]: absence_id },
                user_id: req.user.id,
                company_id: company.id,
                absence_type,
                status
            },
        });

        if (duplicateAbsence) {
            return res.status(400).json({
                status: 0,
                message: "Absence with the same type and status already exists.",
            });
        }

        if (req.files && absence_logo) {
            // if (absence.absence_logo) { fs.unlinkSync(`public/${absence.absence_logo}`) }
            absence.absence_logo = `absence_logo/${absence_logo[0].filename}`;
            await absence.save();
        }

        await absence.update({ absence_type, status });
        return res.status(201).json({ status: 1, message: 'Absence update successfully', data: absence });
    } catch (error) {
        console.error('Error while edit absence:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};

exports.deleteCompanyAbsences = async (req, res) => {
    try {
        const { absence_id } = req.query;
        if (req.user?.is_company_active === "Deactive") {
            return res.status(400).json({
                status: 0,
                message: "Your account has been Deactive by the admin.",
            });
        }
        const absence = await db.Absences.findOne({ where: { id: absence_id, user_id: req.user.id } });
        if (!absence) return res.status(404).json({ status: 0, message: 'Absence Not Found' });
        await absence.update({ is_deleted: true });
        return res.status(201).json({ status: 1, message: 'Absence deleted successfully' });
    } catch (error) {
        console.error('Error while delete absence:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
};
