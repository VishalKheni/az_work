require('dotenv').config()
const db = require("../../config/db");
const { validateMobile, } = require('../../helpers/twilio');
const { Op, where, Sequelize, col } = require("sequelize");
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

exports.editCompany = async (req, res) => {
    try {
        const { company_id, industry_id, company_name, email, country_code, iso_code, phone_number, address, owner_phone_number, owner_country_code, owner_iso_code } = req.body;
        const { company_logo } = req.files;

        if (iso_code && phone_number) {
            let valid = await validateMobile(iso_code, phone_number)
            if (valid.status == 0) return res.status(400).json({ message: valid.message });
        }
        if (owner_iso_code && owner_phone_number) {
            let valid = await validateMobile(owner_iso_code, owner_phone_number)
            if (valid.status == 0) return res.status(400).json({ message: valid.message });
        }

        const company = await db.Company.findByPk(company_id);
        if (!company) return res.status(404).json({ status: 0, message: 'Company not found' });
        const owner = await db.User.findByPk(company.owner_id, { attributes: ['id', 'firstname', 'lastname', 'country_code', 'iso_code', 'phone_number', 'updatedAt'] });
        if (!owner) return res.status(400).json({ status: 0, message: 'Owner not found' });

        if (industry_id) {
            const branch = await db.Branch.findByPk(industry_id);
            if (!branch) return res.status(404).json({ status: 0, message: 'Branch not found' });
            await branch.update({ industry_id: branch.id });
        }


        if (company_logo) {
            fs.unlinkSync(`public/${company.company_logo}`);
            await company.update({ company_logo: `company_logo/${company_logo[0].filename}` });
        }

        await company.update({ company_name, email, country_code, iso_code, phone_number, address });
        await owner.update({ country_code: owner_country_code, iso_code: owner_iso_code, phone_number: owner_phone_number });

        return res.status(200).json({
            status: 1,
            message: "Company detail update successfully",
            data: {
                company,
                owner
            }
        });
    } catch (error) {
        console.error('Error while edit company:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}




