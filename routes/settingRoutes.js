const express = require('express');
const router = express.Router();
const { getSettings, addSettingValue, removeSettingValue } = require('../controllers/settingController');

router.get('/', getSettings);
router.post('/', addSettingValue);
router.delete('/', removeSettingValue);

module.exports = router;
