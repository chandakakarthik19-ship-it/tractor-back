const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const Farmer = require('../models/Farmer');
const Work = require('../models/Work');
const Payment = require('../models/Payment');
const multer = require('multer');
const { authAdmin } = require('./middleware');

const upload = multer({ dest: 'uploads/' });

/* ======================================================
   ADMIN CHANGE PASSWORD
   ====================================================== */
router.post('/change-password', authAdmin, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword)
      return res.status(400).json({ error: 'All fields required' });

    const admin = await Admin.findById(req.user.id);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });

    const ok = await admin.comparePassword(oldPassword);
    if (!ok) return res.status(401).json({ error: 'Old password incorrect' });

    admin.password = newPassword;
    await admin.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   CREATE FARMER
   ====================================================== */
router.post('/farmers', authAdmin, upload.single('profile'), async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    if (!name || !phone || !password)
      return res.status(400).json({ error: 'Missing fields' });

    const exists = await Farmer.findOne({ phone });
    if (exists)
      return res.status(409).json({ error: 'Farmer already exists' });

    const farmer = new Farmer({
      name,
      phone,
      password,
      profileImage: req.file ? `/uploads/${req.file.filename}` : null
    });

    await farmer.save();
    res.json({ success: true, farmer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   LIST FARMERS
   ====================================================== */
router.get('/farmers', authAdmin, async (req, res) => {
  const farmers = await Farmer.find()
    .select('-password')
    .sort({ createdAt: -1 });
  res.json({ success: true, farmers });
});

/* ======================================================
   DELETE FARMER (PASSWORD CONFIRM)
   ====================================================== */
router.delete('/farmer/:id', authAdmin, async (req, res) => {
  try {
    const { adminPassword } = req.body;
    if (!adminPassword)
      return res.status(400).json({ error: 'Admin password required' });

    const admin = await Admin.findById(req.user.id);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });

    const ok = await admin.comparePassword(adminPassword);
    if (!ok) return res.status(401).json({ error: 'Admin password incorrect' });

    await Work.deleteMany({ farmer: req.params.id });
    await Payment.deleteMany({ farmer: req.params.id });
    await Farmer.findByIdAndDelete(req.params.id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   ADD WORK
   ====================================================== */
router.post('/work', authAdmin, async (req, res) => {
  try {
    let { farmerId, workType, minutes, ratePer60 } = req.body;
    if (!farmerId || !workType || !minutes || !ratePer60)
      return res.status(400).json({ error: 'Missing fields' });

    const totalAmount = (minutes / 60) * Number(ratePer60);

    const work = new Work({
      farmer: farmerId,
      workType,
      minutes,
      ratePer60,
      totalAmount
    });

    await work.save();
    res.json({ success: true, work });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   UPDATE WORK (ALLOW FARMER CHANGE)
   ====================================================== */
router.put('/work/:id', authAdmin, async (req, res) => {
  try {
    const { farmerId, workType, minutes, ratePer60 } = req.body;
    const totalAmount = (minutes / 60) * Number(ratePer60 || 0);

    const update = {
      workType,
      minutes,
      ratePer60,
      totalAmount
    };

    if (farmerId) update.farmer = farmerId;

    const work = await Work.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!work) return res.status(404).json({ error: 'Work not found' });

    res.json({ success: true, work });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   DELETE WORK
   ====================================================== */
router.delete('/work/:id', authAdmin, async (req, res) => {
  await Work.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

/* ======================================================
   LIST WORK
   ====================================================== */
router.get('/work', authAdmin, async (req, res) => {
  const filter = {};
  if (req.query.farmerId) filter.farmer = req.query.farmerId;

  const works = await Work.find(filter)
    .populate('farmer', 'name phone')
    .sort({ date: -1 });

  res.json({ success: true, works });
});

/* ======================================================
   ADD PAYMENT (SEPARATE COLLECTION)
   ====================================================== */
router.post('/payment', authAdmin, async (req, res) => {
  const { farmerId, amount } = req.body;
  if (!farmerId || !amount)
    return res.status(400).json({ error: 'Missing fields' });

  const payment = new Payment({
    farmer: farmerId,
    amount
  });

  await payment.save();
  res.json({ success: true, payment });
});

/* ======================================================
   EDIT PAYMENT
   ====================================================== */
router.put('/payment/:id', authAdmin, async (req, res) => {
  const { amount } = req.body;
  await Payment.findByIdAndUpdate(req.params.id, { amount });
  res.json({ success: true });
});

/* ======================================================
   DELETE PAYMENT
   ====================================================== */
router.delete('/payment/:id', authAdmin, async (req, res) => {
  await Payment.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

/* ======================================================
   FARMER HISTORY (WORK + PAYMENT)
   ====================================================== */
router.get('/history/:farmerId', authAdmin, async (req, res) => {
  const works = await Work.find({ farmer: req.params.farmerId }).sort({ date: 1 });
  const payments = await Payment.find({ farmer: req.params.farmerId }).sort({ date: 1 });
  res.json({ success: true, works, payments });
});

module.exports = router;
