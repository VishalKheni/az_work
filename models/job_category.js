module.exports = (sequelize, DataTypes, Model) => {
    const Job_category = sequelize.define('category_model', {
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
        tableName: "tbl_category",
        timestamps: true,
    });
    return Job_category;
}