const VendorRegistration = require('../models/VendorRegistration');
const VendorUser = require('../models/VendorUser');
const VendorCollege = require('../models/VendorCollege');
const VendorCategory = require('../models/VendorCategory');
const { VendorTask, VendorTaskCollection } = require('../models/VendorTask');
const { getTaskCategories, resolveTaskForStudent } = require('../utils/taskChallengeHelper');
const { calculateExamStatus } = require('../utils/examUtils');
const { buildDateMongoCondition } = require('../utils/dateHelper');
const { servePaymentReceipt } = require('../utils/receiptHelper');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Format VendorRegistration to full Student interface expected by IndividualStudentTable
 * Automatically assigns challenge task based on student's selected domain upon payment completion
 * The assigned task is visible to Admin, but kept hidden from the student unless explicitly released.
 */
const mapRegistrationToStudent = (reg, taskCategories = [], isAdminView = true) => {
    const pId = reg.participant_id || reg.leader?.participant_id || reg._id?.toString() || 'N/A';
    const detectedMode = pId.includes('INDV') ? 'individual' : (reg.participationMode || 'individual');

    const teamMembers = Array.isArray(reg.team_members) ? reg.team_members : [];
    const teamSize = 1 + teamMembers.length;
    const perHead = 399;
    let computedAmount = teamSize * perHead;
    if (reg.payment?.amount && Number(reg.payment.amount) > 0) {
        computedAmount = Number(reg.payment.amount);
    }

    const hasCompletedPayment = ['completed', 'success', 'paid'].includes(reg.payment_status?.toLowerCase()) ||
        ['completed', 'success', 'paid'].includes(reg.payment?.status?.toLowerCase());
    const isCompleted = reg.registrationCompleted === true && hasCompletedPayment;

    // Resolve task assignment based on student domain
    const taskInfo = resolveTaskForStudent(reg, taskCategories, isCompleted);

    // If payment is completed and task was newly resolved or missing in DB, asynchronously persist to document
    if (isCompleted && reg._id && (taskInfo.isNewAssignment || !reg.task_selected || reg.task_selected === 'Not Assigned')) {
        VendorRegistration.updateOne(
            { _id: reg._id },
            {
                $set: {
                    project_selected: taskInfo.track || reg.project_selected || 'General',
                    task_selected: taskInfo.task,
                    assigned_challenge: {
                        category: taskInfo.assigned_challenge?.category || taskInfo.track,
                        title: taskInfo.task,
                        description: taskInfo.assigned_challenge?.description || '',
                        is_visible: false // Only admin can see, hidden from student
                    },
                    is_task_visible: false, // Hidden from student
                    task_visible_to_student: false,
                    task_assigned_at: new Date()
                }
            }
        ).exec().catch(() => {});
        reg.task_selected = taskInfo.task;
        reg.project_selected = taskInfo.track;
    }

    const displayTrack = taskInfo.track || reg.project_selected || 'General';
    let displayTask = 'Not Assigned';

    if (isCompleted) {
        if (isAdminView) {
            // Admin sees the assigned challenge task
            displayTask = taskInfo.task || reg.task_selected || 'Not Assigned';
        } else {
            // Student only sees it if is_task_visible is true; otherwise hidden
            const isVisibleToStudent = Boolean(reg.is_task_visible || reg.task_visible_to_student || reg.assigned_challenge?.is_visible);
            displayTask = isVisibleToStudent ? (taskInfo.task || reg.task_selected || 'Not Assigned') : 'Pending Announcement';
        }
    }

    const githubLink = reg.githubLink ||
        reg.leader?.githubProfile ||
        reg.github_profile ||
        reg.github_link ||
        reg.github ||
        'N/A';

    return {
        _id: reg._id ? reg._id.toString() : '',
        student_id: pId,
        rollNumber: reg.rollNumber || reg.leader?.rollNumber || reg.roll_no || 'N/A',
        currentYear: reg.currentYear || reg.year || reg.leader?.currentYear || 'N/A',
        name: reg.fullName || reg.name || reg.leader?.name || 'N/A',
        email: reg.email || reg.leader?.email || 'N/A',
        college: reg.college || reg.leader?.college || reg.collegeName || 'N/A',
        branch: reg.branch || reg.leader?.branch || 'N/A',
        city: reg.city || reg.leader?.city || 'N/A',
        participation_mode: detectedMode,
        team_id: reg.team_id || reg.leader?.participant_id || 'N/A',
        phone: reg.mobile || reg.phone || reg.leader?.phone || reg.leader?.mobile || 'N/A',
        team_name: reg.team_name || null,
        leader: reg.leader || null,
        team_members: teamMembers.map(m => ({
            ...(typeof m === 'object' ? m : {}),
            college: (m && m.college) || reg.college || 'N/A',
            phone: (m && (m.phone || m.mobile)) || 'N/A'
        })),
        hackathon_track: displayTrack,
        task: displayTask,
        is_task_visible: Boolean(reg.is_task_visible || reg.task_visible_to_student),
        registration_date: reg.registeredAt || reg.createdAt || reg.payment?.timestamp || reg.registrationDate || null,
        status: isCompleted ? 'approved' : 'pending',
        is_reviewed: Boolean(reg.is_reviewed),
        Reviewedby: reg.Reviewedby || null,
        review: reg.feedback || reg.review || '',
        is_selected: Boolean(reg.is_selected),
        isStarted: Boolean(reg.isStarted),
        mail_sent: Boolean(reg.mail_sent || reg.is_mail_sent),
        mail_sent_at: reg.mail_sent_at || null,
        amount: computedAmount,
        examStartedBy: reg.examStartedBy || null,
        examStartedAt: reg.examStartedAt || null,
        startTime: reg.startTime || reg.examStartedAt || null,
        examDuration: reg.examDuration || 180 || null,
        githubLink,
        examStatus: reg.examStatus || (reg.is_submitted ? 'Submitted' : 'Not Started'),
        submittedAt: reg.submittedAt || null,
        user_feedback: reg.user_feedback || '',
        transaction_id: reg.transaction_id || reg.payment?.transaction_id || null,
        receipt: reg.payment?.receipt || reg.receipt || null,
        receipt_name: reg.payment?.receipt_name || reg.receipt_name || null,
        receipt_url: reg.receipt_url || reg.payment?.receipt_url || (reg.payment?.receipt ? `/api/vendor/${reg._id}/payment-receipt` : null)
    };
};

