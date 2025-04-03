// Importing both modules
const companyModule = require('./company');
const workerModule = require('./worker');
const clientsModule = require('./clients');
const jobCategoryModule = require('./job_category');

// Merging both modules into a single export
module.exports = {
  ...companyModule,
  ...workerModule,
  ...clientsModule,
  ...jobCategoryModule
};
