const Batch = require('../models/Batch');
const Attendance = require('../models/Attendance');
const User = require('../models/User');

// Math Engine: Haversine formula calculation to measure distance between two sets of GPS coordinates
function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Absolute precision distance output in meters
}

// 1. TEACHER INITIATES CLASS BROADCAST
exports.startClassSession = async (req, res) => {
  try {
    const { batchId, latitude, longitude } = req.body;

    if (!batchId || !latitude || !longitude) {
      return res.status(400).json({ message: "Batch ID and location coordinates are required." });
    }

    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ message: "Class batch not found." });

    // Open the session and anchor the location coordinate center point
    batch.isClassActive = true;
    batch.teacherLat = latitude;
    batch.teacherLng = longitude;
    await batch.save();

    res.status(200).json({ message: `Attendance session opened for ${batch.name}! Location anchored.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. TEACHER ENDS CLASS SESSION
exports.endClassSession = async (req, res) => {
  try {
    const { batchId } = req.body;

    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ message: "Class batch not found." });

    batch.isClassActive = false;
    await batch.save();

    res.status(200).json({ message: `Attendance session successfully closed for ${batch.name}.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. STUDENT SUBMITS GEOFENCED ATTENDANCE MARK
exports.markStudentPresence = async (req, res) => {
  try {
    const { studentId, batchId, studentLat, studentLng } = req.body;

    // Validate active batch state parameters
    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ message: "Batch not found." });

    if (!batch.isClassActive) {
      return res.status(400).json({ message: "Oops! The attendance session for this class has already closed or hasn't started." });
    }

    // Run the Proximity Engine calculation
    const distance = getDistanceInMeters(
      batch.teacherLat, 
      batch.teacherLng, 
      studentLat, 
      studentLng
    );

    const STRICT_LIMIT = 20.0; // The 20-meter classroom envelope requirement
    if (distance > STRICT_LIMIT) {
      return res.status(400).json({ 
        message: `Verification Failed! Out of Bounds. You are ${Math.round(distance)} meters away from the teacher. You must be within 20 meters.` 
      });
    }

    // Format current local date properties for validation logs tracking
    const todayStr = new Date().toISOString().split('T')[0]; // Generates format "YYYY-MM-DD"
    
    // Check if attendance is already logged for today
    const alreadyMarked = await Attendance.findOne({ studentId, batchId, date: todayStr });
    if (alreadyMarked) {
      return res.status(400).json({ message: "Attendance already captured for this session today." });
    }

    // Format local time stamp for roster view display tracking
    const now = new Date();
    const formattedTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Success: Write Present Log Document
    const checkInRecord = new Attendance({
      batchId,
      studentId,
      date: todayStr,
      status: 'Present',
      checkInTime: formattedTime
    });

    await checkInRecord.save();
    res.status(201).json({ message: "Attendance verified and successfully submitted!", checkInTime: formattedTime });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 4. GET ATTENDANCE RECORDS FOR A BATCH (today)
exports.getAttendanceByBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const batch = await Batch.findById(batchId).populate('students', 'name mobile');
    if (!batch) return res.status(404).json({ message: 'Batch not found.' });

    const presentRecords = await Attendance.find({ batchId, date: targetDate, status: 'Present' })
      .populate('studentId', 'name mobile');

    const presentIds = presentRecords.map(r => r.studentId._id.toString());

    const present = presentRecords.map(r => ({
      studentId: r.studentId._id,
      name: r.studentId.name,
      mobile: r.studentId.mobile,
      checkInTime: r.checkInTime,
      status: 'Present'
    }));

    const absent = batch.students
      .filter(s => !presentIds.includes(s._id.toString()))
      .map(s => ({ studentId: s._id, name: s.name, mobile: s.mobile, checkInTime: '--:--', status: 'Absent' }));

    res.status(200).json({ batchName: batch.name, date: targetDate, present, absent });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 5. GET STUDENT ATTENDANCE HISTORY ACROSS ALL BATCHES
exports.getStudentAttendance = async (req, res) => {
  try {
    const records = await Attendance.find({ studentId: req.params.studentId })
      .populate('batchId', 'name')
      .sort({ date: -1 });
    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};