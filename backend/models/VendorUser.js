const mongoose = require('mongoose');
const vendorDb = require('../config/vendorDb');

const vendorUserSchema = new mongoose.Schema({
    name: { type: String },
    email: { type: String, required: true },
    googleId: { type: String },
    lastLoginAt: { type: Date },
    createdAt: { type: Date }
}, {
    collection: 'users',
    timestamps: true,
    strict: false
});

vendorUserSchema.index({ email: 1 });

module.exports = vendorDb.model('VendorUser', vendorUserSchema);
