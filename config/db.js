const { Sequelize, DataTypes, Model } = require("sequelize");
const { sequelize } = require("./connection");
db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.User = require("../models/user")(sequelize, DataTypes, Model);
db.Token = require("../models/token")(sequelize, DataTypes, Model);
db.Branch = require("../models/branch")(sequelize, DataTypes, Model);

db.User.hasMany(db.Token, {
    foreignKey: 'user_id',
    as: 'user_tokens'
});
db.Token.belongsTo(db.User, {
    foreignKey: 'user_id'
});

db.User.hasMany(db.Branch, {
    foreignKey: 'user_id',
    as: 'branches'
});
db.Branch.belongsTo(db.User, {
    foreignKey: 'user_id',
    as: 'user'
});


module.exports = db;