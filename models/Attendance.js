const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // Saved as "YYYY-MM-DD" for instant historical lookups
  status: { 
    type: String, 
    enum: ['Present', 'Absent', 'Holiday', 'Sunday'], 
    required: true 
  },
  checkInTime: { type: String, default: "--:--" } // Precise time formatting for the teacher's roster list
}, { timestamps: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);