/**
 * Get all vendor registrations formatted as Student objects with full filtering
 */
exports.getVendorRegistrations = async (req, res) => {
    try {
        const {
            search = '',
            mode = '',
            college = '',
            branch = '',
            city = '',
            startDate = '',
            endDate = '',
            status_filter = '',
            exam_status_filter = '',
            github_link_status = '',
            payment_status = '',
            status = '',
            registrationStatus = '',
            sort = 'desc'
        } = req.query;

        const andConditions = [];

        // Search across fields
        if (search && search.trim()) {
            const escaped = escapeRegex(search.trim());
            const regex = new RegExp(escaped, 'i');
            andConditions.push({
                $or: [
                    { fullName: regex },
                    { email: regex },
                    { mobile: regex },
                    { phone: regex },
                    { city: regex },
                    { rollNumber: regex },
                    { college: regex },
                    { branch: regex },
                    { project_selected: regex },
                    { task_selected: regex },
                    { participant_id: regex },
                    { 'leader.name': regex },
                    { 'leader.email': regex },
                    { 'leader.mobile': regex },
                    { 'leader.phone': regex },
                    { 'leader.city': regex },
                    { 'leader.college': regex },
                    { 'leader.branch': regex },
                    { 'leader.rollNumber': regex },
                    { 'leader.participant_id': regex },
                    { 'payment.transaction_id': regex },
                    { transaction_id: regex }
                ]
            });
        }

        // Section status: 'pending' vs 'completed' vs 'approved'
        const sectionStatus = payment_status || status || registrationStatus;
        if (sectionStatus === 'pending') {
            andConditions.push({
                $or: [
                    { registrationCompleted: { $ne: true } },
                    {
                        $and: [
                            { payment_status: { $nin: ['completed', 'success', 'paid'] } },
                            { 'payment.status': { $nin: ['completed', 'success', 'paid'] } }
                        ]
                    }
                ]
            });
        } else if (sectionStatus === 'completed' || sectionStatus === 'approved') {
            andConditions.push({
                $and: [
                    { registrationCompleted: true },
                    {
                        $or: [
                            { payment_status: { $in: ['completed', 'success', 'paid'] } },
                            { 'payment.status': { $in: ['completed', 'success', 'paid'] } }
                        ]
                    }
                ]
            });
        }

        // Mode filter
        if (mode && mode !== 'all') {
            andConditions.push({ participationMode: mode.toLowerCase() });
        }

        // College filter
        if (college && college !== 'all') {
            const escaped = escapeRegex(college.trim());
            andConditions.push({
                $or: [
                    { college: { $regex: escaped, $options: 'i' } },
                    { 'leader.college': { $regex: escaped, $options: 'i' } }
                ]
            });
        }

        // Branch filter
        if (branch && branch !== 'all') {
            const escaped = escapeRegex(branch.trim());
            andConditions.push({
                $or: [
                    { branch: { $regex: escaped, $options: 'i' } },
                    { 'leader.branch': { $regex: escaped, $options: 'i' } }
                ]
            });
        }

        // City filter
        if (city && city !== 'all') {
            const escaped = escapeRegex(city.trim());
            andConditions.push({
                $or: [
                    { city: { $regex: escaped, $options: 'i' } },
                    { 'leader.city': { $regex: escaped, $options: 'i' } }
                ]
            });
        }

        // Date Range / Preset filter
        if (startDate || endDate) {
            const dateCond = buildDateMongoCondition(startDate, endDate);
            if (dateCond) {
                andConditions.push(dateCond);
            }
        }

        // Status review filter
        if (status_filter && status_filter !== 'all') {
            if (status_filter === 'reviewed') {
                andConditions.push({ is_reviewed: true });
            } else if (status_filter === 'selected') {
                andConditions.push({ is_selected: true });
            } else if (status_filter === 'pending') {
                andConditions.push({
                    $or: [
                        { is_reviewed: false },
                        { is_reviewed: { $exists: false } },
                        { is_reviewed: null }
                    ]
                });
            }
        }

        // Exam status filter
        if (exam_status_filter && exam_status_filter !== 'all') {
            if (exam_status_filter === 'submitted') {
                andConditions.push({
                    $or: [
                        { is_submitted: true },
                        { submittedAt: { $exists: true, $ne: null } },
                        { examStatus: 'Submitted' }
                    ]
                });
            } else if (exam_status_filter === 'not_submitted') {
                andConditions.push({
                    $and: [
                        { is_submitted: { $ne: true } },
                        { submittedAt: { $exists: false } },
                        { examStatus: { $ne: 'Submitted' } }
                    ]
                });
            }
        }

        // GitHub link filter
        if (github_link_status && github_link_status !== 'all') {
            if (github_link_status === 'genuine') {
                andConditions.push({
                    $or: [
                        { github_link: { $regex: 'github\\.com\\/[^\\/]+', $options: 'i' } },
                        { 'leader.githubProfile': { $regex: 'github\\.com\\/[^\\/]+', $options: 'i' } }
                    ]
                });
            } else if (github_link_status === 'not_genuine') {
                andConditions.push({
                    $or: [
                        { github_link: { $exists: false } },
                        { github_link: '' },
                        { github_link: { $not: /github\.com\/[^\/]+/i } }
                    ]
                });
            }
        }

        const query = andConditions.length > 0 ? { $and: andConditions } : {};
        const sortOrder = sort === 'asc' ? 1 : -1;
        const docs = await VendorRegistration.find(query).sort({ createdAt: sortOrder });

        const taskCategories = await getTaskCategories();
        const students = docs.map(doc => mapRegistrationToStudent(doc, taskCategories, true));

        let totalStudentParticipants = 0;
        docs.forEach(doc => {
            const teamSize = 1 + (Array.isArray(doc.team_members) ? doc.team_members.length : 0);
            totalStudentParticipants += teamSize;
        });

        res.status(200).json({
            success: true,
            total: totalStudentParticipants,
            totalStudents: totalStudentParticipants,
            totalRegistrations: docs.length,
            count: students.length,
            students,
            registrations: docs // backward-compatible
        });
    } catch (error) {
        console.error('Error fetching vendor registrations:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch vendor registrations', error: error.message });
    }
};

