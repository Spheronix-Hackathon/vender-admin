const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const Admin = require('../models/Admin');
const { logAdminAction } = require('../utils/logger');

// ─── Step 1: Login with Email & Password ──────────────────────────────────────
exports.login = async (req, res) => {
    try {
        let { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        email = email.trim().toLowerCase();
        password = password.trim();

        // Check against allowed emails whitelist
        const allowedEmailsEnv = process.env.ALLOWED_ADMIN_EMAILS;
        if (allowedEmailsEnv) {
            const allowedEmails = allowedEmailsEnv.split(',').map(e => e.trim().toLowerCase());
            if (allowedEmails.length > 0 && !allowedEmails.includes(email)) {
                console.log(`[AUTH] Login rejected: Email not in whitelist (${email})`);
                return res.status(403).json({ message: 'Email not authorized for admin access.' });
            }
        }

        console.log(`[AUTH] Checking database for admin: ${email}...`);
        let admin = await Admin.findOne({ email });
        console.log(`[AUTH] Database query complete. Admin found: ${!!admin}`);
        if (!admin) {
            const allowedEmailsEnv = process.env.ALLOWED_ADMIN_EMAILS;
            const allowedList = allowedEmailsEnv ? allowedEmailsEnv.split(',').map(e => e.trim().toLowerCase()) : [];
            if (allowedList.includes(email)) {
                console.log(`[AUTH] Auto-creating admin user for whitelisted email: ${email}`);
                const superAdmins = ['yashwanthkumar87657@gmail.com', 'dhanushsunny00@gmail.com'];
                const role = superAdmins.includes(email) ? 'superadmin' : 'admin';
                admin = new Admin({
                    email,
                    password: 'Spheronix@123$',
                    role,
                    isTotpEnabled: false
                });
                await admin.save();
                console.log(`[AUTH] Successfully auto-created admin: ${email} (${role})`);
            } else {
                console.log(`[AUTH] Login failed: User not found (${email})`);
                return res.status(401).json({ message: 'Invalid email or password.' });
            }
        }

        console.log(`[AUTH] Comparing password for ${email}...`);
        const isMatch = await admin.comparePassword(password);
        console.log(`[AUTH] Password comparison result: ${isMatch}`);
        
        if (!isMatch) {
            console.log(`[AUTH] Login failed: Password mismatch for ${email}.`);
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        // Case A: 2FA NOT configured yet (First-time registration / reset)
        if (!admin.isTotpEnabled || !admin.totpSecret) {
            console.log(`[AUTH] 2FA not enabled for ${email}. Generating QR code for setup...`);
            const secret = speakeasy.generateSecret({
                length: 20,
                name: `Spheronix Admin (${admin.email})`,
                issuer: 'Spheronix Hackathon'
            });

            admin.tempTotpSecret = secret.base32;
            await admin.save();

            const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

            return res.status(200).json({
                status: 'SETUP_2FA',
                email: admin.email,
                qrCode: qrCodeUrl,
                secretKey: secret.base32,
                message: 'First time setup: please scan the QR code in Google Authenticator or Microsoft Authenticator.'
            });
        }

        // Case B: Returning admin with 2FA enabled
        console.log(`[AUTH] 2FA active for ${email}. Requesting 6-digit Authenticator code.`);
        return res.status(200).json({
            status: 'REQUIRE_2FA',
            email: admin.email,
            message: 'Please enter the 6-digit code from your Authenticator app.'
        });
    } catch (err) {
        console.error('[AUTH] Login error detailed:', {
            message: err.message,
            stack: err.stack
        });
        return res.status(500).json({ 
            message: 'Server error during login.', 
            error: err.message
        });
    }
};

// ─── Step 2A: Confirm First-Time 2FA Setup ───────────────────────────────────
exports.confirm2FASetup = async (req, res) => {
    try {
        const { email, token } = req.body;
        if (!email || !token) {
            return res.status(400).json({ message: 'Email and 6-digit Authenticator code are required.' });
        }

        const admin = await Admin.findOne({ email: email.trim().toLowerCase() });
        if (!admin || !admin.tempTotpSecret) {
            return res.status(400).json({ message: '2FA session expired. Please enter your email and password again.' });
        }

        const verified = speakeasy.totp.verify({
            secret: admin.tempTotpSecret,
            encoding: 'base32',
            token: token.trim(),
            window: 2
        });

        if (!verified) {
            return res.status(400).json({ message: 'Invalid 6-digit code. Please check your phone time and app code.' });
        }

        admin.isTotpEnabled = true;
        admin.totpSecret = admin.tempTotpSecret;
        admin.tempTotpSecret = null;
        await admin.save();

        const jwtToken = jwt.sign(
            { id: admin._id, email: admin.email, role: admin.role },
            process.env.JWT_SECRET || '8f4a3e2b9c7d1e5f8a0b3c6d9e2f5a8b1c4d7e0f3a6b9c2d5e8f1a4b7c0d3e6f',
            { expiresIn: '8h' }
        );

        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        logAdminAction(admin.email, admin._id, 'SETUP_2FA_SUCCESS', { message: '2FA configured and verified successfully' }, ip).catch(() => {});

        console.log(`[AUTH] 2FA setup confirmed and activated for ${admin.email}`);
        return res.status(200).json({
            message: 'Two-factor authentication successfully configured.',
            token: jwtToken,
            user: { email: admin.email, role: admin.role, isTotpEnabled: true }
        });
    } catch (err) {
        console.error('Confirm 2FA Setup Error:', err);
        return res.status(500).json({ message: 'Server error confirming 2FA setup.' });
    }
};

// ─── Step 2B: Verify Returning 2FA Login ─────────────────────────────────────
exports.verify2FALogin = async (req, res) => {
    try {
        const { email, token } = req.body;
        if (!email || !token) {
            return res.status(400).json({ message: 'Email and 6-digit Authenticator code are required.' });
        }

        const admin = await Admin.findOne({ email: email.trim().toLowerCase() });
        if (!admin) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        if (!admin.isTotpEnabled || !admin.totpSecret) {
            return res.status(400).json({ message: '2FA is not set up. Please log in with password first.' });
        }

        const verified = speakeasy.totp.verify({
            secret: admin.totpSecret,
            encoding: 'base32',
            token: token.trim(),
            window: 2
        });

        if (!verified) {
            return res.status(401).json({ message: 'Invalid 6-digit code. Please check your Authenticator app and try again.' });
        }

        const jwtToken = jwt.sign(
            { id: admin._id, email: admin.email, role: admin.role },
            process.env.JWT_SECRET || '8f4a3e2b9c7d1e5f8a0b3c6d9e2f5a8b1c4d7e0f3a6b9c2d5e8f1a4b7c0d3e6f',
            { expiresIn: '8h' }
        );

        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        logAdminAction(admin.email, admin._id, 'LOGIN_2FA_SUCCESS', { message: 'Admin logged in via 2FA' }, ip).catch(() => {});

        console.log(`[AUTH] 2FA login verified for ${admin.email}`);
        return res.status(200).json({
            message: 'Login successful.',
            token: jwtToken,
            user: { email: admin.email, role: admin.role, isTotpEnabled: true }
        });
    } catch (err) {
        console.error('Verify 2FA Login Error:', err);
        return res.status(500).json({ message: 'Server error verifying 2FA.' });
    }
};

// ─── Super Admin: List All Admins ────────────────────────────────────────────
exports.getAdminsList = async (req, res) => {
    try {
        const admins = await Admin.find().select('email role isTotpEnabled createdAt updatedAt').sort({ email: 1 });
        return res.status(200).json(admins);
    } catch (err) {
        console.error('Get Admins List Error:', err);
        return res.status(500).json({ message: 'Server error fetching admin accounts.' });
    }
};

// ─── Super Admin: Reset 2FA for Junior Admin ─────────────────────────────────
exports.resetAdmin2FA = async (req, res) => {
    try {
        const { targetEmail } = req.body;
        if (!targetEmail) {
            return res.status(400).json({ message: 'Target email is required.' });
        }

        const cleanEmail = targetEmail.trim().toLowerCase();
        const targetAdmin = await Admin.findOne({ email: cleanEmail });
        if (!targetAdmin) {
            return res.status(404).json({ message: `Admin ${cleanEmail} not found.` });
        }

        targetAdmin.isTotpEnabled = false;
        targetAdmin.totpSecret = null;
        targetAdmin.tempTotpSecret = null;
        await targetAdmin.save();

        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const operatorEmail = req.user?.email || req.admin?.email;
        const operatorId = req.user?.id || req.admin?._id;
        logAdminAction(operatorEmail, operatorId, 'RESET_ADMIN_2FA', {
            targetEmail: cleanEmail,
            message: `Super Admin reset 2FA for ${cleanEmail}`
        }, ip).catch(() => {});

        console.log(`[AUTH] Super Admin ${operatorEmail} reset 2FA for ${cleanEmail}`);
        return res.status(200).json({
            message: `2FA reset successfully for ${cleanEmail}. They will be prompted to scan a new QR code on next login.`
        });
    } catch (err) {
        console.error('Reset Admin 2FA Error:', err);
        return res.status(500).json({ message: 'Server error resetting 2FA.' });
    }
};

// ─── Password Reset Helpers (For recovery if needed) ─────────────────────────
exports.forgotPassword = async (req, res) => {
    return res.status(400).json({ 
        message: 'Password reset via email is disabled. Please contact Super Admin (yashwanthkumar87657@gmail.com).' 
    });
};
exports.verifyResetOTP = async (req, res) => {
    return res.status(400).json({ message: 'Please contact Super Admin to reset credentials.' });
};
exports.resetPassword = async (req, res) => {
    return res.status(400).json({ message: 'Please contact Super Admin to reset credentials.' });
};
