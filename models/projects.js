module.exports = (sequelize, DataTypes, Model) => {
    const Project = sequelize.define('project_model', {
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'tbl_company', key: 'id' },
            onDelete: 'CASCADE'
        },
        client_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'tbl_clients', key: 'id' },
            onDelete: 'CASCADE'
        },
        project_name: {
            type: DataTypes.STRING,
            allowNull: true
        },
        start_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        end_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM('active', 'deactive', 'completed', 'cancelled'),
            allowNull: true,
        },
        address: {
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
    }, {
        tableName: "tbl_project",
        timestamps: true,
    });
    return Project;
}