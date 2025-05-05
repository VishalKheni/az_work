
module.exports = (sequelize, DataTypes, Model) => {
    const Clock_entry = sequelize.define('clock_entry_model', {
        worker_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'tbl_users', key: 'id' },
            onDelete: 'CASCADE'
        },
        project_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'tbl_project', key: 'id' },
            onDelete: 'CASCADE'
        },
        date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        clock_in_time: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        clock_out_time: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        duration: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        break_time: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        clock_in_address: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        clock_out_address: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        latitude: {
            type: DataTypes.DECIMAL(10, 8),
            allowNull: true,
        },
        longitude: {
            type: DataTypes.DECIMAL(11, 8),
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM('pending', 'approved', 'rejected'),
            defaultValue: 'pending',
        },
        status: {
            type: DataTypes.ENUM('clock_in', 'clock_out'),
            allowNull: true,
        },
        reason: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    }, {
        tableName: "tbl_clock_entry",
        timestamps: true,
    });
    return Clock_entry;
}