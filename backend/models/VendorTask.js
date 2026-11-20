const mongoose = require('mongoose');
const vendorDb = require('../config/vendorDb');

const taskCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        trim: true
    },
    questions: [{
        type: mongoose.Schema.Types.Mixed
    }],
    instructions: {
        type: String,
        trim: true,
        default: ''
    }
}, {
    timestamps: true,
    collection: 'global data'
});

const VendorTask = vendorDb.model('VendorTask', taskCategorySchema, 'global data');
const VendorTaskCollection = vendorDb.model('VendorTaskCollection', taskCategorySchema, 'tasks');

module.exports = {
    VendorTask,
    VendorTaskCollection
};
