module.exports = (sequelize, DataTypes, Model) => {
    const Token = sequelize.define('token_model', {
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'tbl_users', key: 'id' },
            onDelete: 'CASCADE'
        },
        device_token: {
            type: DataTypes.STRING,
            allowNull: false
        },
        device_id: {
            type: DataTypes.STRING,
        },
        device_type: {
            type: DataTypes.ENUM('Android', 'iOS', 'Web'),
        },
        refresh_token: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        token_expire_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    }, {
        tableName: "tbl_tokens",
        timestamps: true,
    });
    return Token;
}