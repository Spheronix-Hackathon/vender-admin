const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const Admin = require('../models/Admin');
const { logAdminAction } = require('../utils/logger');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generate6DigitOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

let cachedTransporter = null;
function createTransporter() {
    if (cachedTransporter) return cachedTransporter;

    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER || 'spheronixhackathon@gmail.com';
    const smtpPass = process.env.SMTP_PASSWORD || process.env.EMAIL_PASS || 'jtuqpfxfddztsjbv';
    const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST;

    const config = (smtpHost && smtpHost !== 'smtp.gmail.com') ? {
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '465'),
        secure: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '465') === 465,
        auth: { user: smtpUser, pass: smtpPass },
        pool: true,
        maxConnections: 3,
        connectionTimeout: 8000,
        greetingTimeout: 4000,
        socketTimeout: 10000,
    } : {
        service: 'gmail',
        auth: { user: smtpUser, pass: smtpPass },
        pool: true,
        maxConnections: 3,
        connectionTimeout: 8000,
        greetingTimeout: 4000,
        socketTimeout: 10000,
    };

    cachedTransporter = nodemailer.createTransport(config);
    return cachedTransporter;
}

async function sendOTPEmail(toEmail, otp, subject, context) {
    // Print OTP prominently to console/logs so admin can see and use it immediately
    console.log(`\n======================================================`);
    console.log(`  [AUTH OTP] Email: ${toEmail} | Code: >>> ${otp} <<<`);
    console.log(`======================================================\n`);

    const transporter = createTransporter();
    const fromAddress = process.env.EMAIL_FROM || process.env.MAIL_FROM || 'spheronixhackathon@gmail.com';
    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9f9fb; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #1d1d1f; font-size: 24px; margin: 0;">Spheronix Admin</h1>
        <p style="color: #86868b; margin: 8px 0 0;">${context}</p>
      </div>
      <div style="background: #fff; border-radius: 12px; padding: 32px; text-align: center; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">
        <p style="color: #1d1d1f; font-size: 14px; margin: 0 0 20px;">Your one-time password is:</p>
        <div style="background: #f5f5f7; border-radius: 10px; padding: 20px; letter-spacing: 12px; font-size: 36px; font-weight: 700; color: #007aff; font-family: monospace;">
          ${otp}
        </div>
        <p style="color: #86868b; font-size: 12px; margin: 20px 0 0;">This OTP expires in <strong>5 minutes</strong>. Do not share it with anyone.</p>
      </div>
      <p style="text-align: center; color: #86868b; font-size: 11px; margin-top: 20px;">If you did not request this, please ignore this email.</p>
    </div>`;

    try {
        await transporter.sendMail({
            from: `"Spheronix Admin" <${fromAddress}>`,
            to: toEmail,
            subject,
            html,
        });
        console.log(`[AUTH] OTP email sent successfully to ${toEmail}`);
    } catch (error) {
        console.error(`[AUTH] Notice sending email to ${toEmail}:`, error.message);
    }
}

// ─── Step 1: Login (verify credentials, send login OTP) ──────────────────────
exports.login = async (req, res) => {
    try {
        let { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ message: 'Email and password are required.' });

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
                    role
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
            console.log(`[AUTH] Login failed: Password mismatch for ${email}. Supplied: ${password.charAt(0)}...${password.slice(-1)}`);
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        if (admin.isTotpEnabled) {
            console.log(`[AUTH] TOTP is enabled for ${email}. Prompting for TOTP code.`);
            return res.status(200).json({ message: 'TOTP required.', requireTotp: true, email: admin.email });
        }

        // Generate and store login OTP
        console.log(`[AUTH] Generating OTP for ${email}...`);
        const otp = generate6DigitOTP();
        admin.loginOtp = otp;
        admin.loginOtpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        
        console.log(`[AUTH] Saving admin with new OTP...`);
        await admin.save();
        console.log(`[AUTH] Admin saved successfully.`);

        // Dispatch OTP email immediately (non-blocking for fast UI response)
        sendOTPEmail(
            admin.email,
            otp,
            'Spheronix Admin – Login Verification Code',
            'Verifying your login'
        ).catch(err => console.warn('[AUTH] Background email send notice:', err.message));

        return res.status(200).json({ message: 'OTP sent to your email. Please verify to continue.' });
    } catch (err) {
        console.error('[AUTH] Login error detailed:', {
            message: err.message,
            stack: err.stack,
            emailStatus: !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS)
        });
        return res.status(500).json({ 
            message: 'Server error during login.', 
            error: err.message,
            tip: 'Check your Render environment variables (EMAIL_HOST, EMAIL_USER, etc.)'
        });
    }
};

// ─── Step 2: Verify Login OTP (2FA) ─────────────────────────────────────────
exports.verifyLoginOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp)
            return res.status(400).json({ message: 'Email and OTP are required.' });

        const admin = await Admin.findOne({ email: email.trim().toLowerCase() });
        if (!admin)
            return res.status(401).json({ message: 'Admin not found.' });

        if (!admin.loginOtp || admin.loginOtp !== otp)
            return res.status(400).json({ message: 'Invalid OTP.' });

        if (new Date() > admin.loginOtpExpires)
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });

        // Clear OTP and issue JWT
        admin.loginOtp = null;
        admin.loginOtpExpires = null;
        await admin.save();

        const token = jwt.sign({ id: admin._id, email: admin.email, role: admin.role }, process.env.JWT_SECRET, { expiresIn: '8h' });

        // Log the successful login
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        await logAdminAction(admin.email, admin._id, 'LOGIN', { message: 'Admin logged in successfully via OTP' }, ip);

        return res.status(200).json({ message: 'Login successful.', token });
    } catch (err) {
        console.error('Verify login OTP error:', err);
        return res.status(500).json({ message: 'Server error during OTP verification.' });
    }
};

// ─── Resend Login OTP ────────────────────────────────────────────────────────
exports.resendLoginOTP = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email)
            return res.status(400).json({ message: 'Email is required.' });

        const admin = await Admin.findOne({ email: email.trim().toLowerCase() });
        if (!admin)
            return res.status(401).json({ message: 'Admin not found.' });

        const otp = generate6DigitOTP();
        admin.loginOtp = otp;
        admin.loginOtpExpires = new Date(Date.now() + 5 * 60 * 1000);
        await admin.save();

        // Dispatch OTP email immediately (non-blocking for fast UI response)
        sendOTPEmail(
            admin.email,
            otp,
            'Spheronix Admin – New Login Verification Code',
            'Resending your login OTP'
        ).catch(err => console.warn('[AUTH] Background resend email notice:', err.message));

        return res.status(200).json({ message: 'New OTP sent to your email.' });
    } catch (err) {
        console.error('Resend login OTP error:', err);
        return res.status(500).json({ message: 'Server error.' });
    }
};

// ─── Forgot Password – Request Reset OTP ─────────────────────────────────────
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email)
            return res.status(400).json({ message: 'Email is required.' });

        const admin = await Admin.findOne({ email: email.trim().toLowerCase() });
        if (!admin)
            return res.status(404).json({ message: 'No admin found with that email.' });

        const otp = generate6DigitOTP();
        admin.resetOtp = otp;
        admin.resetOtpExpires = new Date(Date.now() + 5 * 60 * 1000);
        admin.isResetOtpVerified = false;
        await admin.save();

        // Dispatch reset OTP email immediately (non-blocking for fast UI response)
        sendOTPEmail(
            admin.email,
            otp,
            'Spheronix Admin – Password Reset Code',
            'Requested a password reset'
        ).catch(err => console.warn('[AUTH] Background reset email notice:', err.message));

        return res.status(200).json({ message: 'Password reset OTP sent to your email.' });
    } catch (err) {
        console.error('Forgot password error:', err);
        return res.status(500).json({ message: 'Server error.' });
    }
};

// ─── Forgot Password – Verify Reset OTP ─────────────────────────────────────
exports.verifyResetOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp)
            return res.status(400).json({ message: 'Email and OTP are required.' });

        const admin = await Admin.findOne({ email: email.trim().toLowerCase() });
        if (!admin)
            return res.status(404).json({ message: 'Admin not found.' });

        if (!admin.resetOtp || admin.resetOtp !== otp)
            return res.status(400).json({ message: 'Invalid OTP.' });

        if (new Date() > admin.resetOtpExpires)
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });

        admin.isResetOtpVerified = true;
        await admin.save();

        return res.status(200).json({ message: 'OTP verified. You can now reset your password.' });
    } catch (err) {
        console.error('Verify reset OTP error:', err);
        return res.status(500).json({ message: 'Server error.' });
    }
};

// ─── Forgot Password – Reset Password ────────────────────────────────────────
exports.resetPassword = async (req, res) => {
    try {
        const { email, newPassword, confirmPassword } = req.body;
        if (!email || !newPassword || !confirmPassword)
            return res.status(400).json({ message: 'All fields are required.' });

        if (newPassword !== confirmPassword)
            return res.status(400).json({ message: 'Passwords do not match.' });

        if (newPassword.length < 8)
            return res.status(400).json({ message: 'Password must be at least 8 characters.' });

        const admin = await Admin.findOne({ email: email.trim().toLowerCase() });
        if (!admin)
            return res.status(404).json({ message: 'Admin not found.' });

        if (!admin.isResetOtpVerified)
            return res.status(403).json({ message: 'OTP not verified. Please verify the OTP first.' });

        admin.password = newPassword;
        admin.resetOtp = null;
        admin.resetOtpExpires = null;
        admin.isResetOtpVerified = false;
        await admin.save();

        return res.status(200).json({ message: 'Password reset successfully. You can now log in.' });
    } catch (err) {
        console.error('Reset password error:', err);
        return res.status(500).json({ message: 'Server error.' });
    }
};
