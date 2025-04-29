// Importing both modules
const companyModule = require('./company');
const workerModule = require('./company_worker');
const projectModule = require('./project');
const clientsModule = require('./clients');
const jobCategoryModule = require('./job_category');
const holidayModule = require('./holiday');
const absenceVacation = require('./absence_vacation');

// Merging both modules into a single export
module.exports = {
  ...companyModule,
  ...projectModule,
  ...workerModule,
  ...clientsModule,
  ...jobCategoryModule,
  ...holidayModule,
  ...absenceVacation
};
