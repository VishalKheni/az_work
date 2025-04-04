require('dotenv').config()
const db = require("../../config/db");


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



