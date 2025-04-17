require('dotenv').config()
const db = require("../../config/db");
const moment = require('moment');
const { validateMobile, } = require('../../helpers/twilio');
const { Op, where, Sequelize, col } = require("sequelize");


exports.addclockEntrry = async (req, res) => {
    try {
        const { id: user_id, company_id } = req.user;
        const { project_id, date, clock_in_time, clock_out_time, address, latitude, longitude, type, reason } = req.body;

        let clockEntry;

        if (type == "clock_in") {
            clockEntry = await db.Clock_entry.findOne({
                where: {
                    worker_id: user_id,
                    project_id,
                    date: moment().toDate(),
                    type: "clock_in"
                }
            });
            if (clockEntry) {
                return res.status(400).json({
                    message: "Already clocked in for this date"
                });
            }
            clockEntry = await db.Clock_entry.create({
                worker_id: user_id,
                project_id,
                date: moment().toDate(),
                clock_in_time: moment().toDate(),
                address,
                latitude,
                longitude,
                type: "clock_in",
            });
        }
        else if (type === "clock_out") {
            clockEntry = await db.Clock_entry.findOne({
                where: {
                    worker_id: user_id,
                    project_id,
                    date: moment().toDate(),
                    type: "clock_in"
                }
            });
            if (clockEntry) {
                return res.status(400).json({
                    message: "Already clocked out for this date"
                });
            }
            clockEntry = await db.Clock_entry.create({
                worker_id: user_id,
                project_id,
                date: moment().toDate(),
                clock_out_time: moment().toDate(),
                address,
                latitude,
                longitude,
                type: "clock_out",
            });
        }
        else {
            return res.status(400).json({
                status: 0,
                message: "Invalid type"
            });
        }
        // Send a response  
        return res.status(201).json({
            status: 1,
            message: "Clock entry added successfully",
            data: clockEntry
        });

    } catch (error) {
        console.log("Error in addclockEntrry:", error);
        return res.status(500).json({ message: "Internal server error" });

    }
}