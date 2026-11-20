const mongoose = require('mongoose');
const logsDbConnection = require('../utils/logsDbConnection');

const adminLogSchema = new mongoose.Schema({
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    adminEmail: { type: String, required: true, unique: true },
    logs: [{
        action: { type: String, required: true },
        details: { type: mongoose.Schema.Types.Mixed },
        ipAddress: { type: String },
        createdAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

const AdminLog = logsDbConnection.model('AdminLog', adminLogSchema);

module.exports = AdminLog;
