const express = require('express');
const router = express.Router();
const { getAdminLogs } = require('../controllers/adminLogsController');
const { verifyToken } = require('../middleware/authMiddleware');
const superAdminAuth = require('../middleware/superAdminAuth');

// Protected by verifyToken and superAdminAuth
router.get('/', verifyToken, superAdminAuth, getAdminLogs);

module.exports = router;
