require('dotenv').config()
const db = require("../config/db");
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
const moment = require('moment');
const { sendOTPVerificationEmail } = require("../helpers/email");
const { validateMobile, } = require('../helpers/twilio');
const { Op, where, Sequelize, col } = require("sequelize");
let path = require('path');
let fs = require('fs');

exports.addBrach = async (req, res) => {

}