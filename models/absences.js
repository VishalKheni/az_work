module.exports = (sequelize, DataTypes, Model) => {
    const Absences = sequelize.define('absences_model', {
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
        admin_absence_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'tbl_absences', key: 'id' },
            onDelete: 'CASCADE'
        },
        absence_type: {
            type: DataTypes.STRING,
            allowNull: true
        },
        absence_logo: {
            type: DataTypes.STRING,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('paid', 'unpaid'),
        },
        created_by_admin: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
    }, {
        tableName: "tbl_absences",
        timestamps: true,
    });
    return Absences;
}