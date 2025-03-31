module.exports = (sequelize, DataTypes, Model) => {
    const Job_title = sequelize.define('job_title_model', {
        company_id: {
            type: DataTypes.INTEGER,
            references: { model: 'tbl_company', key: 'id' },
            onDelete: 'CASCADE'
        },
        job_category_id: {
            type: DataTypes.INTEGER,
            references: { model: 'tbl_job_category', key: 'id' },
            onDelete: 'CASCADE'
        },
        category_name: {
            type: DataTypes.STRING,
            allowNull: true
        },
    }, {
        tableName: "tbl_job_title",
        timestamps: true,
    });
    return Job_title;
}