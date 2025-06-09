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
                const totalRoundedHours = hours + (minutes >= 60 ? 1 : 0);
                const monthBalance = totalRoundedHours - totalMonthlyHours;

                // Get current balance from DB
                const currentBalance = worker.work_balance || 0;
                const newBalance = currentBalance + monthBalance;
                await db.User.update({ work_balance: newBalance }, { where: { id: worker.id } });

                console.log(`Worker ID: ${worker.id}, Worked: ${totalRoundedHours}, Monthly Required: ${totalMonthlyHours}, Monthly Balance: ${monthBalance}, New Total Balance: ${newBalance}`);
            }
        }
    } catch (error) {
        console.error('Cron job error:', error);
    }
});


const updateBreakTime = cron.schedule('55 23 * * *', async () => {
    // const updateBreakTime = cron.schedule('* * * * *', async () => {
    console.log("update break time cron job running");

    const today = moment().format('YYYY-MM-DD');

    try {
        const entries = await db.Clock_entry.findAll({
            where: {
                date: today,
                clock_in_time: { [Op.not]: null },
                clock_out_time: { [Op.not]: null },
            },
            order: [['worker_id', 'ASC'], ['clock_in_time', 'ASC']],
        });

        const groupedEntries = {};

        // Group by worker_id
        for (const entry of entries) {
            const workerId = entry.worker_id;
            if (!groupedEntries[workerId]) groupedEntries[workerId] = [];
            groupedEntries[workerId].push(entry);
        }

        for (var workerId in groupedEntries) {
            const logs = groupedEntries[workerId];
            var totalBreakSeconds = 0;

            for (let i = 0; i < logs.length - 1; i++) {
                const current = logs[i];
                const next = logs[i + 1];

                const currentOut = moment(current.clock_out_time);
                const nextIn = moment(next.clock_in_time);

                console.log(`Entry ${current.id} out: ${currentOut.format()}, Entry ${next.id} in: ${nextIn.format()}`);

                const breakSeconds = nextIn.diff(currentOut, 'seconds');
                console.log(`Break seconds: ${breakSeconds}`);

                if (breakSeconds >= 300) {
                    totalBreakSeconds += breakSeconds;
                    console.log(`Adding break for Worker ${workerId}: ${breakSeconds} seconds`);
                }
            }


            // Removed your original second break check since it's redundant or incorrect
        }

        const formattedTotalBreak = formatSecondsToHHMMSS(totalBreakSeconds);
        await db.Clock_entry.update(
            { break_time: formattedTotalBreak },
            {
                where: {
                    worker_id: workerId,
                    date: today
                }
            }
        );

        console.log(`Worker ${workerId} - Total break time for the day: ${formattedTotalBreak}`);

    } catch (error) {
        console.error('Cron job error:', error);
    }
});







// const updateBreakTime = cron.schedule('55 23 * * *', async () => {
// const updateBreakTime = cron.schedule('* * * * *', async () => {
//     console.log("update break time cron job running");
//     const today = moment();
//     try {
//         const entries = await db.Clock_entry.findAll({
//             where: {
//                 date: today,
//                 clock_in_time: { [Op.not]: null },
//                 clock_out_time: { [Op.not]: null },
//             },
//             order: [['worker_id', 'ASC'], ['clock_in_time', 'ASC']],
//         });

//         const groupedEntries = {};

//         // Group entries by worker_id
//         for (const entry of entries) {
//             const workerId = entry.worker_id;
//             if (!groupedEntries[workerId]) groupedEntries[workerId] = [];
//             groupedEntries[workerId].push(entry);
//         }

//         // For each worker's entries, calculate break_time
//         for (const workerId in groupedEntries) {
//             const logs = groupedEntries[workerId];

//             for (let i = 1; i < logs.length; i++) {
//                 const prevEntry = logs[i - 1];
//                 const currEntry = logs[i];

//                 if (prevEntry.clock_out_time && currEntry.clock_in_time) {
//                     const prevOut = moment(prevEntry.clock_out_time, 'HH:mm:ss');
//                     const currIn = moment(currEntry.clock_in_time, 'HH:mm:ss');
//                     const breakSeconds = currIn.diff(prevOut, 'seconds');

//                     if (breakSeconds > 300) {
//                         const formattedBreak = formatSecondsToHHMMSS(breakSeconds);

//                         await db.Clock_entry.update(
//                             { break_time: formattedBreak },
//                             { where: { id: currEntry.id } }
//                         );
//                         console.log(`Worker ${workerId} - Break between entry ${prevEntry.id} and ${currEntry.id}: ${formattedBreak}`);
//                     }
//                 }
//             }
//         }

//     } catch (error) {
//         console.error('Cron job error:', error);
//     }
// });




// const updateBreakTime = cron.schedule('55 23 * * *', async () => {
// const updateBreakTimev1 = cron.schedule('* * * * *', async () => {

//     console.log("update break time cron job running");

//     const today = moment().format('YYYY-MM-DD');

//     try {
//         const entries = await db.Clock_entry.findAll({
//             where: {
//                 date: today,
//                 clock_in_time: { [Op.not]: null },
//                 clock_out_time: { [Op.not]: null },
//             },
//             order: [['worker_id', 'ASC'], ['clock_in_time', 'ASC']],
//         });

//         const groupedEntries = {};

//         // Group entries by worker_id
//         for (const entry of entries) {
//             const workerId = entry.worker_id;
//             if (!groupedEntries[workerId]) groupedEntries[workerId] = [];
//             groupedEntries[workerId].push(entry);
//         }

//         for (const workerId in groupedEntries) {
//             const logs = groupedEntries[workerId];
//             let totalBreakSeconds = 0;

