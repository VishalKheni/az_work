const { Op } = require("sequelize");

module.exports = (sequelize, DataTypes, Model) => {
    const Otp = sequelize.define('otp_model', {
        email: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        otp: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
    }, {
        tableName: "tbl_otp",
        timestamps: true,
        hooks: {
            afterCreate: async (record) => {
                // Automatically clean up expired records
                const oneMinuteAgo = new Date(new Date() - 1 * 60 * 1000);
                await Otp.destroy({
                    where: {
                        updatedAt: {
                            [Op.lt]: oneMinuteAgo
                        }
                    }
                });
            },
            afterUpdate: async (record) => {
                // Optionally clean up expired records after update
                const oneMinuteAgo = new Date(new Date() - 1 * 60 * 1000);
                await Otp.destroy({
                    where: {
                        updatedAt: {
                            [Op.lt]: oneMinuteAgo
                        }
                    }
                });
            }
        }
    });
    return Otp;
}