/**
 * Get filter options for dropdowns (colleges, branches, cities, dates)
 */
exports.getFilterOptions = async (req, res) => {
    try {
        const { payment_status } = req.query;
        const query = {};
        if (payment_status === 'pending') {
            query.$or = [
                { registrationCompleted: { $ne: true } },
                {
                    $and: [
                        { payment_status: { $nin: ['completed', 'success', 'paid'] } },
                        { 'payment.status': { $nin: ['completed', 'success', 'paid'] } }
                    ]
                }
            ];
        } else if (payment_status === 'completed' || payment_status === 'approved') {
            query.$and = [
                { registrationCompleted: true },
                {
                    $or: [
                        { payment_status: { $in: ['completed', 'success', 'paid'] } },
                        { 'payment.status': { $in: ['completed', 'success', 'paid'] } }
                    ]
                }
            ];
        }

        const regs = await VendorRegistration.find(query);
        const colleges = new Set();
        const branches = new Set();
        const cities = new Set();
        const dates = new Set();

        // Also fetch all official colleges from VendorCollege
        try {
            const allVendorColleges = await VendorCollege.find({}).select('name').sort({ sort_order: 1, name: 1 }).lean();
            allVendorColleges.forEach(c => {
                if (c.name && c.name.trim()) colleges.add(c.name.trim());
            });
        } catch (colErr) {
            console.warn('Warning reading vendor colleges for filter options:', colErr.message);
        }

        regs.forEach(r => {
            const col = r.college || r.leader?.college;
            if (col && col !== 'N/A') colleges.add(col.trim());

            const br = r.branch || r.leader?.branch;
            if (br && br !== 'N/A') branches.add(br.trim());

            const ct = r.city || r.leader?.city;
            if (ct && ct !== 'N/A') cities.add(ct.trim());

            const d = r.registeredAt || r.createdAt;
            if (d) {
                dates.add(new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }));
            }
        });

        // Also fetch all categories
        let categoriesList = [];
        try {
            const allCategories = await VendorCategory.find({}).select('name').sort({ name: 1 }).lean();
            categoriesList = allCategories.map(c => c.name).filter(Boolean);
        } catch (catErr) {}

        res.json({
            colleges: Array.from(colleges).sort(),
            branches: Array.from(branches).sort(),
            cities: Array.from(cities).sort(),
            dates: Array.from(dates),
            categories: categoriesList
        });
    } catch (err) {
        console.error('Error fetching vendor filter options:', err);
        res.status(500).json({ colleges: [], branches: [], cities: [], dates: [] });
    }
};

