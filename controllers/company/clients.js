require('dotenv').config()
const db = require("../../config/db");
const moment = require('moment');
const { validateMobile, } = require('../../helpers/twilio');
const { Op, where, Sequelize, col } = require("sequelize");


exports.addClient = async (req, res) => {
    try {
        const { iso_code, phone_number } = req.body;

        const company = await db.Company.findOne({ where: { owner_id: req.user.id } });
        if (!company) {
            return res.status(400).json({ status: 0, message: 'Company Not Found' });
        }

        let valid = await validateMobile(iso_code, phone_number);
        if (valid.status == 0) {
            return res.status(400).json({ message: valid.message });
        }

        const client = await db.Client.create({ company_id: company.id, ...req.body });

        return res.status(201).json({
            status: 1,
            message: "Client added successfully",
            data: client
        });

    } catch (error) {
        console.error('Error while add client detail:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}

exports.editClient = async (req, res) => {
    try {
        const { client_id, iso_code, phone_number } = req.body;

        const client = await db.Client.findByPk(client_id)
        if (!client) {
            return res.status(400).json({ status: 0, message: 'Client Not Found' });
        }

        if (phone_number) {
            let valid = await validateMobile(iso_code, phone_number);
            if (valid.status == 0) {
                return res.status(400).json({ message: valid.message });
            }
        }

        await client.update({ ...req.body });

        return res.status(200).json({
            status: 1,
            message: "Client update successfully",
            data: client
        });

    } catch (error) {
        console.error('Error while add client detail:', error);
        return res.status(500).json({ status: 0, message: 'Internal server error' });
    }
}
