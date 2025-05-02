module.exports = (sequelize, DataTypes, Model) => {
    const Client = sequelize.define('client_model', {
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'tbl_company', key: 'id' },
            onDelete: 'CASCADE'
        },
        company_name: {
            type: DataTypes.STRING,
            allowNull: true
        },
        client_name: {
            type: DataTypes.STRING,
            allowNull: true
        },
        email: {
            type: DataTypes.STRING,
            allowNull: true,
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
        tableName: "tbl_clients",
        timestamps: true,
    });
    return Client;
}