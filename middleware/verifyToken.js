const jwt = require('jsonwebtoken');
const db = require('../config/db');

const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers["authorization"];

        if (!authHeader) {
            return res.status(401).json({
                status: 0,
                message: "Authentication failed - Token missing in header",
            });
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            return res.status(401).json({
                status: 0,
                message: "Authentication failed - Token not provided",
            });
        }
        const decoded = jwt.decode(token, { complete: true });
        if (!decoded || !decoded.payload) {
            return res.status(401).json({
                status: 0,
                message: "Invalid token structure",
            });
        }

        const { exp, user_id, token_id } = decoded.payload;
        const currentTime = Math.floor(Date.now() / 1000);

        // Manual expiration check
        if (exp && exp < currentTime) {
            return res.status(401).json({
                status: 0,
                message: "Token has expired",
            });
        }

        let verifiedToken;
        try {
            verifiedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);
        } catch (error) {
            console.error("Error verifying token:", error);
            return res.status(401).json({ status: 0, message: "Invalid token" });
        }

        if (!user_id || !token_id) {
            return res
                .status(401)
                .json({ status: 0, message: "Invalid token payload" });
        }
        const user = await db.User.findByPk(verifiedToken.user_id);
        const tokens = await db.Token.findByPk(verifiedToken.token_id);

        if (!user || !tokens) {
            return res.status(401).json({ status: 0, message: "Unauthorized" });
        }

        req.user = user;
        req.token = tokens;
        next();
    } catch (error) {
        console.error("Error verifying JWT:", error);
        return res
            .status(401)
            .json({ status: 0, message: "Unauthorized" });
    }
};

const checkUserRole = (allowedRoles) => (req, res, next) => {
    if (!allowedRoles.includes(req.user.user_role)) {
        return res.status(403).json({ status: 0, message: 'Access denied.' });
    }
    next();
};

module.exports = { verifyToken, checkUserRole };