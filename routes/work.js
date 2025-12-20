const express = require('express');
const router = express.Router();
const Work = require('../models/Work');
const Farmer = require('../models/Farmer');
const { authAdmin } = require('./middleware');

/* ================= ADD WORK (ADMIN ONLY) ================= */
router.post('/add', authAdmin, async (req, res) => {
  try {
    const { farmerId, workType, minutes, ratePer60, date } = req.body;

    if (!farmerId || !workType || !minutes || !ratePer60) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const totalAmount = (minutes / 60) * ratePer60;

    const work = new Work({
      farmer: farmerId,
      workType,
      minutes,
      ratePer60,
      totalAmount,
      date: date || new Date()
    });

    await work.save();

    res.status(201).json({
      success: true,
      message: 'Work added successfully',
      work
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
