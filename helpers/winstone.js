const winston = require("winston");
const moment = require('moment-timezone')
const timeFormat = moment().format('DD-MM-YYYY hh:mm:ss A')
const colorizer = winston.format.colorize()
const Winston = {
    level: "debug"
}
const timeZone = "Asia/Calcutta"

let logColor = {
    colors: {
        error: "red",
        warn: "magenta",
        info: "yellow",
        http: "green",
        debug: "cyan"
    }
}
let name = 'AZ Work'
winston.addColors(logColor)

let alignColorsAndTime = winston.format.combine(
    winston.format.colorize({
        all: true
    }),
    winston.format.timestamp({
        format: timeFormat
    }),
    winston.format.json(),
    winston.format.printf(
        info => `\x1b[96m[${name}]` + " " + `\x1b[95m${moment.tz(timeZone)}` + " " + colorizer.colorize(winston.level, `- ${info.level}:${info.message}`)
    )
)

const logger = winston.createLogger({
    level: Winston.level,
    transports: [
        new winston.transports.Http({
            level: 'warn',
            format: winston.format.json()
        }),
        new (winston.transports.Console)({
            format: alignColorsAndTime,
        })
    ]

})

const reqInfo = async function (req) {

    let spliteResult = req.header('User-Agent').split("(").toString().split(")")

    let browserName = spliteResult[spliteResult.length - 1]

    spliteResult = spliteResult[0].split(",")

    let osName = spliteResult[1]

    logger.http(`${req.method} ${req.headers.host}${req.originalUrl} \x1b[33m device os => [${osName}] \x1b[1m\x1b[37mip address => ${req.ip} \x1b[36m browser => ${browserName}`)
}

module.exports = { reqInfo, logger };