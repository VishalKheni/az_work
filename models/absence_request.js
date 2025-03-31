module.exports = (sequelize, DataTypes, Model) => {
    const Absence_request = sequelize.define('absence_request_model', {
        worker_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'tbl_users', key: 'id' },
            onDelete: 'CASCADE'
        },
        absences_type: {
            type: DataTypes.STRING,
            allowNull: false
        },
        start_date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        end_date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        reason: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM('paid', 'unpaid'),
        },
        request_status: {
            type: DataTypes.ENUM('accepted', 'rejected'),
        },
    }, {
        tableName: "tbl_absences_request",
        timestamps: true,
    });
    return Absence_request;
}