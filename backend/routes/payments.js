const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.get('/', paymentController.getAllPayments);
router.get('/revenue', paymentController.getRevenueAnalytics);

module.exports = router;
