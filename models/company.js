module.exports = (sequelize, DataTypes, Model) => {
    const Company = sequelize.define('company_model', {
        owner_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'tbl_users', key: 'id' },
            onDelete: 'CASCADE'
        },
        industry_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'tbl_branch', key: 'id' },
            onDelete: 'CASCADE'
        },
        company_logo: {
            type: DataTypes.STRING,
            allowNull: false
        },
        company_name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        country_code: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        iso_code: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        phone_number: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        address: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    }, {
        tableName: "tbl_company",
        timestamps: true,
    });
    return Company;
}