/**
 * Get aggregate statistics for the vendor dashboard section
 */
exports.getVendorStats = async (req, res) => {
    try {
        const [registrations, usersCount] = await Promise.all([
            VendorRegistration.find({}),
            VendorUser.countDocuments({})
        ]);

        let totalRegistrations = registrations.length;
        let pendingPayments = 0;
        let completedPayments = 0;
        let pendingStudentsCount = 0;
        let completedStudentsCount = 0;
        let totalRevenue = 0;
        let teamAmount = 0;
        let individualAmount = 0;
        let totalMembers = 0;
        let individualCount = 0;
        let teamCount = 0;
        let reviewedCount = 0;
        let selectedCount = 0;
        const collegeSet = new Set();

        registrations.forEach(reg => {
            const hasCompletedPayment = ['completed', 'success', 'paid'].includes(reg.payment_status?.toLowerCase()) ||
                ['completed', 'success', 'paid'].includes(reg.payment?.status?.toLowerCase());
            const isCompleted = reg.registrationCompleted === true && hasCompletedPayment;

            const teamSize = 1 + (Array.isArray(reg.team_members) ? reg.team_members.length : 0);
            totalMembers += teamSize;

            const amount = Number(reg.payment?.amount) || (teamSize * 399);

            if (isCompleted) {
                completedPayments++;
                completedStudentsCount += teamSize;
                totalRevenue += amount;
            } else {
                pendingPayments++;
                pendingStudentsCount += teamSize;
            }

            if (reg.participationMode === 'team') {
                teamCount++;
                teamAmount += amount;
            } else {
                individualCount++;
                individualAmount += amount;
            }

            const col = reg.college || reg.leader?.college;
            if (col && col !== 'N/A') collegeSet.add(col.trim());

            if (reg.is_reviewed) reviewedCount++;
            if (reg.is_selected) selectedCount++;
        });

        res.status(200).json({
            success: true,
            stats: {
                totalRegistrations,
                totalStudents: totalMembers,
                totalColleges: collegeSet.size,
                totalUsers: usersCount,
                pendingPayments,
                completedPayments,
                pendingStudentsCount,
                completedStudentsCount,
                totalRevenue,
                totalAmount: totalRevenue,
                teamAmount,
                individualAmount,
                totalMembers,
                individualCount,
                teamCount,
                reviewedCount,
                selectedCount
            }
        });
    } catch (error) {
        console.error('Error fetching vendor stats:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch vendor stats', error: error.message });
    }
};

