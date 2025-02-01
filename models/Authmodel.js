const mongoose = require('mongoose');
const getDBConnection = require('../config/db.js'); // Ensure correct path

// Use the 'Auth' database
const authDb = getDBConnection('Auth');

const authSchema = new mongoose.Schema({
  userId: String,
  password: String,
  name: String,
  trial: Boolean,
  type: String,
  next: []
}, { collection: 'users' }); // Ensure this is the correct collection name

const AuthModel = authDb.model('Auth', authSchema);

module.exports = AuthModel;