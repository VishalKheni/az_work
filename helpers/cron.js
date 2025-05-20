const cron = require('node-cron');
const { Op } = require('sequelize');
const moment = require('moment');
const db = require("../config/db");


const parseBreakTimeToSeconds = (breakTimeStr) => {
    const [hours, minutes, seconds] = breakTimeStr.split(':').map(Number);
    return (hours * 3600) + (minutes * 60) + seconds;
};

const formatSecondsToHHMMSS = (totalSeconds) => {
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
};

// const updateBreakTime = cron.schedule('0 0 * * *', async () => {
const updateBreakTime = cron.schedule('* * * * *', async () => {
    const yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD');

    try {
        const entries = await db.Clock_entry.findAll({
            where: {
                date: yesterday,
                status: "approved",
                clock_out_time: { [Op.not]: null },
                break_time: { [Op.not]: null }
            }
        });

        const workerBreaks = {};

        for (const entry of entries) {
            const breakSeconds = parseBreakTimeToSeconds(entry.break_time);
            if (breakSeconds > 300) { // more than 5 minutes
                const workerId = entry.worker_id;
                if (!workerBreaks[workerId]) workerBreaks[workerId] = 0;
                workerBreaks[workerId] += breakSeconds;
            }
        }

        // Log total break time per worker
        for (const workerId in workerBreaks) {
            const totalBreak = formatSecondsToHHMMSS(workerBreaks[workerId]);
            console.log(`Worker ${workerId} - Total break time > 5 mins: ${totalBreak}`);
        }

    } catch (error) {
        console.error('Cron job error:', error);
    }
});


module.exports = { updateBreakTime };

