const express = require('express');
const router = express.Router();
const {
    login,
    confirm2FASetup,
    verify2FALogin,
    getAdminsList,
    resetAdmin2FA,
    forgotPassword,
    verifyResetOTP,
    resetPassword,
} = require('../controllers/authController');
const { loginLimiter, otpLimiter } = require('../utils/rateLimiter');
const { verifyToken } = require('../middleware/authMiddleware');
const superAdminAuth = require('../middleware/superAdminAuth');
const Admin = require('../models/Admin');

// Core Authentication & 2FA
router.post('/login', loginLimiter, login);
router.post('/confirm-2fa-setup', otpLimiter, confirm2FASetup);
router.post('/verify-2fa', otpLimiter, verify2FALogin);

// Backward-compatible alias for frontend
router.post('/verify-totp', otpLimiter, verify2FALogin);

// Super Admin 2FA Management (Requires Super Admin access)
router.get('/admins', verifyToken, superAdminAuth, getAdminsList);
router.post('/admin/reset-2fa', verifyToken, superAdminAuth, resetAdmin2FA);

// Password recovery endpoint
router.post('/forgot-password', loginLimiter, forgotPassword);
router.post('/verify-reset-otp', otpLimiter, verifyResetOTP);
router.post('/reset-password', loginLimiter, resetPassword);

// Verify Token Endpoint
router.get('/me', verifyToken, (req, res) => {
    res.json({ 
        user: {
            email: req.admin.email,
            username: req.admin.username,
            role: req.admin.role,
            isTotpEnabled: req.admin.isTotpEnabled
        }
    });
});

// Update Profile Endpoint
router.put('/profile', verifyToken, async (req, res) => {
    try {
        const { username } = req.body;
        
        const updatedAdmin = await Admin.findByIdAndUpdate(
            req.admin.id,
            { $set: { username: username || null } },
            { new: true, runValidators: true }
        );

        if (!updatedAdmin) {
            return res.status(404).json({ message: 'Admin not found.' });
        }

        const { logAdminAction } = require('../utils/logger');
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        await logAdminAction(updatedAdmin.email, updatedAdmin._id, 'UPDATE_PROFILE', { username }, ip);

        res.json({
            message: 'Profile updated successfully.',
            user: {
                email: updatedAdmin.email,
                username: updatedAdmin.username,
                role: updatedAdmin.role,
                isTotpEnabled: updatedAdmin.isTotpEnabled
            }
        });
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).json({ message: 'Server error updating profile.' });
    }
});

module.exports = router;
