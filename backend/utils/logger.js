const AdminLog = require('../models/AdminLog');

const logAdminAction = async (adminEmail, adminId, action, details, ipAddress) => {
    try {
        await AdminLog.findOneAndUpdate(
            { adminEmail },
            {
                $setOnInsert: { adminId, adminEmail },
                $push: { 
                    logs: { action, details, ipAddress, createdAt: new Date() } 
                }
            },
            { upsert: true, returnDocument: 'after' }
        );
    } catch (error) {
        console.error('Error saving admin log to external database:', error);
    }
};

module.exports = { logAdminAction };
