module.exports = (sequelize, DataTypes, Model) => {
    const Client = sequelize.define('client_model', {
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
        tableName: "tbl_client",
        timestamps: true,
    });
    return Client;
}