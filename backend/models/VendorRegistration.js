const mongoose = require('mongoose');
const vendorDb = require('../config/vendorDb');

const vendorRegistrationSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    mobile: { type: String },
    phone: { type: String },
    city: { type: String },
    rollNumber: { type: String },
    currentYear: { type: String },
    college: { type: String },
    branch: { type: String },
    participationMode: { type: String, default: 'individual' },
    participant_id: { type: String },
    project_selected: { type: String },
    task_selected: { type: String },
    assigned_challenge: {
        category: { type: String },
        title: { type: String },
        description: { type: String },
        is_visible: { type: Boolean, default: false }
    },
    is_task_visible: { type: Boolean, default: false },
    task_visible_to_student: { type: Boolean, default: false },
    task_assigned_at: { type: Date },
    registrationCompleted: { type: Boolean, default: false },
    leader: {
        name: String,
        email: String,
        mobile: String,
        phone: String,
        city: String,
        rollNumber: String,
        currentYear: String,
        college: String,
        branch: String
    },
    payment: {
        gateway: String,
        status: String,
        transaction_id: String,
        order_id: String,
        amount: Number,
        currency: String,
        timestamp: Date,
        receipt: String
    },
    payment_status: { type: String, default: 'pending' },
    registeredAt: { type: Date },
    registrationDate: { type: String },
    team_members: [mongoose.Schema.Types.Mixed],
    total_members: { type: Number, default: 1 },
    is_reviewed: { type: Boolean, default: false },
    Reviewedby: { type: String, default: null },
    feedback: { type: String, default: '' },
    user_feedback: { type: String, default: null },
    is_selected: { type: Boolean, default: false },
    github_link: { type: String, default: '' },
    password: { type: String }
}, {
    collection: 'registrations',
    timestamps: true,
    strict: false
});

vendorRegistrationSchema.index({ createdAt: -1 });
vendorRegistrationSchema.index({ email: 1 });
vendorRegistrationSchema.index({ payment_status: 1 });

module.exports = vendorDb.model('VendorRegistration', vendorRegistrationSchema);