/**
 * Get all vendor registered users
 */
exports.getVendorUsers = async (req, res) => {
    try {
        const users = await VendorUser.find({}).sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: users.length, users });
    } catch (error) {
        console.error('Error fetching vendor users:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch vendor users', error: error.message });
    }
};

/**
 * Get single vendor registration by ID
 */
exports.getVendorRegistrationById = async (req, res) => {
    try {
        const registration = await VendorRegistration.findById(req.params.id);
        if (!registration) {
            return res.status(404).json({ success: false, message: 'Vendor registration not found' });
        }
        const taskCategories = await getTaskCategories();
        const isAdmin = req.user?.role === 'admin' || req.user?.role === 'superadmin' || !req.headers['x-student-auth'];
        res.status(200).json({ success: true, registration: mapRegistrationToStudent(registration, taskCategories, isAdmin) });
    } catch (error) {
        console.error('Error fetching vendor registration by id:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch registration', error: error.message });
    }
};

/**
 * Mark a vendor student as completed
 * Automatically assigns challenge task based on student's selected domain
 * Stored with is_task_visible: false so it's only visible to Admin and hidden from student.
 */
exports.markAsCompleted = async (req, res) => {
    try {
        const { id } = req.params;
        const reg = await VendorRegistration.findById(id);
        if (!reg) {
            return res.status(404).json({ success: false, message: 'Vendor registration not found' });
        }

        const taskCategories = await getTaskCategories();
        const taskInfo = resolveTaskForStudent(reg, taskCategories, true);

        const updated = await VendorRegistration.findByIdAndUpdate(
            id,
            {
                $set: {
                    registrationCompleted: true,
                    payment_status: 'completed',
                    'payment.status': 'completed',
                    project_selected: taskInfo.track || reg.project_selected || 'General',
                    task_selected: taskInfo.task,
                    assigned_challenge: {
                        category: taskInfo.assigned_challenge?.category || taskInfo.track || 'General',
                        title: taskInfo.task,
                        description: taskInfo.assigned_challenge?.description || '',
                        is_visible: false // Hidden from student, only admin can see
                    },
                    is_task_visible: false, // Explicitly hidden from student
                    task_visible_to_student: false,
                    task_assigned_at: new Date(),
                    updatedAt: new Date()
                }
            },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: `Registration marked as completed and task "${taskInfo.task}" assigned successfully`,
            student: mapRegistrationToStudent(updated, taskCategories, true),
            registration: mapRegistrationToStudent(updated, taskCategories, true)
        });
    } catch (error) {
        console.error('Error marking as completed:', error);
        res.status(500).json({ success: false, message: 'Failed to update status', error: error.message });
    }
};

