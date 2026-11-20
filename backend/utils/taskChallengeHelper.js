const { VendorTask: TaskCategory } = require('../models/VendorTask');

let cachedCategories = null;
let lastFetchTime = 0;

async function getTaskCategories() {
    const now = Date.now();
    if (cachedCategories && cachedCategories.length > 0 && (now - lastFetchTime < 60000)) {
        return cachedCategories;
    }
    try {
        const cats = await TaskCategory.find().lean();
        if (cats && cats.length > 0) {
            cachedCategories = cats;
            lastFetchTime = now;
            return cachedCategories;
        }
    } catch (err) {
        console.warn('[TASK_HELPER] Error loading TaskCategory:', err.message);
    }
    return cachedCategories || [];
}

function getSyncTaskCategories() {
    return cachedCategories || [];
}

/**
 * Resolves the challenge task for a registration document.
 * If the student selected a domain (like 'Full Stack Application') but has no challenge question assigned
 * (or task is identical to the track name), it deterministically assigns a challenge from TaskCategory.
 * ONLY when payment is completed. For pending students, it returns the domain track name only and 'Not Assigned' as task.
 */
function resolveTaskForStudent(reg, categories = [], isPaymentCompleted = undefined) {
    const cats = (categories && categories.length > 0) ? categories : (cachedCategories || []);

    const isGeneric = (val) => !val || /^(not assigned|n\/?a|none|null|undefined|-|—)$/i.test(String(val).trim());

    // 1. Check if student or document indicates 'ideathon' in ANY field
    const checkIdeathon = (str) => typeof str === 'string' && /^ideathon$/i.test(str.trim());
    const isIdeathon = (
        checkIdeathon(reg.project_selected) ||
        checkIdeathon(reg.task_selected) ||
        checkIdeathon(reg.track) ||
        checkIdeathon(reg.assigned_challenge?.category) ||
        checkIdeathon(reg.assigned_challenge?.title)
    );

    if (isIdeathon) {
        const ideathonChallenge = {
            category: 'Ideathon',
            title: 'Ideathon',
            description: ''
        };
        // Check if database document still holds mismatched legacy challenge (e.g. 'Bug Hunt')
        const currentCategory = String(reg.assigned_challenge?.category || '').trim();
        const currentTitle = String(reg.assigned_challenge?.title || '').trim();
        const currentTask = String(reg.task_selected || '').trim();
        const currentProj = String(reg.project_selected || '').trim();

        const needsSync = Boolean(
            (currentCategory && currentCategory.toLowerCase() !== 'ideathon') ||
            (currentTitle && currentTitle.toLowerCase() !== 'ideathon' && !isGeneric(currentTitle)) ||
            (currentTask && currentTask.toLowerCase() !== 'ideathon' && !isGeneric(currentTask)) ||
            (!currentProj || currentProj.toLowerCase() !== 'ideathon')
        );

        return {
            track: 'Ideathon',
            task: 'Ideathon',
            assigned_challenge: ideathonChallenge,
            isNewAssignment: needsSync
        };
    }

    // 2. Determine student's chosen domain: project_selected takes highest priority!
    let rawDomain = '';
    if (!isGeneric(reg.project_selected)) {
        rawDomain = String(reg.project_selected).trim();
    } else if (!isGeneric(reg.assigned_challenge?.category)) {
        rawDomain = String(reg.assigned_challenge.category).trim();
    } else if (!isGeneric(reg.track)) {
        rawDomain = String(reg.track).trim();
    }

    let domain = rawDomain;

    if (!domain || isGeneric(domain)) {
        return {
            track: 'N/A',
            task: 'Not Assigned',
            assigned_challenge: reg.assigned_challenge || null,
            isNewAssignment: false
        };
    }

    // Try to normalize domain to clean category name if matching category exists
    const dNorm = domain.toLowerCase().replace(/[^a-z0-9]/g, '');
    const matchedCat = cats.find(c => {
        if (!c || !c.name) return false;
        const cName = c.name.toLowerCase().trim();
        const cNorm = cName.replace(/[^a-z0-9]/g, '');
        return cName === domain.toLowerCase().trim() || cNorm === dNorm;
    });
    if (matchedCat) {
        domain = matchedCat.name;
    }

    // Determine payment completion status if not explicitly passed
    if (isPaymentCompleted === undefined) {
        const pId = reg.participant_id || reg.leader?.participant_id || '';
        const isIndv = pId.includes('INDV') || reg.participationMode === 'individual';
        if (isIndv) {
            const { isStudentPaymentApproved } = require('./paymentApprovalHelper');
            isPaymentCompleted = isStudentPaymentApproved(reg);
        } else {
            isPaymentCompleted = Boolean(
                reg.payment_status === 'success' || 
                reg.payment_status === 'captured' || 
                reg.payment?.status === 'success' || 
                reg.payment?.status === 'captured' ||
                reg.status === 'approved'
            );
        }
    }

    // IF PAYMENT IS NOT COMPLETED (Pending students):
    // Just show the domain track name only, and task as 'Not Assigned'. Never auto-assign challenge.
    if (!isPaymentCompleted) {
        return {
            track: domain,
            task: 'Not Assigned',
            assigned_challenge: reg.assigned_challenge || { category: domain, title: 'Not Assigned', description: '' },
            isNewAssignment: false
        };
    }

    // PAYMENT IS COMPLETED (Approved students):
    const currentCategory = String(reg.assigned_challenge?.category || '').trim();
    const currentTitle = String(reg.assigned_challenge?.title || '').trim();
    const currentTaskSelected = String(reg.task_selected || '').trim();

    // If assigned_challenge already belongs to the SAME domain and has a specific title, keep it
    const isSameDomain = currentCategory.toLowerCase() === domain.toLowerCase();
    const hasValidChallengeTitle = !isGeneric(currentTitle) && currentTitle.toLowerCase() !== domain.toLowerCase();
    if (isSameDomain && hasValidChallengeTitle) {
        return {
            track: domain,
            task: currentTitle,
            assigned_challenge: reg.assigned_challenge,
            isNewAssignment: false
        };
    }

    // Check if task_selected has a specific title for this domain
    const hasValidTaskSelected = !isGeneric(currentTaskSelected) && currentTaskSelected.toLowerCase() !== domain.toLowerCase();
    if (isSameDomain && hasValidTaskSelected) {
        return {
            track: domain,
            task: currentTaskSelected,
            assigned_challenge: reg.assigned_challenge || { category: domain, title: currentTaskSelected, description: '' },
            isNewAssignment: false
        };
    }

    // Need to assign a question from TaskCategory for this domain (or domain was changed!)
    const cat = matchedCat || cats.find(c => {
        if (!c || !c.name) return false;
        const cName = c.name.toLowerCase().trim();
        const dName = domain.toLowerCase().trim();
        const cNorm = cName.replace(/[^a-z0-9]/g, '');
        return cName === dName || 
               cName.includes(dName) || 
               dName.includes(cName) || 
               cNorm === dNorm ||
               cNorm.includes(dNorm) ||
               dNorm.includes(cNorm);
    });

    if (cat && Array.isArray(cat.questions) && cat.questions.length > 0) {
        const seed = String(reg._id || reg.participant_id || reg.rollNumber || reg.email || reg.mobile || reg.phone || 'seed');
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = (hash * 31 + seed.charCodeAt(i)) % cat.questions.length;
        }
        const qIndex = Math.abs(hash);
        const q = cat.questions[qIndex];
        const qName = typeof q === 'string' ? q : (q.name || q.title || '');
        const qDesc = typeof q === 'object' ? (q.description || '') : '';

        if (qName) {
            const newChallenge = {
                category: cat.name,
                title: qName,
                description: qDesc
            };
            return {
                track: cat.name,
                task: qName,
                assigned_challenge: newChallenge,
                isNewAssignment: true
            };
        }
    }

    return {
        track: domain,
        task: (!isGeneric(currentTitle) ? currentTitle : (!isGeneric(currentTaskSelected) ? currentTaskSelected : 'Not Assigned')),
        assigned_challenge: reg.assigned_challenge || null,
        isNewAssignment: false
    };
}

module.exports = {
    getTaskCategories,
    getSyncTaskCategories,
    resolveTaskForStudent
};
