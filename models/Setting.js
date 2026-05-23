const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // e.g., 'branches', 'sessions'
  values: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema);
