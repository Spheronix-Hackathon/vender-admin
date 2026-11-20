const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

exports.setupTOTP = async (req, res) => {
    try {
        // Requires user to be logged in (from authMiddleware)
        const adminId = req.user.id;
        const admin = await Admin.findById(adminId);
        
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found.' });
        }

        const secret = speakeasy.generateSecret({ length: 20, name: `Spheronix Admin (${admin.email})` });
        admin.tempTotpSecret = secret.base32;
        await admin.save();

        QRCode.toDataURL(secret.otpauth_url, (err, data_url) => {
            if (err) {
                return res.status(500).json({ message: 'Error generating QR code.' });
            }
            res.json({
                message: 'TOTP secret generated. Scan QR code to setup.',
                secret: secret.base32,
                qrCode: data_url
            });
        });
    } catch (err) {
        console.error('Setup TOTP Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.verifyTOTPSetup = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { token } = req.body;
        
        if (!token) return res.status(400).json({ message: 'Token is required.' });

        const admin = await Admin.findById(adminId);
        if (!admin || !admin.tempTotpSecret) {
            return res.status(400).json({ message: 'TOTP not initialized. Please click setup again.' });
        }

        const verified = speakeasy.totp.verify({
            secret: admin.tempTotpSecret,
            encoding: 'base32',
            token: token,
            window: 1
        });

        if (verified) {
            admin.isTotpEnabled = true;
            admin.totpSecret = admin.tempTotpSecret;
            admin.tempTotpSecret = null;
            await admin.save();
            return res.json({ message: 'TOTP setup successfully.' });
        } else {
            return res.status(400).json({ message: 'Invalid TOTP token.' });
        }
    } catch (err) {
        console.error('Verify TOTP Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.disableTOTP = async (req, res) => {
    try {
        const adminId = req.user.id;
        const admin = await Admin.findById(adminId);
        
        if (!admin) return res.status(404).json({ message: 'Admin not found.' });

        admin.isTotpEnabled = false;
        admin.totpSecret = null;
        admin.tempTotpSecret = null;
        await admin.save();

        res.json({ message: 'TOTP disabled successfully.' });
    } catch (err) {
        console.error('Disable TOTP Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.loginWithTOTP = async (req, res) => {
    try {
        const { email, token } = req.body;
        
        if (!email || !token) {
            return res.status(400).json({ message: 'Email and token are required.' });
        }

        const admin = await Admin.findOne({ email: email.trim().toLowerCase() });
        if (!admin) return res.status(401).json({ message: 'Invalid credentials.' });

        if (!admin.isTotpEnabled || !admin.totpSecret) {
            return res.status(400).json({ message: 'TOTP is not enabled for this account.' });
        }

        const verified = speakeasy.totp.verify({
            secret: admin.totpSecret,
            encoding: 'base32',
            token: token,
            window: 1
        });

        if (!verified) {
            return res.status(401).json({ message: 'Invalid TOTP token.' });
        }

        // Generate JWT Token
        const jwtToken = jwt.sign({ id: admin._id, email: admin.email, role: admin.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
        
        return res.status(200).json({ message: 'Login successful.', token: jwtToken });
    } catch (err) {
        console.error('Login TOTP Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};
