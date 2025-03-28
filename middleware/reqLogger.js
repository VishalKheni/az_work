const { reqInfo } = require('../helpers/winstone');

const requestLogger = (req, res, next) => {
    reqInfo(req);
    next();
};

module.exports = requestLogger;