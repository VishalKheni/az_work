module.exports = (sequelize, DataTypes, Model) => {
    const Job_title = sequelize.define('job_title_model', {
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'tbl_company', key: 'id' },
            onDelete: 'CASCADE'
        },
        Job_title: {
            type: DataTypes.STRING,
            allowNull: true
        },
    }, {
        tableName: "tbl_job_title",
        timestamps: true,
    });
    return Job_title;
}