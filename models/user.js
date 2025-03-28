module.exports = (sequelize, DataTypes, Model) => {
    const User = sequelize.define('user_model', {
        user_role: {
            type: DataTypes.ENUM,
            values: ['admin', 'company', 'worker'],
            allowNull: false,
        },
        login_type: {
            type: DataTypes.ENUM('google', 'email', 'number', 'apple'),
            defaultValue: "email"
        },
        firstname: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        lastname: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        insurance_number: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        employment_date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        password: {
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
        otp: {
            type: DataTypes.INTEGER,
        },
        otp_created_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        phone_number: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        profile_image: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        is_email_verified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        address: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        is_company_add: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        is_company_blocked: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        is_company_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
    }, {
        tableName: "tbl_users",
        timestamps: true,
    });
    return User;
}
