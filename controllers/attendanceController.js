const Batch = require('../models/Batch');
const Attendance = require('../models/Attendance');
const User = require('../models/User');

function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// 1. START SESSION — stores teacher's live GPS location
exports.startClassSession = async (req, res) => {
  try {
    const { batchId, latitude, longitude } = req.body;
    if (!batchId || latitude == null || longitude == null)
      return res.status(400).json({ message: 'batchId, latitude and longitude are required.' });

    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ message: 'Batch not found.' });

    batch.isClassActive = true;
    batch.teacherLat = latitude;
    batch.teacherLng = longitude;
    await batch.save();

    res.status(200).json({ message: `Session started for ${batch.name}! Location anchored.` });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// Remove a batch
exports.deleteBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    await Batch.findByIdAndDelete(batchId);
    await Attendance.deleteMany({ batchId }); // Wipe related records
    res.status(200).json({ message: "Batch and all related attendance records wiped." });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// Add students to an existing batch
exports.addStudentsToBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { studentIds } = req.body;
    
    if (!studentIds || !Array.isArray(studentIds)) {
      return res.status(400).json({ message: 'studentIds must be an array' });
    }

    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ message: 'Batch not found' });

    // Add unique students
    const newStudents = studentIds.filter(id => !batch.students.includes(id));
    if (newStudents.length === 0) {
      return res.status(200).json({ message: 'All selected students are already in this batch', batch });
    }

    batch.students.push(...newStudents);
    await batch.save();

    res.status(200).json({ message: `Successfully added ${newStudents.length} students to batch.`, batch });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// Remove a student from an existing batch
exports.removeStudentFromBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { studentId } = req.body;

    if (!studentId) return res.status(400).json({ message: 'studentId is required' });

    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ message: 'Batch not found' });

    batch.students = batch.students.filter(id => id.toString() !== studentId);
    await batch.save();

    res.status(200).json({ message: 'Student removed from batch.', batch });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// 2. END SESSION
exports.endClassSession = async (req, res) => {
  try {
    const { batchId } = req.body;
    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ message: 'Batch not found.' });
    batch.isClassActive = false;
    await batch.save();
    res.status(200).json({ message: `Session closed for ${batch.name}.` });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// 3. MARK STUDENT PRESENT (20m geofence)
exports.markStudentPresence = async (req, res) => {
  try {
    const { studentId, batchId, studentLat, studentLng } = req.body;
    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ message: 'Batch not found.' });
    if (!batch.isClassActive)
      return res.status(400).json({ message: "Attendance session hasn't started or has already closed." });

    const distance = getDistanceInMeters(batch.teacherLat, batch.teacherLng, studentLat, studentLng);
    if (distance > 150.0)
      return res.status(400).json({ message: `Out of bounds! You are ${Math.round(distance)}m away. Must be within 150m.` });

    const todayStr = new Date().toISOString().split('T')[0];
    const alreadyMarked = await Attendance.findOne({ studentId, batchId, date: todayStr });
    if (alreadyMarked)
      return res.status(400).json({ message: 'Attendance already marked for today.' });

    const formattedTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    await new Attendance({ batchId, studentId, date: todayStr, status: 'Present', checkInTime: formattedTime }).save();
    res.status(201).json({ message: 'Attendance verified and recorded!', checkInTime: formattedTime });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// 4. DAILY ATTENDANCE — present/absent list for a date
exports.getAttendanceByBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const targetDate = req.query.date || new Date().toISOString().split('T')[0];

    const batch = await Batch.findById(batchId).populate('students', 'name mobile branch year');
    if (!batch) return res.status(404).json({ message: 'Batch not found.' });

    const presentRecords = await Attendance.find({ batchId, date: targetDate, status: 'Present' })
      .populate('studentId', 'name mobile');

    const presentIds = presentRecords.map(r => r.studentId._id.toString());
    const present = presentRecords.map(r => ({
      studentId: r.studentId._id, name: r.studentId.name,
      mobile: r.studentId.mobile, checkInTime: r.checkInTime, status: 'Present'
    }));
    const absent = batch.students
      .filter(s => !presentIds.includes(s._id.toString()))
      .map(s => ({ studentId: s._id, name: s.name, mobile: s.mobile, checkInTime: '--:--', status: 'Absent' }));

    res.status(200).json({ batchName: batch.name, date: targetDate, present, absent });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// 5. MONTHLY ATTENDANCE — full month matrix for all students in a batch
exports.getMonthlyAttendance = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { month, year } = req.query; // month: 1-12, year: 2026
    const now = new Date();
    const m = parseInt(month || now.getMonth() + 1);
    const y = parseInt(year || now.getFullYear());

    const batch = await Batch.findById(batchId).populate('students', 'name mobile');
    if (!batch) return res.status(404).json({ message: 'Batch not found.' });

    const startDate = `${y}-${String(m).padStart(2,'0')}-01`;
    const endDate = `${y}-${String(m).padStart(2,'0')}-31`;

    const records = await Attendance.find({
      batchId,
      date: { $gte: startDate, $lte: endDate }
    }).populate('studentId', 'name mobile');

    // Build matrix: { studentId: { day: status } }
    const matrix = {};
    for (const s of batch.students) {
      matrix[s._id.toString()] = { name: s.name, mobile: s.mobile, days: {} };
    }
    for (const r of records) {
      const sid = r.studentId._id.toString();
      const day = parseInt(r.date.split('-')[2]);
      if (matrix[sid]) matrix[sid].days[day] = r.status;
    }

    res.status(200).json({ batchName: batch.name, month: m, year: y, matrix: Object.entries(matrix).map(([id, v]) => ({ studentId: id, ...v })) });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// 6. STUDENT STATS FOR A BATCH — total %, excluding sundays & holidays
exports.getStudentBatchStats = async (req, res) => {
  try {
    const { studentId, batchId } = req.params;
    const records = await Attendance.find({ studentId, batchId }).sort({ date: 1 });

    const classDays = records.filter(r => r.status === 'Present' || r.status === 'Absent');
    const presentDays = records.filter(r => r.status === 'Present').length;
    const totalClassDays = classDays.length;
    const percentage = totalClassDays > 0 ? ((presentDays / totalClassDays) * 100).toFixed(1) : '0.0';

    // Build monthly map for calendar grid
    const monthlyMap = {};
    for (const r of records) {
      const [y, mo, d] = r.date.split('-');
      const key = `${y}-${mo}`;
      if (!monthlyMap[key]) monthlyMap[key] = {};
      monthlyMap[key][parseInt(d)] = r.status;
    }

    res.status(200).json({ presentDays, totalClassDays, percentage, monthlyMap });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// 7. STUDENT FULL HISTORY
exports.getStudentAttendance = async (req, res) => {
  try {
    const records = await Attendance.find({ studentId: req.params.studentId })
      .populate('batchId', 'name').sort({ date: -1 });
    res.status(200).json(records);
  } catch (error) { res.status(500).json({ error: error.message }); }
};
