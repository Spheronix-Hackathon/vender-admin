const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const uri = process.env.LOGS_MONGODB_URI || process.env.VENDOR_MONGODB_URI || process.env.MONGODB_URI;

if (!uri) {
    console.error("CRITICAL ERROR: Neither LOGS_MONGODB_URI nor VENDOR_MONGODB_URI is set in environment variables.");
    console.error("Server startup aborted.");
    process.exit(1);
}

if (!process.env.LOGS_MONGODB_URI) {
    console.log("LOGS_MONGODB_URI not specified. Using primary/vendor database for Admin logs.");
}

const logsDbConnection = mongoose.createConnection(uri, { family: 4, serverSelectionTimeoutMS: 30000 });

logsDbConnection.on('connected', () => {
    console.log('Connected to Admin Logs MongoDB');
});

logsDbConnection.on('error', (err) => {
    console.error('Admin Logs MongoDB connection error:', err.message);
});

module.exports = logsDbConnection;
