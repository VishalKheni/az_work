module.exports = (sequelize, DataTypes, Model) => {
    const Document = sequelize.define('document_model', {
        worker_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'tbl_users', key: 'id' },
            onDelete: 'CASCADE'
        },
        project_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'tbl_project', key: 'id' },
            onDelete: 'CASCADE'
        },
        title: {
            type: DataTypes.STRING,
            allowNull: true
        },
        date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        document_url: {
            type: DataTypes.STRING,
            allowNull: false
        },
    }, {
        tableName: "tbl_document",
        timestamps: true,
    });
    return Document;
}