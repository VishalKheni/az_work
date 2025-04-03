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
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'tbl_company', key: 'id' },
            onDelete: 'CASCADE'
        },
        date: {
            type: DataTypes.DATE,
            allowNull: true, 
        },
        clock_in_time: {
            type: DataTypes.TIME,
            allowNull: true, 
        },
        sign_in_address: {
            type: DataTypes.STRING,
            allowNull: false, 
        },
        clock_out_time: {
            type: DataTypes.TIME,
            allowNull: true,
        },
        sign_out_address: {
            type: DataTypes.STRING,
            allowNull: true, 
        },
        status: {
            type: DataTypes.ENUM('pending', 'approved', 'rejected'),
            defaultValue: 'pending',
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