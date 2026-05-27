const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  mobile: { 
    type: String, 
    required: true, 
    unique: true // Used as the standard Login Username ID
  },
  password: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['teacher', 'student', 'superadmin'], 
    required: true 
  },
  profilePic: {
    type: String, // Base64 string
    default: null
  },
  deviceId: { 
    type: String, 
    default: null // Stays empty until the student completes their first login
  },
  enrollmentNumber: {
    type: String,
    default: null
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    default: null
  },
  dob: {
    type: String,
    default: null
  },
  
  // Categorization parameters matching your teacher batch assignment filters
  branch: { 
    type: String, 
    enum: ['CSE', 'IT', 'ECE', 'ME', 'CE'], 
    default: 'CSE' 
  },
  year: { 
    type: String, 
    enum: ['1st Year', '2nd Year', '3rd Year'], 
    default: '1st Year' 
  },
  session: { 
    type: String, 
    default: '2025-2026' 
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);