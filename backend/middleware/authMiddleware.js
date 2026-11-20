const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

exports.verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'No token provided, authorization denied.' });
        }

        const token = authHeader.split(' ')[1];
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, email }
        
        const admin = await Admin.findById(decoded.id).select('-password');
        if (!admin) {
            return res.status(401).json({ message: 'Token is valid, but user no longer exists.' });
        }
        
        req.admin = admin;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired.' });
        }
        return res.status(401).json({ message: 'Token is not valid.' });
    }
};

exports.requireAdmin = (req, res, next) => {
    if (!req.admin || req.admin.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }
    next();
};
