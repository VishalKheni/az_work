require('dotenv').config()
const db = require("../../config/db");
const moment = require('moment');
const { validateMobile, } = require('../../helpers/twilio');
const { Op, where, Sequelize, col } = require("sequelize");



exports.addclockEntrry = async (req, res) => {
    try {
        const { project_id, address, latitude, longitude } = req.body;
        const { id: worker_id } = req.user;

        const project = await db.Project.findByPk(project_id);
        if (!project) return res.status(400).json({ status: 0, message: "Project not found" });


        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // Check if there's already a clock-in without a clock-out today
        const existingEntry = await db.Clock_entry.findOne({
            where: {
                worker_id,
                project_id,
                clock_in_time: { [Op.between]: [todayStart, todayEnd] },
                clock_out_time: null
            }
        });

        if (existingEntry) {
            // Perform clock-out
            const now = new Date();
            const durationMs = now - new Date(existingEntry.clock_in_time);
            const hours = Math.floor(durationMs / 3600000);
            const minutes = Math.floor((durationMs % 3600000) / 60000);
            const seconds = Math.floor((durationMs % 60000) / 1000);
            const durationFormatted = `${hours}:${minutes}:${seconds}`;

            const updatedEntry = {
                clock_out_time: now,
                duration: durationFormatted,
                address: address || existingEntry.address,
                latitude: latitude || existingEntry.latitude,
                longitude: longitude || existingEntry.longitude
            }

            await existingEntry.update(updatedEntry);

            return res.json({
                status: 1,
                message: "Clock-out successful",
                data: existingEntry
            });
        } else {
            // Perform clock-in
            const newEntry = await db.Clock_entry.create({
                worker_id,
                project_id,
                date: new Date(),
                clock_in_time: new Date(),
                break_time: "00:00:00",
                address,
                latitude,
                longitude
            });

            return res.json({
                status: 1,
                message: "Clock-in successful",
                data: newEntry
            });
        }
    } catch (error) {
        console.error("Clock toggle error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};



// exports.addclockEntrry = async (req, res) => {
//     try {
//         const { id: user_id, company_id } = req.user;
//         const { project_id, address, latitude, longitude, type } = req.body;

//         let clockEntry;

//         if (type == "clock_in") {
//             clockEntry = await db.Clock_entry.findOne({
//                 where: {
//                     worker_id: user_id,
//                     project_id,
//                     date: moment().toDate(),
//                     type: "clock_in"
//                 }
//             });
//             if (clockEntry) {
//                 return res.status(400).json({
//                     message: "Already clocked in for this date"
//                 });
//             }
//             clockEntry = await db.Clock_entry.create({
//                 worker_id: user_id,
//                 project_id,
//                 date: moment().toDate(),
//                 clock_in_time: moment().toDate(),
//                 address,
//                 latitude,
//                 longitude,
//                 type: "clock_in",
//             });
//         }
//         else if (type === "clock_out") {
//             clockEntry = await db.Clock_entry.findOne({
//                 where: {
//                     worker_id: user_id,
//                     project_id,
//                     date: moment().toDate(),
//                     type: "clock_in"
//                 }
//             });
//             if (clockEntry) {
//                 return res.status(400).json({
//                     message: "Already clocked out for this date"
//                 });
//             }
//             clockEntry = await db.Clock_entry.create({
//                 worker_id: user_id,
//                 project_id,
//                 date: moment().toDate(),
//                 clock_out_time: moment().toDate(),
//                 address,
//                 latitude,
//                 longitude,
//                 type: "clock_out",
//             });
//         }
//         else {
//             return res.status(400).json({
//                 status: 0,
//                 message: "Invalid type"
//             });
//         }
//         // Send a response  
//         return res.status(201).json({
//             status: 1,
//             message: "Clock entry added successfully",
//             data: clockEntry
//         });

//     } catch (error) {
//         console.log("Error in addclockEntrry:", error);
//         return res.status(500).json({ message: "Internal server error" });

//     }
// }


