module.exports = (sequelize, DataTypes, Model) => {
    const Absences = sequelize.define('absences_model', {
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'tbl_users', key: 'id' },
            onDelete: 'CASCADE'
        },
        absences_type: {
            type: DataTypes.STRING,
            allowNull: false
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