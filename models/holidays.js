module.exports = (sequelize, DataTypes, Model) => {
    const Holiday = sequelize.define('holiday_model', {
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'tbl_users', key: 'id' },
            onDelete: 'CASCADE'
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'tbl_company', key: 'id' },
            onDelete: 'CASCADE'
        },
        holiday_name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        day: {
            type: DataTypes.STRING,
            allowNull: true
        },
        created_by_admin: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
    }, {
        tableName: "tbl_holidays",
        timestamps: true,
    });
    return Holiday;
}