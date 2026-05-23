const Setting = require('../models/Setting');

// Get all branches and sessions
exports.getSettings = async (req, res) => {
  try {
    let branchesSetting = await Setting.findOne({ key: 'branches' });
    let sessionsSetting = await Setting.findOne({ key: 'sessions' });

    res.status(200).json({
      branches: branchesSetting ? branchesSetting.values : [],
      sessions: sessionsSetting ? sessionsSetting.values : []
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching settings' });
  }
};

// Add a value to a setting (branch or session)
exports.addSettingValue = async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!['branches', 'sessions'].includes(key) || !value) {
      return res.status(400).json({ message: 'Invalid key or missing value' });
    }

    let setting = await Setting.findOne({ key });
    if (!setting) {
      setting = new Setting({ key, values: [] });
    }

    if (setting.values.includes(value)) {
      return res.status(400).json({ message: 'Value already exists' });
    }

    setting.values.push(value);
    await setting.save();
    
    res.status(200).json({ message: `${key} updated successfully`, values: setting.values });
  } catch (err) {
    res.status(500).json({ message: 'Error adding setting' });
  }
};

// Remove a value from a setting
exports.removeSettingValue = async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!['branches', 'sessions'].includes(key) || !value) {
      return res.status(400).json({ message: 'Invalid key or missing value' });
    }

    let setting = await Setting.findOne({ key });
    if (!setting) {
      return res.status(404).json({ message: 'Setting not found' });
    }

    setting.values = setting.values.filter(v => v !== value);
    await setting.save();

    res.status(200).json({ message: `${key} removed successfully`, values: setting.values });
  } catch (err) {
    res.status(500).json({ message: 'Error removing setting' });
  }
};
