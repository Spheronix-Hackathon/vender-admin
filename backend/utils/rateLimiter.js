const rateLimit = require('express-rate-limit');

exports.loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 login requests per `window`
    message: { message: 'Too many login attempts from this IP, please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

exports.otpLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5, // Limit each IP to 5 OTP verifications/requests per window
    message: { message: 'Too many OTP attempts, please try again after 5 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});
