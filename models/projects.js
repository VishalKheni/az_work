module.exports = (sequelize, DataTypes, Model) => {
    const Project = sequelize.define('project_model', {
        company_id: {
            type: DataTypes.INTEGER,
            references: { model: 'tbl_comapany', key: 'id' },
            onDelete: 'CASCADE'
        },
        owner_id: {
            type: DataTypes.INTEGER,
            references: { model: 'tbl_users', key: 'id' },
            onDelete: 'CASCADE'
        },
        category_name: {
            type: DataTypes.STRING,
            allowNull: true
        },
    }, {
        tableName: "tbl_project",
        timestamps: true,
    });
    return Project;
}