/**
 * Mark a vendor student as pending
 */
exports.markAsPending = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await VendorRegistration.findByIdAndUpdate(
            id,
            {
                $set: {
                    registrationCompleted: false,
                    payment_status: 'pending',
                    'payment.status': 'pending',
                    task_selected: 'Not Assigned',
                    'assigned_challenge.title': 'Not Assigned',
                    is_task_visible: false,
                    task_visible_to_student: false,
                    updatedAt: new Date()
                }
            },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Vendor registration not found' });
        }

        const taskCategories = await getTaskCategories();
        res.status(200).json({
            success: true,
            message: 'Student marked as pending',
            student: mapRegistrationToStudent(updated, taskCategories, true),
            registration: mapRegistrationToStudent(updated, taskCategories, true)
        });
    } catch (error) {
        console.error('Error marking as pending:', error);
        res.status(500).json({ success: false, message: 'Failed to update status', error: error.message });
    }
};

/**
 * Batch update students status (reviewed, selected, feedback)
 */
exports.updateStudentsStatus = async (req, res) => {
    try {
        const { updates } = req.body;
        if (!Array.isArray(updates)) {
            return res.status(400).json({ success: false, message: 'Array of updates required' });
        }

        for (const u of updates) {
            const setObj = {};
            if (u.is_reviewed !== undefined) setObj.is_reviewed = u.is_reviewed;
            if (u.is_selected !== undefined) setObj.is_selected = u.is_selected;
            if (u.Reviewedby !== undefined) setObj.Reviewedby = u.Reviewedby;
            if (u.review !== undefined) setObj.feedback = u.review;
            if (u.examStatus !== undefined) setObj.examStatus = u.examStatus;
            setObj.updatedAt = new Date();

            await VendorRegistration.findByIdAndUpdate(u.id, { $set: setObj });
        }

        res.status(200).json({ success: true, message: 'Statuses updated successfully' });
    } catch (error) {
        console.error('Error updating vendor statuses:', error);
        res.status(500).json({ success: false, message: 'Failed to update status', error: error.message });
    }
};

/**
 * Update vendor student details
 */
