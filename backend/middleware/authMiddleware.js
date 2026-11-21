const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

exports.verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'No token provided, authorization denied.' });
        }

        const token = authHeader.split(' ')[1];
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || '8f4a3e2b9c7d1e5f8a0b3c6d9e2f5a8b1c4d7e0f3a6b9c2d5e8f1a4b7c0d3e6f');
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
