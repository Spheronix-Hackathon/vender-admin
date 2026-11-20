const mongoose = require('mongoose');
const vendorDb = require('../config/vendorDb');

const collegeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    name_lc: {
        type: String,
        trim: true,
        lowercase: true
    },
    code: {
        type: String,
        trim: true
    },
    is_other: {
        type: Boolean,
        default: false
    },
    sort_order: {
        type: Number,
        default: 1000
    },
    source: {
        type: String,
        default: 'admin_dashboard'
    }
}, { timestamps: true });

module.exports = vendorDb.model('VendorCollege', collegeSchema, 'colleges');