//             for (let i = 1; i < logs.length; i++) {
//                 const prevEntry = logs[i - 1];
//                 const currEntry = logs[i];

//                 if (prevEntry.clock_out_time && currEntry.clock_in_time) {
//                     const prevOut = moment(prevEntry.clock_out_time, 'HH:mm:ss');
//                     const currIn = moment(currEntry.clock_in_time, 'HH:mm:ss');
//                     const breakSeconds = currIn.diff(prevOut, 'seconds');

//                     if (breakSeconds >= 300) { // ≥ 5 min
//                         totalBreakSeconds += breakSeconds;
//                         const formattedTotalBreak = formatSecondsToHHMMSS(totalBreakSeconds);
//                         console.log('formattedTotalBreak', formattedTotalBreak)
//                         await db.Clock_entry.update(
//                             { break_time: formattedTotalBreak },
//                             {
//                                 where: {
//                                     worker_id: workerId,
//                                     date: today
//                                 }
//                             }
//                         );

//                         console.log(`Worker ${workerId} - Total break time for the day: ${formattedTotalBreak}`);

//                         // const formattedBreak = formatSecondsToHHMMSS(breakSeconds);

//                         // await db.Clock_entry.update(
//                         //     { break_time: formattedBreak },
//                         //     { where: { id: currEntry.id } }
//                         // );

//                         // console.log(`Worker ${workerId} - Break between entry ${prevEntry.id} and ${currEntry.id}: ${formattedBreak}`);
//                     }
//                 }
//             }

//             // Update total break time in all entries for this worker on this date
//         }

//     } catch (error) {
//         console.error('Cron job error:', error);
//     }
// });


// const updateBreakTime = cron.schedule('55 23 * * *', async () => {
//     // const updateBreakTime = cron.schedule('* * * * *', async () => {
//     console.log("update break time cron job running");

//     const today = moment().format('YYYY-MM-DD');

//     try {
//         const entries = await db.Clock_entry.findAll({
//             where: {
//                 date: today,
//                 clock_in_time: { [Op.not]: null },
//                 clock_out_time: { [Op.not]: null },
//             },
//             order: [['worker_id', 'ASC'], ['clock_in_time', 'ASC']],
//         });

//         const groupedEntries = {};

//         // Group by worker_id
//         for (const entry of entries) {
//             const workerId = entry.worker_id;
//             if (!groupedEntries[workerId]) groupedEntries[workerId] = [];
//             groupedEntries[workerId].push(entry);
//         }

//         for (const workerId in groupedEntries) {
//             const logs = groupedEntries[workerId];
//             let totalBreakSeconds = 0;

//             for (let i = 0; i < logs.length - 1; i++) {
//                 const current = logs[i];
//                 const next = logs[i + 1];

//                 const currentOut = moment(current.clock_out_time, 'HH:mm:ss');
//                 const nextOut = moment(next.clock_out_time, 'HH:mm:ss');

//                 // First break: clock_out(i) to clock_out(i+1)
//                 const break1Seconds = nextOut.diff(currentOut, 'seconds');
//                 if (break1Seconds >= 300) {
//                     totalBreakSeconds += break1Seconds;
//                     console.log(`Break 1 for Worker ${workerId}: ${break1Seconds} seconds`);
//                 }

//                 if (i + 2 < logs.length) {
//                     const nextIn = moment(logs[i + 2].clock_in_time, 'HH:mm:ss');

//                     // Second break: clock_out(i+1) to clock_in(i+2)
//                     const break2Seconds = nextIn.diff(nextOut, 'seconds');
//                     if (break2Seconds >= 300) {
//                         totalBreakSeconds += break2Seconds;
//                         console.log(`Break 2 for Worker ${workerId}: ${break2Seconds} seconds`);
//                     }
//                 }
//             }

//             // Format and update total break time for all worker's entries on this day
//             const formattedTotalBreak = formatSecondsToHHMMSS(totalBreakSeconds);
//             await db.Clock_entry.update(
//                 { break_time: formattedTotalBreak },
//                 {
//                     where: {
//                         worker_id: workerId,
//                         date: today
//                     }
//                 }
//             );

//             console.log(`Worker ${workerId} - Total break time for the day: ${formattedTotalBreak}`);
//         }

//     } catch (error) {
//         console.error('Cron job error:', error);
//     }
// });


// const updateBreakTime = cron.schedule('0 0 * * *', async () => {
//     // const updateBreakTime = cron.schedule('* * * * *', async () => {
//     console.log("update break time cron job running");
//     const yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD');

//     try {
//         const entries = await db.Clock_entry.findAll({
//             where: {
//                 date: yesterday,
//                 clock_out_time: { [Op.not]: null },
//                 break_time: { [Op.not]: null }
//             }
//         });

//         const workerBreaks = {};

//         for (const entry of entries) {
//             const breakSeconds = parseBreakTimeToSeconds(entry.break_time);
//             if (breakSeconds > 300) { // more than 5 minutes
//                 const workerId = entry.worker_id;
//                 if (!workerBreaks[workerId]) workerBreaks[workerId] = 0;
//                 workerBreaks[workerId] += breakSeconds;
//             }
//         }

//         // Log total break time per worker
//         for (const workerId in workerBreaks) {
//             const totalBreak = formatSecondsToHHMMSS(workerBreaks[workerId]);
//             await db.Clock_entry.update(
//                 { break_time: totalBreak },
//                 { where: { worker_id: workerId, date: yesterday } }
//             );
//             console.log(`Worker ${workerId} - Total break time > 5 mins: ${totalBreak}`);
//         }

//     } catch (error) {
//         console.error('Cron job error:', error);
//     }
// });






module.exports = { updateBreakTime, addWorkbalance };

