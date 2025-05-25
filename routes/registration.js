const express = require('express');
const { registrationSchema } = require('../models/schemas.js');
const getDBConnection = require('../config/db.js');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      city,
      country,
      age,
      contest,
      subcategory,
      amount,
      validTill,
      receipt,
      userId,
      password,
    } = req.body;

    if (!name || !email || !phone || !contest || !subcategory || !amount || !validTill || !receipt || !userId || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const registrationDB = getDBConnection('Registrations');
    const Registration = registrationDB.model('Registration', registrationSchema);

    const newEntry = new Registration({
      name,
      email,
      phone,
      city,
      country,
      age,
      contest,
      subcategory,
      amount,
      validTill,
      receipt,
      userId,
      password,
    });

    await newEntry.save();

    res.status(201).json({ message: 'Registration saved successfully' });
  } catch (error) {
    console.error('Registration save error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/registration-list', async (req, res) => {
  try {
    const registrationDB = getDBConnection('Registrations');
    const Registration = registrationDB.model('Registration', registrationSchema);

    const registrations = await Registration.find().sort({ createdAt: -1 }); // newest first
    res.status(200).json(registrations);
  } catch (error) {
    console.error('Error fetching registrations:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
