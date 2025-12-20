const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const farmerSchema = new mongoose.Schema({
  name: String,
  phone: { type: String, unique: true },
  password: String
});

// Hash password before save
farmerSchema.pre('save', async function(next){
  if(!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password
farmerSchema.methods.comparePassword = function(password){
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('Farmer', farmerSchema);
