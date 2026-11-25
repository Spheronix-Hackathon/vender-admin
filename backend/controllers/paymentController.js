const VendorRegistration = require('../models/VendorRegistration');
const { buildDateMongoCondition } = require('../utils/dateHelper');

exports.getAllPayments = async (req, res) => {
    try {
        const { page = 1, limit = 10, status = '', timeRange = 'all', date = 'all', startDate = '', endDate = '' } = req.query;

        let query = {};
        if (status) {
            if (status.toLowerCase() === 'completed' || status.toLowerCase() === 'success') {
                query.$and = [
                    { registrationCompleted: true },
                    {
                        $or: [
                            { 'payment.status': { $in: ['completed', 'success', 'paid'] } },
                            { payment_status: { $in: ['completed', 'success', 'paid'] } }
                        ]
                    }
                ];
            } else {
                query.$or = [
                    { registrationCompleted: { $ne: true } },
                    {
                        $and: [
                            { 'payment.status': { $nin: ['completed', 'success', 'paid'] } },
                            { payment_status: { $nin: ['completed', 'success', 'paid'] } }
                        ]
                    }
                ];
            }
        }

        // Apply time range filter on payment timestamp
        const now = new Date();
        if (timeRange !== 'all') {
            let sDate;
            switch (timeRange) {
                case 'minute':
                    sDate = new Date(now.getTime() - 60 * 1000);
                    break;
                case 'hours':
                    sDate = new Date(now.getTime() - 60 * 60 * 1000);
                    break;
                case 'daily':
                    sDate = new Date(now.setHours(0, 0, 0, 0));
                    break;
                case 'weekly':
                    sDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'monthly':
                    sDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
            }
            if (sDate) {
                query['payment.timestamp'] = { $gte: sDate };
            }
        }

        // Apply specific date filter
        if (date !== 'all') {
            const startOfDay = new Date(date);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            
            const dateCondition = {
                $or: [
                    { registeredAt: { $gte: startOfDay, $lte: endOfDay } },
                    { createdAt: { $gte: startOfDay, $lte: endOfDay } },
                    { 'payment.timestamp': { $gte: startOfDay, $lte: endOfDay } }
                ]
            };
            if (query.$or) {
                query = { $and: [query, dateCondition] };
            } else {
                Object.assign(query, dateCondition);
            }
        }

        // Apply custom date range filter
        if (startDate || endDate) {
            const dateCond = buildDateMongoCondition(startDate, endDate);
            if (dateCond) {
                if (query.$or || query.$and) {
                    query = { $and: [query, dateCond] };
                } else {
                    Object.assign(query, dateCond);
                }
            }
        }

        let sortOption = { 'payment.timestamp': -1, registeredAt: -1, createdAt: -1 }; 
        let registrationsQuery = VendorRegistration.find(query).sort(sortOption);
        
        let limitNum = parseInt(limit);
        if (limit !== 'all' && !isNaN(limitNum)) {
            registrationsQuery = registrationsQuery
                .limit(limitNum)
                .skip((page - 1) * limitNum);
        }

        const registrations = await registrationsQuery.lean();
        const count = await VendorRegistration.countDocuments(query);

        let totalRevenue = 0;
        const payments = registrations.map(reg => {
            const payment = reg.payment || {};
            const teamSize = 1 + (Array.isArray(reg.team_members) ? reg.team_members.length : 0);
            const perHead = 399;
            const amount = (payment.amount && Number(payment.amount) > 0)
                ? Number(payment.amount)
                : (teamSize * perHead);

            const hasCompletedPayment = ['completed', 'success', 'paid'].includes(payment.status?.toLowerCase()) ||
                ['completed', 'success', 'paid'].includes(reg.payment_status?.toLowerCase());
            const isSuccess = reg.registrationCompleted === true && hasCompletedPayment;

            if (isSuccess) {
                totalRevenue += amount;
            }

            const docId = reg._id ? reg._id.toString() : '';
            const txnId = payment.transaction_id || payment.order_id || reg.participant_id || docId || 'N/A';

            return {
                _id: docId || txnId,
                transaction_id: txnId,
                student_id: {
                    name: reg.fullName || reg.name || reg.leader?.name || 'Unknown Student',
                    email: reg.email || reg.leader?.email || 'N/A'
                },
                amount: amount,
                payment_method: payment.gateway || 'UPI',
                payment_status: isSuccess ? 'completed' : (payment.status || reg.payment_status || 'pending'),
                payment_date: payment.timestamp || reg.registeredAt || reg.createdAt || new Date()
            };
        });

        res.json({
            payments,
            totalRevenue,
            totalPages: limit === 'all' ? 1 : Math.ceil(count / limitNum),
            currentPage: parseInt(page),
            totalPayments: count
        });
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.getRevenueAnalytics = async (req, res) => {
    try {
        const revenue = await VendorRegistration.aggregate([
            {
                $match: {
                    registrationCompleted: true,
                    $or: [
                        { 'payment.status': { $in: ['completed', 'success', 'paid'] } },
                        { payment_status: { $in: ['completed', 'success', 'paid'] } }
                    ]
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: { $ifNull: ["$payment.timestamp", "$registeredAt", "$createdAt"] }
                        }
                    },
                    amount: { $sum: { $ifNull: ["$payment.amount", 399] } }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        res.json(revenue);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
