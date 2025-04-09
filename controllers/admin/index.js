// Importing both modules
const companyModule = require('./company');
const branchModule = require('./branch');
const holidayModule = require('./holiday');
const absenceModule = require('./absence');

// Merging both modules into a single export
module.exports = {
  ...companyModule,
  ...branchModule,
  ...holidayModule,
  ...absenceModule
};56
