const AdminLog = require('../models/AdminLog');

const getAdminLogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const skip = (page - 1) * limit;
        
        // Sort documents by updated timestamp, so the most recently active admins appear first
        const adminDocs = await AdminLog.find()
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        
        // Ensure the internal logs array for each admin is sorted chronologically descending
        adminDocs.forEach(adminDoc => {
            if (adminDoc.logs && adminDoc.logs.length > 0) {
                adminDoc.logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            }
        });

        const total = await AdminLog.countDocuments();

        res.json({
            success: true,
            data: adminDocs,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching admin logs:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = {
    getAdminLogs
};
