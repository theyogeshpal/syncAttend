const User = require('../models/User');
const Batch = require('../models/Batch');

exports.getAllTeachers = async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher' }).select('-password');
    res.status(200).json(teachers);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.deleteTeacher = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    await Batch.deleteMany({ teacherId: req.params.id });
    res.status(200).json({ message: 'Teacher deleted successfully' });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.deleteStudent = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    // Note: To be fully clean, we could also remove the student from any batches they are enrolled in, 
    // but a simple delete is fine for demonstration.
    res.status(200).json({ message: 'Student deleted successfully' });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getAllBatches = async (req, res) => {
  try {
    const batches = await Batch.find().populate('teacherId', 'name');
    res.status(200).json(batches);
  } catch (error) { res.status(500).json({ error: error.message }); }
};
