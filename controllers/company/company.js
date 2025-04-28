require('dotenv').config()
const db = require("../../config/db");
const { validateMobile, } = require('../../helpers/twilio');
const { Op, where, Sequelize, col } = require("sequelize");
let fs = require('fs');
const moment = require('moment');


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
                    attributes: ['id', 'firstname', 'lastname', 'email', 'country_code', 'iso_code', 'phone_number']
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
        const { company_id, industry_id, company_name, email, country_code, iso_code, phone_number, address, owner_phone_number, owner_country_code, owner_iso_code, owner_firstname, owner_lastname } = req.body;
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
        const owner = await db.User.findByPk(company.owner_id, { attributes: ['id', 'firstname', 'lastname', 'email', 'country_code', 'iso_code', 'phone_number', 'updatedAt'] });
        if (!owner) return res.status(400).json({ status: 0, message: 'Owner not found' });

        if (industry_id) {
            const branch = await db.Branch.findByPk(industry_id);
            if (!branch) return res.status(404).json({ status: 0, message: 'Industry not found' });
            await company.update({ industry_id: branch.id });
        }

        if (company_logo) {
            fs.unlinkSync(`public/${company.company_logo}`);
            await company.update({ company_logo: `company_logo/${company_logo[0].filename}` });
        }

        await company.update({ company_name, country_code, iso_code, phone_number, address });
        await owner.update({ firstname: owner_firstname, lastname: owner_lastname, email, country_code: owner_country_code, iso_code: owner_iso_code, phone_number: owner_phone_number });

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



exports.getCompanyMonthlyHours = async (req, res) => {
    try {
        const { year } = req.query;

        const company = await db.Company.findOne({
            where: { owner_id: req.user.id },
            include: [
                {
                    model: db.Branch,
                    as: 'industry'
                },
                {
                    model: db.User,
                    as: 'users',
                    attributes: ['id', 'company_id']
                }
            ]
        });
console.log('company', company)
        if (!company) {
            return res.status(404).json({ message: "Company not found." });
        }

        const branchMonthlyHours = parseFloat(company?.industry?.monthly_hours || 0);
        const workerIds = company.users.map(user => user.id); // extract all worker ids
        console.log('workerIds', workerIds)
        const results = [];

        for (let month = 0; month < 12; month++) {
            const startOfMonth = moment.utc({ year, month, day: 1 }).startOf('month').toDate();
            const endOfMonth = moment.utc({ year, month, day: 1 }).endOf('month').toDate();

            var workedHoursData = await db.Clock_entry.findAll({
                where: {
                    worker_id: { [Op.in]: workerIds },
                    date: { [Op.between]: [startOfMonth, endOfMonth] },
                },
                // attributes: [
                //     [
                //         db.Sequelize.literal(`
                //             COALESCE(SUM(
                //                 CASE
                //                     WHEN duration IS NOT NULL AND duration != '' THEN TIME_TO_SEC(duration)
                //                     ELSE 0
                //                 END
                //             ), 0)
                //         `),
                //         'total_hours'
                //     ]
                // ],
                raw: true,
            });

            const totalWorkingHoursInSeconds = parseFloat(workedHoursData[0]?.total_hours || 0);
            const totalWorkingHours = (totalWorkingHoursInSeconds / 3600).toFixed(2);
            const overtime = totalWorkingHours > branchMonthlyHours ? Math.round(totalWorkingHours - branchMonthlyHours) : 0;

            results.push({
                month: moment().month(month).format("MMMM"),
                monthly_hour: parseInt(branchMonthlyHours),
                total_working_hours: parseInt(totalWorkingHours),
                over_time: overtime,
            });
        }

        return res.status(200).json({
            status: 1,
            message: "Company Working Hours fetched successfully",
            workedHoursData,
            working_hours: results
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 0, message: "Internal server error" });
    }
};
