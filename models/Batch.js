const mongoose = require('mongoose');

const BatchSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "Data Structures - Section A"
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of students filtered into this batch
  isClassActive: { type: Boolean, default: false }, // Controlled by Teacher Start/End session buttons
  
  // Storage for Teacher's live broadcast location center point
  teacherLat: { type: Number, default: 0 },
  teacherLng: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Batch', BatchSchema);