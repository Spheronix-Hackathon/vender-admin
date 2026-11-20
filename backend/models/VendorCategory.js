const mongoose = require('mongoose');
const vendorDb = require('../config/vendorDb');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    }
}, { timestamps: true });

module.exports = vendorDb.model('VendorCategory', categorySchema, 'categories');
