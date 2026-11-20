const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const uri = process.env.VENDOR_MONGODB_URI || 'mongodb+srv://spheronixtechnology_db_user:HNk8aimJJJFS0dIQ@surendra-hackathon-regis.egmtfpm.mongodb.net/spheronix_db?retryWrites=true&w=majority';

if (!uri) {
    console.warn('WARNING: VENDOR_MONGODB_URI is not set. Vendor DB will fail to connect.');
}

const vendorDb = mongoose.createConnection(uri, {
    family: 4,
    serverSelectionTimeoutMS: 30000
});

vendorDb.on('connected', () => {
    console.log('Connected to Vendor DB (Surendra Hackathon Registrations)');
});

vendorDb.on('error', (err) => {
    console.error('Vendor DB connection error:', err.message);
});

module.exports = vendorDb;
