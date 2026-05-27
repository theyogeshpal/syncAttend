const Batch = require('../models/Batch');
const User = require('../models/User');
const Attendance = require('../models/Attendance');

// 1. CREATE BATCH
exports.createBatch = async (req, res) => {
  try {
    const { name, teacherId, studentIds } = req.body;
    if (!name || !teacherId || !studentIds || studentIds.length === 0)
      return res.status(400).json({ message: 'Batch name, teacherId and at least one student are required.' });
    const batch = new Batch({ name, teacherId, students: studentIds });
    await batch.save();
    res.status(201).json({ message: `Batch '${name}' created!`, batch });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// 2. GET TEACHER BATCHES
exports.getTeacherBatches = async (req, res) => {
  try {
    const batches = await Batch.find({ teacherId: req.params.teacherId })
      .populate('students', 'name mobile branch year session');
    res.status(200).json(batches);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// 3. GET STUDENT BATCHES
exports.getStudentBatches = async (req, res) => {
  try {
    const batches = await Batch.find({ students: req.params.studentId })
      .populate('teacherId', 'name');
    res.status(200).json(batches);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// 4. FILTER STUDENTS
exports.getStudentsByFilter = async (req, res) => {
  try {
    const { branch, year, session } = req.query;
    const filter = { role: 'student' };
    if (branch) filter.branch = branch;
    if (year) filter.year = year;
    if (session) filter.session = session;
    const students = await User.find(filter).select('_id name mobile branch year session');
    res.status(200).json(students);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// 5. GET ALL STUDENTS (for onboard page listing)
exports.getAllStudents = async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('_id name mobile branch year session');
    res.status(200).json(students);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// 6. DELETE BATCH (also removes all attendance records)
exports.deleteBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ message: 'Batch not found.' });
    await Attendance.deleteMany({ batchId });
    await Batch.findByIdAndDelete(batchId);
    res.status(200).json({ message: `Batch '${batch.name}' and all its records deleted.` });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// 6.1 EDIT BATCH NAME
exports.editBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Batch name is required.' });
    
    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ message: 'Batch not found.' });
    
    batch.name = name;
    await batch.save();
    res.status(200).json({ message: 'Batch name updated.', batch });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// 6.5 ADD STUDENTS TO BATCH
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

// 7. REMOVE STUDENT FROM BATCH
exports.removeStudentFromBatch = async (req, res) => {
  try {
    const { batchId, studentId } = req.params;
    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ message: 'Batch not found.' });
    batch.students = batch.students.filter(s => s.toString() !== studentId);
    await batch.save();
    res.status(200).json({ message: 'Student removed from batch.' });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// 8. UPDATE STUDENT PROFILE (name, branch, year — not mobile)
exports.updateStudentProfile = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { name, branch, year, session } = req.body;
    const student = await User.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found.' });
    if (name) student.name = name;
    if (branch) student.branch = branch;
    if (year) student.year = year;
    if (session) student.session = session;
    await student.save();
    res.status(200).json({ message: 'Profile updated.', student: { id: student._id, name: student.name, mobile: student.mobile, branch: student.branch, year: student.year, session: student.session } });
  } catch (error) { res.status(500).json({ error: error.message }); }
};
