module.exports = (sequelize, DataTypes, Model) => {
    const Notification = sequelize.define('notification_model', {
        notification_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'tbl_users', key: 'id' },
            onDelete: 'CASCADE'
        },
        notification_to: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'tbl_users', key: 'id' },
            onDelete: 'CASCADE'
        },
        notification_type: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        body: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        notification_status: {
            type: DataTypes.ENUM,
            values: ['Read', 'Unread'],
            allowNull: false,
            defaultValue: 'Unread',
        },
    }, {
        tableName: "tbl_notifications",
        timestamps: true,
    });
    return Notification;
}
