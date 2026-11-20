const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');

// Aggregate statistics
router.get('/stats', vendorController.getVendorStats);

// Filter options for dropdowns (colleges, branches, cities, dates)
router.get('/filters', vendorController.getFilterOptions);
router.get('/filter-options', vendorController.getFilterOptions);

// Export data
router.get('/export', vendorController.exportVendorRegistrations);

// Users in vendor DB
router.get('/users', vendorController.getVendorUsers);

// Colleges, Categories, and Tasks in vendor DB
router.get('/colleges', vendorController.getVendorColleges);
router.get('/categories', vendorController.getVendorCategories);
router.get('/tasks', vendorController.getVendorTasks);

// Bulk operations
router.delete('/bulk', vendorController.bulkDeleteVendorRegistrations);
router.post('/bulk-delete', vendorController.bulkDeleteVendorRegistrations);
router.post('/update-status', vendorController.updateStudentsStatus);
router.post('/start-exam', vendorController.startExam);

// Single registration operations
router.get('/:id/payment-receipt', vendorController.getPaymentReceipt);
router.get('/:id', vendorController.getVendorRegistrationById);
router.put('/:id/complete', vendorController.markAsCompleted);
router.put('/:id/pending', vendorController.markAsPending);
router.post('/:id/reset-mfa', vendorController.resetStudentMFA);
router.put('/:id/details', vendorController.updateStudent);
router.put('/:id', vendorController.updateStudent);
router.delete('/:id', vendorController.deleteVendorRegistration);

// Get all registrations with search, filters, pagination
router.get('/', vendorController.getVendorRegistrations);

module.exports = router;
