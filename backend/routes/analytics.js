const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

router.get('/dashboard', analyticsController.getDashboardStats);
router.get('/timeline', analyticsController.getRegistrationTimeline);
router.get('/revenue-timeline', analyticsController.getRevenueTimeline);
router.get('/summary', analyticsController.getAnalyticsSummary);
router.get('/tracks', analyticsController.getTrackDistribution);
router.get('/colleges', analyticsController.getCollegeDistribution);
router.get('/participation-mode', analyticsController.getParticipationTrends);

module.exports = router;
