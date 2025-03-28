require("dotenv").config();
const { Sequelize } = require("sequelize");

const env = process.env.NODE_ENV || 'LOCAL';

let database, dbUser, dbPassword, dbHost;

if (env === 'DEVELOPMENT') {
  require('dotenv').config({ path: '.env.development' });
  database = process.env.DATABASE;
  dbUser = process.env.DBUSER;
  dbPassword = process.env.DBPASSWORD;
  dbHost = process.env.DBHOST;
} else {
  require('dotenv').config({ path: '.env' });
  database = process.env.DATABASE;
  dbUser = process.env.DBUSER;
  dbPassword = process.env.DBPASSWORD;
  dbHost = process.env.DBHOST;
}
// console.log(database, dbUser, dbPassword, dbHost);

const sequelize = new Sequelize(database, dbUser, dbPassword, {
  host: dbHost,
  logging: console.log,
  dialect: "mysql"
});

module.exports = { sequelize };