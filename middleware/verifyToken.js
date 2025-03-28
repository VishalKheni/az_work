const jwt = require('jsonwebtoken');
const { db } = require('../config/db');
const jwtSecretKey = process.env.JWT_SECRET_KEY;

const verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];

        if (!authHeader) {
            return res.status(401).json({ message: 'Authentication failed - Token missing on header' });
        }

        const token = authHeader.split(' ')[1];
        // Verify the token using the JWT secret key
        jwt.verify(token, jwtSecretKey, async (err, decodedToken) => {
            if (err) {
                return res
                    .status(401)
                    .json({ status: 0, message: "Token is not valid!" });
            }
            const tokens = await db.Token.findByPk(decodedToken.token_id);
            console.log(decodedToken)
            if (!tokens) {
                return res.status(401).json({ error: 'Invalid token' });
            }
            let User = await db.User.findOne({
                where: { id: decodedToken.id },
                include: [
                    {
                        model: db.Token,
                        as: "user_tokens",
                        where: { id: decodedToken.token_id }
                    }
                ]
            });
            if (!User) {
                return res.status(401).json({ status: 0, message: "You are not authenticated!" });
            }
            // if (User.is_block == true) {
            //     return res.status(401).json({ status: 0, message: "You are block by admin!" });
            // }
            req.user = User;
            next();
        });
    } catch (error) {
        console.error('Error verifying JWT:', error);
        res.status(401).json({ message: 'Authentication failed' });
    }
};


module.exports = { verifyToken, };