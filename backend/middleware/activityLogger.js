const { logAdminAction } = require('../utils/logger');

const activityLogger = (req, res, next) => {
    // Only intercept state-changing methods
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        
        // Exclude the login routes (since authController already logs them specifically and we don't want duplicate/password logs)
        if (req.originalUrl.includes('/api/auth/login') || req.originalUrl.includes('/api/auth/verify-login-otp')) {
            return next();
        }

        // We listen to the 'finish' event to only log if the request succeeded (or even if it failed, we can log it, but usually we want to log successful changes)
        res.on('finish', async () => {
            if (res.statusCode >= 200 && res.statusCode < 400) {
                // Ensure we have an identified admin making the request (e.g. from verifyToken)
                if (req.admin && req.admin.email) {
                    
                    const action = `${req.method} ${req.originalUrl || req.url}`;
                    
                    // Filter out sensitive fields
                    let sanitizedBody = { ...req.body };
                    if (sanitizedBody.password) sanitizedBody.password = '***';
                    if (sanitizedBody.newPassword) sanitizedBody.newPassword = '***';
                    if (sanitizedBody.confirmPassword) sanitizedBody.confirmPassword = '***';

                    let details = {
                        body: Object.keys(sanitizedBody).length ? sanitizedBody : undefined,
                        query: Object.keys(req.query).length ? req.query : undefined,
                        params: Object.keys(req.params).length ? req.params : undefined,
                    };

                    // Enrich logs with Vendor Student details instead of raw MongoDB IDs
                    try {
                        const VendorRegistration = require('../models/VendorRegistration');
                        
                        // For start-exam route
                        if ((action.includes('/api/vendor/start-exam') || action.includes('/api/vender/start-exam')) && details.body && Array.isArray(details.body.ids)) {
                            const students = await VendorRegistration.find({ _id: { $in: details.body.ids } }, 'fullName email');
                            details.body.students = students.map(s => `${s.fullName} (${s.email})`);
                            delete details.body.ids;
                        }
                        
                        // For update-status route
                        if ((action.includes('/api/vendor/update-status') || action.includes('/api/vender/update-status')) && details.body && Array.isArray(details.body.updates)) {
                            const ids = details.body.updates.map(u => u.id);
                            const students = await VendorRegistration.find({ _id: { $in: ids } }, 'fullName email');
                            const studentMap = students.reduce((acc, s) => {
                                acc[s._id.toString()] = `${s.fullName} (${s.email})`;
                                return acc;
                            }, {});
                            details.body.updates = details.body.updates.map(u => ({
                                ...u,
                                student: studentMap[u.id] || u.id,
                                id: undefined
                            }));
                        }
                    } catch (enrichError) {
                        console.error('Error enriching log with student details:', enrichError);
                    }

                    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

                    await logAdminAction(
                        req.admin.email,
                        req.admin._id,
                        action,
                        details,
                        ip
                    );
                }
            }
        });
    }
    next();
};

module.exports = activityLogger;
