module.exports = (sequelize, DataTypes, Model) => {
    const absence_request = sequelize.define('absence_request_model', {
        worker_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'tbl_users', key: 'id' },
            onDelete: 'CASCADE'
        },
        absence_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'tbl_absences', key: 'id' },
            onDelete: 'CASCADE'
        },
        start_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        end_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        reason: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        request_status: {
            type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
            defaultValue: 'pending',
            allowNull: true,
        },
        type: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
    }, {
        tableName: "tbl_absences_request",
        timestamps: true,
    });
    return absence_request;
}