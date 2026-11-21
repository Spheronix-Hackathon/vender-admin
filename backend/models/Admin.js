const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, default: null, trim: true },
    password: { type: String, required: true },
    role: { type: String, default: 'admin' },
    // OTP for 2FA login
    loginOtp: { type: String, default: null },
    loginOtpExpires: { type: Date, default: null },
    // OTP for forgot password
    resetOtp: { type: String, default: null },
    resetOtpExpires: { type: Date, default: null },
    isResetOtpVerified: { type: Boolean, default: false },
    // TOTP (Google Authenticator) fields
    totpSecret: { type: String, default: null },
    tempTotpSecret: { type: String, default: null },
    isTotpEnabled: { type: Boolean, default: false },
    last2FAResetAt: { type: Date, default: null },
    last2FAResetBy: { type: String, default: null },
    recoveryCodes: [{ type: String }]
}, { timestamps: true });

// Mongoose v7+ supports async pre-save without calling next()
adminSchema.pre('save', async function () {
    console.log('[MODEL] Pre-save hook triggered for Admin');
    if (!this.isModified('password')) {
        console.log('[MODEL] Password not modified, skipping hash');
        return;
    }
    console.log('[MODEL] Password modified, hashing...');
    this.password = await bcrypt.hash(this.password, 12);
    console.log('[MODEL] Hashing complete');
});

adminSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Admin', adminSchema);

