const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dynamicRoutes = require('./routes/dynamicRoutes');
const registrationRoutes = require('./routes/registration.js');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json());

// Dynamic Routes
app.use('/api', dynamicRoutes);
app.use('/api', registrationRoutes);

module.exports = app;
