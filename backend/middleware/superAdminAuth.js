const superAdmins = ['yashwanthkumar87657@gmail.com', 'dhanushsunny00@gmail.com'];

const isSuperAdminRequest = (req) => {
    const email = (req.admin?.email || req.user?.email || '').toLowerCase().trim();
    const role = (req.admin?.role || req.user?.role || '').toLowerCase().trim();
    return superAdmins.includes(email) || role === 'superadmin' || role === 'super_admin';
};

const superAdminAuth = (req, res, next) => {
    // This middleware expects verifyToken to have been called first, so req.user exists
    if (!req.user || !req.user.email) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!isSuperAdminRequest(req)) {
        return res.status(403).json({ success: false, message: 'Forbidden: Super Admin access required' });
    }

    next();
};

superAdminAuth.isSuperAdminRequest = isSuperAdminRequest;
superAdminAuth.superAdmins = superAdmins;

module.exports = superAdminAuth;
