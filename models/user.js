module.exports = (sequelize, DataTypes, Model) => {
    const User = sequelize.define('user_model', {
        user_role: {
            type: DataTypes.ENUM('admin', 'company', 'worker'),
            allowNull: false,
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'tbl_company', key: 'id' },
            onDelete: 'CASCADE'
        },
        job_category_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'tbl_job_category', key: 'id' },
            onDelete: 'CASCADE'
        },
        job_title_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'tbl_job_title', key: 'id' },
            onDelete: 'CASCADE'
        },
        firstname: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        lastname: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        profile_image: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        insurance_number: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        employment_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        vacation_days: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        experience: {
            type: DataTypes.STRING,
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
        phone_number: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        // otp: {
        //     type: DataTypes.INTEGER,
        // },
        // otp_created_at: {
        //     type: DataTypes.DATE,
        //     allowNull: true,
        // },
        is_email_verified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        address: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        login_type: {
            type: DataTypes.ENUM('google', 'email', 'number', 'apple'),
            defaultValue: "email"
        },
        is_account_created: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        is_company_add: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        is_password_add: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        is_worker_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
    }, {
        tableName: "tbl_users",
        timestamps: true,
    });
    return User;
}