exports.updateStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body || {};

        // Whitelist allowed fields to prevent mass assignment / unauthorized field overwrites
        const allowedFields = [
            'fullName', 'email', 'mobile', 'phone', 'city', 'college', 'branch',
            'rollNumber', 'currentYear', 'project_selected', 'task_selected',
            'github_link', 'feedback', 'user_feedback', 'Reviewedby', 'is_reviewed',
            'is_selected', 'examStatus'
        ];

        const sanitizedUpdate = {};
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                sanitizedUpdate[field] = body[field];
            }
        }

        // Keep leader subdocument in sync if present
        if (body.fullName !== undefined) sanitizedUpdate['leader.name'] = body.fullName;
        if (body.email !== undefined) sanitizedUpdate['leader.email'] = body.email;
        if (body.mobile !== undefined || body.phone !== undefined) {
            const phoneVal = body.mobile || body.phone;
            sanitizedUpdate['leader.mobile'] = phoneVal;
            sanitizedUpdate['leader.phone'] = phoneVal;
        }
        if (body.city !== undefined) sanitizedUpdate['leader.city'] = body.city;
        if (body.college !== undefined) sanitizedUpdate['leader.college'] = body.college;
        if (body.branch !== undefined) sanitizedUpdate['leader.branch'] = body.branch;
        if (body.rollNumber !== undefined) sanitizedUpdate['leader.rollNumber'] = body.rollNumber;
        if (body.currentYear !== undefined) sanitizedUpdate['leader.currentYear'] = body.currentYear;

        sanitizedUpdate.updatedAt = new Date();

        const updated = await VendorRegistration.findByIdAndUpdate(id, { $set: sanitizedUpdate }, { new: true });
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Vendor student not found' });
        }
        const taskCategories = await getTaskCategories();
        res.status(200).json({ success: true, message: 'Student updated successfully', student: mapRegistrationToStudent(updated, taskCategories, true) });
    } catch (error) {
        console.error('Error updating vendor student:', error);
        res.status(500).json({ success: false, message: 'Failed to update student', error: error.message });
    }
};

/**
 * Delete single vendor registration
 */
exports.deleteVendorRegistration = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await VendorRegistration.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Vendor registration not found' });
        }

        res.status(200).json({ success: true, message: 'Vendor registration deleted successfully' });
    } catch (error) {
        console.error('Error deleting vendor registration:', error);
        res.status(500).json({ success: false, message: 'Failed to delete registration', error: error.message });
    }
};

/**
 * Bulk delete vendor registrations
 */
exports.bulkDeleteVendorRegistrations = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: 'Array of ids is required' });
        }

        const result = await VendorRegistration.deleteMany({ _id: { $in: ids } });
        res.status(200).json({
            success: true,
            message: `Deleted ${result.deletedCount} vendor registration(s) successfully`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Error bulk deleting vendor registrations:', error);
        res.status(500).json({ success: false, message: 'Failed to bulk delete registrations', error: error.message });
    }
};

/**
 * Start exam for selected vendor students
 */
exports.startExam = async (req, res) => {
    try {
        const { ids, examDuration = 180 } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: 'Array of student IDs required' });
        }

        const now = new Date();
        await VendorRegistration.updateMany(
            { _id: { $in: ids } },
            {
                $set: {
                    isStarted: true,
                    examStartedAt: now,
                    startTime: now.toISOString(),
                    examDuration,
                    examStartedBy: req.user?.email || 'admin',
                    examStatus: 'In Progress'
                }
            }
        );

        res.status(200).json({ success: true, message: `Exam started for ${ids.length} student(s)` });
    } catch (error) {
        console.error('Error starting vendor exam:', error);
        res.status(500).json({ success: false, message: 'Failed to start exam', error: error.message });
    }
};

/**
 * Reset MFA for a vendor student
 */
exports.resetStudentMFA = async (req, res) => {
    try {
        const { id } = req.params;
        await VendorRegistration.findByIdAndUpdate(id, {
            $unset: { mfaSecret: '', twoFactorEnabled: '', totpSecret: '' }
        });
        res.status(200).json({ success: true, message: 'MFA reset successfully' });
    } catch (error) {
        console.error('Error resetting MFA:', error);
        res.status(500).json({ success: false, message: 'Failed to reset MFA', error: error.message });
    }
};

/**
 * Serve payment receipt for a vendor registration
 */
exports.getPaymentReceipt = async (req, res) => {
    try {
        await servePaymentReceipt(req, res, VendorRegistration);
    } catch (error) {
        console.error('Error serving vendor payment receipt:', error);
        res.status(500).send('Error retrieving receipt: ' + error.message);
    }
};

/**
 * Get all colleges from Vendor DB
 */
exports.getVendorColleges = async (req, res) => {
    try {
        const colleges = await VendorCollege.find().sort({ sort_order: 1, name: 1 });
        res.status(200).json(colleges);
    } catch (error) {
        console.error('Error fetching vendor colleges:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch colleges', error: error.message });
    }
};

