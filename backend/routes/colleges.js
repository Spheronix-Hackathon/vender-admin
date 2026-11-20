const express = require('express');
const router = express.Router();
const collegesController = require('../controllers/collegesController');

// All routes are public for GET but should ideally be protected for POST/PUT/DELETE
// Since this is Admin Dashboard backend, we can assume routes are protected if we use middleware, 
// but currently the admin backend may not have global route protection except via frontend. 
// Adding basic endpoints here:

router.get('/', collegesController.getColleges);
router.post('/bulk', collegesController.createBulkColleges);
router.post('/', collegesController.createCollege);
router.put('/:id', collegesController.updateCollege);
router.delete('/bulk', collegesController.deleteBulkColleges);
router.delete('/:id', collegesController.deleteCollege);

module.exports = router;
