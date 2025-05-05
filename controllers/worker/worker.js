require('dotenv').config()
const db = require("../../config/db");
const moment = require('moment');
const { validateMobile, } = require('../../helpers/twilio');
const { Op, where, Sequelize, col } = require("sequelize");



// exports.addclockEntrry = async (req, res) => {
//     try {
//         const { project_id, address, latitude, longitude } = req.body;
//         const { id: worker_id } = req.user;

//         const project = await db.Project.findByPk(project_id);
//         if (!project) return res.status(400).json({ status: 0, message: "Project not found" });


//         const todayStart = new Date();
//         todayStart.setHours(0, 0, 0, 0);

//         const todayEnd = new Date();
//         todayEnd.setHours(23, 59, 59, 999);

//         // Check if there's already a clock-in without a clock-out today
//         const existingEntry = await db.Clock_entry.findOne({
//             where: {
//                 worker_id,
//                 project_id,
//                 clock_in_time: { [Op.between]: [todayStart, todayEnd] },
//                 clock_out_time: null
//             }
//         });

//         if (existingEntry) {
//             // Perform clock-out
//             const now = new Date();
//             const durationMs = now - new Date(existingEntry.clock_in_time);
//             const hours = Math.floor(durationMs / 3600000);
//             const minutes = Math.floor((durationMs % 3600000) / 60000);
//             const seconds = Math.floor((durationMs % 60000) / 1000);
//             const durationFormatted = `${hours}:${minutes}:${seconds}`;

//             const updatedEntry = {
//                 clock_out_time: now,
//                 duration: durationFormatted,
//                 address: address || existingEntry.address,
//                 latitude: latitude || existingEntry.latitude,
//                 longitude: longitude || existingEntry.longitude
//             }

//             await existingEntry.update(updatedEntry);

//             return res.json({
//                 status: 1,
//                 message: "Clock-out successful",
//                 data: existingEntry
//             });
//         } else {
//             // Perform clock-in
//             const newEntry = await db.Clock_entry.create({
//                 worker_id,
//                 project_id,
//                 date: new Date(),
//                 clock_in_time: new Date(),
//                 break_time: "00:00:00",
//                 address,
//                 latitude,
//                 longitude
//             });

//             return res.json({
//                 status: 1,
//                 message: "Clock-in successful",
//                 data: newEntry
//             });
//         }
//     } catch (error) {
//         console.error("Clock toggle error:", error);
//         res.status(500).json({ message: "Internal server error" });
//     }
// };




function addDurations(time1, time2) {
    const [h1, m1, s1] = time1.split(':').map(Number);
    const [h2, m2, s2] = time2.split(':').map(Number);

    let totalSeconds = h1 * 3600 + m1 * 60 + s1 + h2 * 3600 + m2 * 60 + s2;

    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    totalSeconds %= 3600;
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
}

exports.addclockEntrry = async (req, res) => {
    try {
        const { project_id, type, clock_in_address, clock_out_address, latitude, longitude } = req.body;
        const { id: worker_id } = req.user;

        const now = new Date();

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const project = await db.Project.findByPk(project_id);
        if (!project) {
            return res.status(400).json({ status: 0, message: "Project not found" });
        }

        if (type === 'clock_in') {
            // Check last completed clock entry
            const lastEntry = await db.Clock_entry.findOne({
                where: {
                    worker_id,
                    clock_in_time: { [Op.between]: [todayStart, todayEnd] },
                    clock_out_time: { [Op.ne]: null }
                },
                order: [['clock_out_time', 'DESC']]
            });

            let breakDuration = "00:00:00";

            if (lastEntry) {
                const breakMs = now - new Date(lastEntry.clock_out_time);
                const h = String(Math.floor(breakMs / 3600000)).padStart(2, '0');
                const m = String(Math.floor((breakMs % 3600000) / 60000)).padStart(2, '0');
                const s = String(Math.floor((breakMs % 60000) / 1000)).padStart(2, '0');
                breakDuration = `${h}:${m}:${s}`;
            }

            // Sum today's total break time so far
            const todayEntries = await db.Clock_entry.findAll({
                where: {
                    worker_id,
                    date: { [Op.between]: [todayStart, todayEnd] }
                }
            });

            const totalBreak = todayEntries.reduce((acc, entry) => {
                return addDurations(acc, entry.break_time || "00:00:00");
            }, "00:00:00");

            const newBreakTime = addDurations(totalBreak, breakDuration);

            // Create new entry
            const newEntry = await db.Clock_entry.create({
                worker_id,
                project_id,
                date: now,
                clock_in_time: now,
                clock_in_address,
                latitude,
                longitude,
                break_time: newBreakTime
            });

            return res.json({ status: 1, message: "Clock-in successful", data: newEntry });

        } else if (type === 'clock_out') {
            // Find open clock entry
            const openEntry = await db.Clock_entry.findOne({
                where: {
                    worker_id,
                    clock_in_time: { [Op.between]: [todayStart, todayEnd] },
                    clock_out_time: null
                },
                order: [['clock_in_time', 'DESC']]
            });

            if (!openEntry) {
                return res.status(400).json({ status: 0, message: "No open clock-in entry for today" });
            }

            // Calculate session duration
            const durationMs = now - new Date(openEntry.clock_in_time);
            const h = String(Math.floor(durationMs / 3600000)).padStart(2, '0');
            const m = String(Math.floor((durationMs % 3600000) / 60000)).padStart(2, '0');
            const s = String(Math.floor((durationMs % 60000) / 1000)).padStart(2, '0');
            const sessionDuration = `${h}:${m}:${s}`;

            await openEntry.update({
                clock_out_time: now,
                clock_out_address,
                duration: sessionDuration,
                latitude,
                longitude
            });

            return res.json({ status: 1, message: "Clock-out successful", data: openEntry });
        }

        return res.status(400).json({ status: 0, message: "Invalid type. Must be 'clock_in' or 'clock_out'" });

    } catch (error) {
        console.error("Clock toggle error:", error);
        return res.status(500).json({ message: "Internal server error" });
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


