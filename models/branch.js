module.exports = (sequelize, DataTypes, Model) => {
    const Branch = sequelize.define('branch_model', {
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'tbl_users', key: 'id' },
            onDelete: 'CASCADE'
        },
        branch_name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        weekly_hours: {
            type: DataTypes.STRING,
            allowNull: true
        },
        monthly_hours: {
            type: DataTypes.STRING,
            allowNull: true
        },
        yearly_hours: {
            type: DataTypes.STRING,
            allowNull: true
        },
        // over_time: {
        //     type: DataTypes.STRING,
        //     allowNull: true
        // },
    }, {
        tableName: "tbl_branch",
        timestamps: true,
    });
    return Branch;
}