/**
 * Get all categories from Vendor DB
 */
exports.getVendorCategories = async (req, res) => {
    try {
        const categories = await VendorCategory.find().sort({ name: 1 });
        res.status(200).json(categories);
    } catch (error) {
        console.error('Error fetching vendor categories:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch categories', error: error.message });
    }
};

/**
 * Get all tasks / challenges from Vendor DB
 */
exports.getVendorTasks = async (req, res) => {
    try {
        const tasks = await VendorTask.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: tasks.length, tasks });
    } catch (error) {
        console.error('Error fetching vendor tasks:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch vendor tasks', error: error.message });
    }
};

/**
 * Export vendor registrations formatted for Excel
 */
exports.exportVendorRegistrations = async (req, res) => {
    try {
        const { status, payment_status } = req.query;
        const sectionStatus = status || payment_status;
        const query = {};

        if (sectionStatus === 'pending') {
            query.$or = [
                { registrationCompleted: { $ne: true } },
                {
                    $and: [
                        { payment_status: { $nin: ['completed', 'success', 'paid'] } },
                        { 'payment.status': { $nin: ['completed', 'success', 'paid'] } }
                    ]
                }
            ];
        } else if (sectionStatus === 'completed' || sectionStatus === 'approved') {
            query.$and = [
                { registrationCompleted: true },
                {
                    $or: [
                        { payment_status: { $in: ['completed', 'success', 'paid'] } },
                        { 'payment.status': { $in: ['completed', 'success', 'paid'] } }
                    ]
                }
            ];
        }

        const registrations = await VendorRegistration.find(query).sort({ createdAt: -1 });
        const exportData = registrations.map((r, index) => {
            const hasCompletedPayment = ['completed', 'success', 'paid'].includes(r.payment_status?.toLowerCase()) || ['completed', 'success', 'paid'].includes(r.payment?.status?.toLowerCase());
            const isCompleted = r.registrationCompleted === true && hasCompletedPayment;
            const paymentStatus = r.payment_status || r.payment?.status || (isCompleted ? 'completed' : 'pending');
            const amount = r.payment?.amount || 399;
            const mobile = r.mobile || r.phone || r.leader?.mobile || r.leader?.phone || '';
            const city = r.city || r.leader?.city || '';
            const college = r.college || r.leader?.college || '';
            const branch = r.branch || r.leader?.branch || '';
            const rollNo = r.rollNumber || r.leader?.rollNumber || '';
            const year = r.currentYear || r.leader?.currentYear || '';

            return {
                'S.No': index + 1,
                'Full Name': r.fullName || r.leader?.name || '',
                'Email': r.email || r.leader?.email || '',
                'Mobile': mobile,
                'Roll Number': rollNo,
                'Current Year': year,
                'College': college,
                'Branch': branch,
                'City': city,
                'Mode': r.participationMode || 'individual',
                'Project / Task': r.project_selected || r.task_selected || '',
                'Registration Status': isCompleted ? 'COMPLETED' : 'PENDING',
                'Payment Status': paymentStatus.toUpperCase(),
                'Amount': amount,
                'Payment Gateway': r.payment?.gateway || '',
                'Transaction ID': r.payment?.transaction_id || '',
                'Reviewed': r.is_reviewed ? 'Yes' : 'No',
                'Reviewed By': r.Reviewedby || '',
                'Feedback': r.feedback || '',
                'Selected': r.is_selected ? 'Yes' : 'No',
                'GitHub Link': r.github_link || '',
                'Registered Date': r.registeredAt ? new Date(r.registeredAt).toLocaleString('en-IN') : (r.registrationDate || '')
            };
        });

        res.status(200).json({ success: true, count: exportData.length, data: exportData });
    } catch (error) {
        console.error('Error exporting vendor registrations:', error);
        res.status(500).json({ success: false, message: 'Failed to export registrations', error: error.message });
    }
};
