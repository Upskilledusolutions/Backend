const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dynamicRoutes = require('./routes/dynamicRoutes');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Dynamic Routes
app.use('/api', dynamicRoutes);

module.exports = app;
