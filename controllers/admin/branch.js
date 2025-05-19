require('dotenv').config()
const db = require("../../config/db");


exports.addBranch = async (req, res) => {
    try {
        const user_id = req.user.id;

        const { branch_name, weekly_hours, monthly_hours, yearly_hours } = req.body;
        const findBranch = await db.Branch.findOne({
            where: { user_id, branch_name },
        });
        if (findBranch) {
            return res.status(400).json({ status: 0, message: 'Branch already exists' });
        }

        const branch = await db.Branch.create({
            user_id,
            branch_name,
            weekly_hours,
            monthly_hours,
            yearly_hours,
        });

        return res.status(201).json({ status: 1, message: 'Branch added successfully', data: branch });

    } catch (error) {
        console.error('Error while adding branch:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}

exports.allBranchList = async (req, res) => {
    let { page, limit, filter } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const offset = (page - 1) * limit;


    let order;
    if (filter === 'id_ASC') {
        order = [['createdAt', 'ASC']];
    } if (filter === 'id_DESC') {
        order = [['createdAt', 'DESC']];
    } else if (filter === 'branch_ASC') {
        order = [['branch_name', 'ASC']];
    } else if (filter === 'branch_DESC') {
        order = [['branch_name', 'DESC']];
    } else if (filter === 'weekly_hours_ASC') {
        order = [['weekly_hours', 'ASC']];
    } else if (filter === 'weekly_hours_DESC') {
        order = [['weekly_hours', 'DESC']];
    } else if (filter === 'monthly_hours_ASC') {
        order = [['monthly_hours', 'ASC']];
    } else if (filter === 'monthly_hours_DESC') {
        order = [['monthly_hours', 'DESC']];
    } else if (filter === 'yearly_hours_ASC') {
        order = [['yearly_hours', 'ASC']];
    } else if (filter === 'yearly_hours_DESC') {
        order = [['yearly_hours', 'DESC']];
    }

    try {
        const { count, rows: branch } = await db.Branch.findAndCountAll({
            where: { user_id: req.user.id },
            limit,
            offset,
            order
        })

        return res.status(200).json({
            status: 1,
            message: "Branch List fetched Successfully",
            pagination: {
                totalBranch: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                limit: limit,
            },
            data: branch,
        });
    } catch (error) {
        console.error('Error while signup:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }

}

exports.editBranch = async (req, res) => {
    const { branch_id, branch_name, weekly_hours, monthly_hours, yearly_hours } = req.body;

    try {
        const branch = await db.Branch.findByPk(branch_id);
        if (!branch) {
            return res.status(400).json({ status: 0, message: 'Branch Not Found' });
        }

        await branch.update({
            branch_name,
            weekly_hours,
            monthly_hours,
            yearly_hours,
        })

        return res.status(200).json({ status: 1, message: 'Branch update successfully', data: branch });

    } catch (error) {
        console.error('Error while adding branch:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}

exports.deleteBranch = async (req, res) => {
    const { branch_id } = req.query;

    try {
        const branch = await db.Branch.findByPk(branch_id);
        if (!branch) {
            return res.status(400).json({ status: 0, message: 'Branch Not Found' });
        }
        await branch.destroy();
        return res.status(200).json({ status: 1, message: 'Branch deleted successfully' });

    } catch (error) {
        console.error('Error while edit branch:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}
