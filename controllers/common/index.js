// Importing both modules
const authModule = require('./auth');

// Merging both modules into a single export
module.exports = {
  ...authModule,
};
