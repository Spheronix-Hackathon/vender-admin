const VendorRegistration = require('../models/VendorRegistration');
const VendorCollege = require('../models/VendorCollege');
const VendorCategory = require('../models/VendorCategory');

// High-performance in-memory cache for dashboard analytics
let cachedDashboardStats = null;
let lastDashboardStatsTime = 0;
const DASHBOARD_CACHE_TTL = 60000; // 60 seconds (auto-cleared on new events)

const cachedRegistrationTimeline = {};
const cachedRevenueTimeline = {};
const cachedTracks = {};
const cachedColleges = {};
const cachedParticipation = {};

exports.clearDashboardCache = () => {
    cachedDashboardStats = null;
    lastDashboardStatsTime = 0;
    for (const k in cachedRegistrationTimeline) delete cachedRegistrationTimeline[k];
    for (const k in cachedRevenueTimeline) delete cachedRevenueTimeline[k];
    for (const k in cachedTracks) delete cachedTracks[k];
    for (const k in cachedColleges) delete cachedColleges[k];
    for (const k in cachedParticipation) delete cachedParticipation[k];
};

function getVendorApprovedCondition() {
    return {
        registrationCompleted: true,
        $or: [
            { 'payment.status': { $in: ['completed', 'success', 'paid'] } },
            { payment_status: { $in: ['completed', 'success', 'paid'] } }
        ]
    };
}

