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

const updateBreakTime = cron.schedule('0 0 * * *', async () => {
    // const updateBreakTime = cron.schedule('* * * * *', async () => {
    console.log("update break time cron job running");
    const yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD');

    try {
        const entries = await db.Clock_entry.findAll({
            where: {
                date: yesterday,
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
            await db.Clock_entry.update(
                { break_time: totalBreak },
                { where: { worker_id: workerId, date: yesterday } }
            );
            console.log(`Worker ${workerId} - Total break time > 5 mins: ${totalBreak}`);
        }

    } catch (error) {
        console.error('Cron job error:', error);
    }
});


// const addWorkbalance = cron.schedule('* * * * *', async () => {
// const addWorkbalance = cron.schedule('0 0 28-31 * *', async () => {
const addWorkbalance = cron.schedule('0 0 * * *', async () => {
    console.log("Add work balance cron job running");

    try {
        const today = moment();
        // const today = moment("31/05/2025", "DD/MM/YYYY");

        if (today.date() === today.clone().endOf('month').date()) {
            const workers = await db.User.findAll({ where: { user_role: "worker" } });

            for (const worker of workers) {
                const company = await db.Company.findOne({ where: { id: worker.company_id } });
                // const branch = await db.Branch.findOne({ where: { id: company.industry_id } });
                const totalMonthlyHours = parseFloat(company?.monthly_hours)

                const entries = await db.Clock_entry.findAll({
                    where: {
                        worker_id: worker.id,
                        date: {
                            [Op.between]: [
                                today.clone().startOf('month').format('YYYY-MM-DD'),
                                today.clone().endOf('month').format('YYYY-MM-DD')
                            ]
                        }
                    }
                });

                let totalSeconds = 0;
                entries.forEach(entry => {
                    const [hh, mm, ss] = entry.duration.split(':').map(Number);
                    totalSeconds += (hh * 3600) + (mm * 60) + ss;
                });

                // Convert to total rounded hours
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const totalRoundedHours = hours + (minutes >= 30 ? 1 : 0);
                const monthBalance = totalRoundedHours - totalMonthlyHours;

                // Get current balance from DB
                const currentBalance = worker.work_balance || 0;
                const newBalance = currentBalance + monthBalance;
                await db.User.update({ work_balance: newBalance }, { where: { id: worker.id } });

                console.log(`Worker ID: ${worker.id}, Worked: ${totalRoundedHours}, Monthly Required: ${totalMonthlyHours}, Monthly Balance: ${monthBalance}, New Total Balance: ${newBalance}`);

                // const balance = totalRoundedHours - totalMonthlyHours;
                // await db.User.update({ work_balance: balance }, { where: { id: worker.id } });
                // console.log(`Worker ID: ${worker.id}, Total Work Rounded Hours:${totalRoundedHours} hours balance:${balance} monthly hours:${totalMonthlyHours} `);
            }
        }
    } catch (error) {
        console.error('Cron job error:', error);
    }
});

module.exports = { updateBreakTime, addWorkbalance };

