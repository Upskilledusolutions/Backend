const mongoose = require('mongoose');
require('dotenv').config();

const DB_URI = process.env.DB_URI
// Object to cache connections
const connections = {};

/**
 * Function to get a database connection dynamically.
 * @param {string} dbName - The name of the database to connect to.
 * @returns {mongoose.Connection} - The database connection.
 */
const getDBConnection = (dbName) => {
  if (!connections[dbName]) {
    connections[dbName] = mongoose.createConnection(`${DB_URI}${dbName}`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    connections[dbName].on('connected', () => {
      console.log(`Connected to database: ${dbName}`);
    });

    connections[dbName].on('error', (err) => {
      console.error(`Error connecting to database ${dbName}:`, err.message);
    });
  }
  return connections[dbName];
};

module.exports = getDBConnection;