exports.getDashboardStats = async (req, res) => {
    try {
        const nowMs = Date.now();
        if (cachedDashboardStats && (nowMs - lastDashboardStatsTime < DASHBOARD_CACHE_TTL)) {
            return res.json(cachedDashboardStats);
        }

        let vendorRevenue = 0;
        let totalVendorStudents = 0;
        let approvedVendorStudents = 0;
        let pendingVendorPayments = 0;
        let vendorTeamAmount = 0;
        let vendorIndividualAmount = 0;
        let vendorTeamStudents = 0;
        let vendorIndividualStudents = 0;

        const vendorRegs = await VendorRegistration.find({}).lean();
        const totalRegistrations = vendorRegs.length;

        vendorRegs.forEach(reg => {
            const hasCompletedPayment = ['completed', 'success', 'paid'].includes(reg.payment_status?.toLowerCase()) ||
                ['completed', 'success', 'paid'].includes(reg.payment?.status?.toLowerCase());
            const isCompleted = reg.registrationCompleted === true && hasCompletedPayment;

            const teamSize = 1 + (Array.isArray(reg.team_members) ? reg.team_members.length : 0);
            const amt = Number(reg.payment?.amount) || (teamSize * 399);

            totalVendorStudents += teamSize;

            if (isCompleted) {
                approvedVendorStudents += teamSize;
                vendorRevenue += amt;
            } else {
                pendingVendorPayments += teamSize;
            }

            if (reg.participationMode === 'team') {
                vendorTeamAmount += amt;
                vendorTeamStudents += teamSize;
            } else {
                vendorIndividualAmount += amt;
                vendorIndividualStudents += teamSize;
            }
        });

        let registeredColleges = 0;
        try {
            registeredColleges = await VendorCollege.countDocuments();
        } catch (e) {}

        const successRate = totalVendorStudents > 0 
            ? ((approvedVendorStudents / totalVendorStudents) * 100).toFixed(2) 
            : '0.00';

        const result = {
            totalStudents: totalVendorStudents,
            totalRegistrations,
            totalVendorRegistrations: totalRegistrations,
            approvedStudents: approvedVendorStudents,
            totalIndividualStudents: vendorIndividualStudents,
            totalTeamStudents: vendorTeamStudents,
            totalVendorStudents,
            approvedVendorStudents,
            pendingVendorPayments,
            vendorTeamStudents,
            vendorIndividualStudents,
            vendorTeamAmount,
            vendorIndividualAmount,
            registeredColleges,
            successRate,
            registrationGrowth: '0',
            studentSectionRevenue: 0,
            individualApprovedRevenue: 0,
            vendorRevenue,
            vendorAmount: vendorRevenue,
            officerUploadedRevenue: 0,
            teamRevenue: vendorTeamAmount,
            individualRevenue: vendorIndividualAmount,
            nodalRevenue: 0,
            selfRegisteredRevenue: vendorIndividualAmount,
            officerUploadedStudents: 0,
            officerUploadedAmount: 0,
            officerUploadedReceipts: 0,
            officerSubmissionsCount: 0,
            pendingPayments: pendingVendorPayments
        };

        cachedDashboardStats = result;
        lastDashboardStatsTime = Date.now();

        res.json(result);
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.getRegistrationTimeline = async (req, res) => {
    try {
        const { source = 'all' } = req.query;
        const nowMs = Date.now();
        const cached = cachedRegistrationTimeline[source];
        if (cached && (nowMs - cached.time < 15000)) {
            return res.json(cached.data);
        }

        const pipeline = [
            {
                $match: {
                    $or: [
                        { registeredAt: { $ne: null } },
                        { createdAt: { $ne: null } }
                    ]
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: { $ifNull: ["$registeredAt", "$createdAt"] },
                            timezone: "+05:30"
                        }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ];

        const timeline = await VendorRegistration.aggregate(pipeline);
        cachedRegistrationTimeline[source] = { data: timeline, time: nowMs };
        res.json(timeline);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getTrackDistribution = async (req, res) => {
    try {
        const { source = 'all' } = req.query;
        const nowMs = Date.now();
        const cached = cachedTracks[source];
        if (cached && (nowMs - cached.time < 15000)) {
            return res.json(cached.data);
        }

        const pipeline = [
            {
                $project: {
                    track: {
                        $ifNull: [
                            "$project_selected",
                            { $ifNull: ["$assigned_challenge.category", "$task_selected"] }
                        ]
                    }
                }
            },
            {
                $match: {
                    track: { $ne: null, $nin: ['', 'null', 'undefined', 'N/A', 'na', '-'] }
                }
            },
            {
                $group: {
                    _id: "$track",
                    value: { $sum: 1 }
                }
            },
            { $sort: { value: -1 } }
        ];

        const results = await VendorRegistration.aggregate(pipeline);
        cachedTracks[source] = { data: results, time: nowMs };
        res.json(results);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getCollegeDistribution = async (req, res) => {
    try {
        const { source = 'all' } = req.query;
        const nowMs = Date.now();
        const cached = cachedColleges[source];
        if (cached && (nowMs - cached.time < 15000)) {
            return res.json(cached.data);
        }

        const pipeline = [
            {
                $project: {
                    col: {
                        $trim: {
                            input: {
                                $ifNull: ["$college", { $ifNull: ["$collegeName", "$leader.college"] }]
                            }
                        }
                    }
                }
            },
            {
                $match: {
                    col: { $ne: null, $nin: ['', 'null', 'undefined', 'N/A', 'na', '-', '--'] }
                }
            },
            {
                $group: {
                    _id: "$col",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 15 }
        ];

        const results = await VendorRegistration.aggregate(pipeline);
        cachedColleges[source] = { data: results, time: nowMs };
        res.json(results);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getParticipationTrends = async (req, res) => {
    try {
        const { source = 'all' } = req.query;
        const nowMs = Date.now();
        const cached = cachedParticipation[source];
        if (cached && (nowMs - cached.time < 15000)) {
            return res.json(cached.data);
        }

        const pipeline = [
            {
                $group: {
                    _id: "$participationMode",
                    count: { $sum: 1 }
                }
            }
        ];

        const results = await VendorRegistration.aggregate(pipeline);
        let teamCount = 0;
        let individualCount = 0;

        results.forEach(item => {
            const raw = String(item._id || '').toLowerCase().trim();
            if (raw.includes('team')) {
                teamCount += item.count;
            } else {
                individualCount += item.count;
            }
        });

        const trends = [
            { _id: 'team', count: teamCount },
            { _id: 'individual', count: individualCount }
        ];

        cachedParticipation[source] = { data: trends, time: nowMs };
        res.json(trends);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getRevenueTimeline = async (req, res) => {
    try {
        const { granularity = 'day', source = 'all' } = req.query;
        const cacheKey = `${source}_${granularity}`;
        const nowMs = Date.now();
        const cached = cachedRevenueTimeline[cacheKey];
        if (cached && (nowMs - cached.time < 15000)) {
            return res.json(cached.data);
        }

        let dateFormat = "%Y-%m-%d";
        if (granularity === 'minute') dateFormat = "%Y-%m-%d %H:%M";
        else if (granularity === 'hour') dateFormat = "%Y-%m-%d %H:00";
        else if (granularity === 'week') dateFormat = "%Y-W%U";
        else if (granularity === 'month') dateFormat = "%Y-%m";

        const pipeline = [
            { 
                $match: getVendorApprovedCondition()
            },
            {
                $project: {
                    dateVal: { $ifNull: ["$payment.timestamp", { $ifNull: ["$registeredAt", "$createdAt"] }] },
                    amount: {
                        $cond: {
                            if: { 
                                $gte: [
                                    { $ifNull: ["$payment.amount", 0] }, 
                                    { $multiply: [{ $add: [1, { $cond: { if: { $isArray: "$team_members" }, then: { $size: "$team_members" }, else: 0 } }] }, 399] }
                                ] 
                            },
                            then: "$payment.amount",
                            else: {
                                $multiply: [
                                    { $add: [1, { $cond: { if: { $isArray: "$team_members" }, then: { $size: "$team_members" }, else: 0 } }] },
                                    399
                                ]
                            }
                        }
                    }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: dateFormat, date: "$dateVal", timezone: "+05:30" } },
                    amount: { $sum: "$amount" }
                }
            },
            { $sort: { _id: 1 } }
        ];

        const timeline = await VendorRegistration.aggregate(pipeline);
        cachedRevenueTimeline[cacheKey] = { data: timeline, time: nowMs };
        res.json(timeline);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getAnalyticsSummary = async (req, res) => {
    try {
        const vendorRegs = await VendorRegistration.find({}).lean();
        const totalRegistrations = vendorRegs.length;
        let totalStudents = 0;
        let approved = 0;
        let revenue = 0;

        vendorRegs.forEach(reg => {
            const hasCompletedPayment = ['completed', 'success', 'paid'].includes(reg.payment_status?.toLowerCase()) ||
                ['completed', 'success', 'paid'].includes(reg.payment?.status?.toLowerCase());
            const isCompleted = reg.registrationCompleted === true && hasCompletedPayment;

            const teamSize = 1 + (Array.isArray(reg.team_members) ? reg.team_members.length : 0);
            totalStudents += teamSize;
            const amt = Number(reg.payment?.amount) || (teamSize * 399);

            if (isCompleted) {
                approved += teamSize;
                revenue += amt;
            }
        });

        const pending = Math.max(0, totalStudents - approved);

        const summaryData = {
            totalRegistrations,
            totalStudents,
            approvedStudents: approved,
            pendingStudents: pending,
            revenue
        };

        res.json({
            all: summaryData,
            students: summaryData,
            individual: summaryData
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
