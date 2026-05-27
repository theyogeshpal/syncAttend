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

// 2. END SESSION
exports.endClassSession = async (req, res) => {
  try {
    const { batchId } = req.body;
    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ message: 'Batch not found.' });
    batch.isClassActive = false;
    await batch.save();

    // Generate absent records for students who didn't mark present today
    const todayStr = new Date().toISOString().split('T')[0];
    const presentRecords = await Attendance.find({ batchId, date: todayStr });
    const presentIds = presentRecords.map(r => r.studentId.toString());

    const absentStudents = batch.students.filter(sId => !presentIds.includes(sId.toString()));
    for (let sId of absentStudents) {
      const existing = await Attendance.findOne({ batchId, studentId: sId, date: todayStr });
      if (!existing) {
        await new Attendance({
          batchId,
          studentId: sId,
          date: todayStr,
          status: 'Absent',
          checkInTime: '--:--'
        }).save();
      }
    }

    res.status(200).json({ message: `Session closed for ${batch.name}. Absent records generated.` });
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

    // 1. Find the first ever attendance date for this batch
    const firstBatchRecord = await Attendance.findOne({ batchId }).sort({ date: 1 });
    if (!firstBatchRecord) {
      return res.status(200).json({ presentDays: 0, totalClassDays: 0, percentage: '0.0', monthlyMap: {} });
    }

    const startDateStr = firstBatchRecord.date;
    // Current local date in YYYY-MM-DD
    const todayStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
    
    // 2. Get all distinct dates where the batch had a class
    const batchDates = await Attendance.distinct('date', { batchId });
    const classDaysSet = new Set(batchDates);

    // 3. Get student's records
    const studentRecords = await Attendance.find({ studentId, batchId });
    const studentRecordMap = {};
    studentRecords.forEach(r => studentRecordMap[r.date] = r.status);

    let presentDays = 0;
    let totalWorkingDays = 0;
    const monthlyMap = {};

    // Helper to get next day string in YYYY-MM-DD
    const getNextDay = (dateStr) => {
      const d = new Date(dateStr);
      d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    };

    let currDateStr = startDateStr;
    const endDateStr = todayStr;

    while (currDateStr <= endDateStr) {
      const d = new Date(currDateStr);
      const isSunday = d.getDay() === 0; // 0 is Sunday
      const hasClass = classDaysSet.has(currDateStr);
      const studentStatus = studentRecordMap[currDateStr];

      const [y, mo, dayNum] = currDateStr.split('-');
      const key = `${y}-${mo}`;
      if (!monthlyMap[key]) monthlyMap[key] = {};

      let dayStatus;

      if (isSunday) {
        dayStatus = 'Sunday';
      } else if (!hasClass) {
        dayStatus = 'No Class';
      } else {
        totalWorkingDays++;
        if (studentStatus === 'Present') {
          dayStatus = 'Present';
          presentDays++;
        } else {
          dayStatus = 'Absent';
        }
      }

      monthlyMap[key][parseInt(dayNum, 10)] = dayStatus;
      currDateStr = getNextDay(currDateStr);
    }

    const percentage = totalWorkingDays > 0 ? ((presentDays / totalWorkingDays) * 100).toFixed(1) : '0.0';

    res.status(200).json({ presentDays, totalClassDays: totalWorkingDays, percentage, monthlyMap });
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
