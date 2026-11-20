const express = require('express');
const router = express.Router();
const {
    login,
    verifyLoginOTP,
    resendLoginOTP,
    forgotPassword,
    verifyResetOTP,
    resetPassword,
} = require('../controllers/authController');
const {
    setupTOTP,
    verifyTOTPSetup,
    disableTOTP,
    loginWithTOTP
} = require('../controllers/totpController');
const { loginLimiter, otpLimiter } = require('../utils/rateLimiter');
const { verifyToken } = require('../middleware/authMiddleware');
const Admin = require('../models/Admin');


// Login flow (2FA - Email)
router.post('/login', loginLimiter, login);
router.post('/verify-login-otp', otpLimiter, verifyLoginOTP);
router.post('/resend-login-otp', otpLimiter, resendLoginOTP);

// Login flow (2FA - TOTP)
router.post('/verify-totp', otpLimiter, loginWithTOTP);

// TOTP Setup and Management (Requires Authentication)
router.post('/setup-totp', verifyToken, setupTOTP);
router.post('/verify-totp-setup', verifyToken, verifyTOTPSetup);
router.post('/disable-totp', verifyToken, disableTOTP);

// Forgot password flow
router.post('/forgot-password', loginLimiter, forgotPassword);
router.post('/verify-reset-otp', otpLimiter, verifyResetOTP);
router.post('/reset-password', loginLimiter, resetPassword);

// Verify Token Endpoint (for frontend check)
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
        
        // Find and update the admin
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



