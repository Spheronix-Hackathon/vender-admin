/**
 * Robustly parses a date string, handling the " IST" suffix and ensuring consistency.
 * @param {string} dateStr - Date string, potentially with " IST" suffix.
 * @returns {number|null} - Timestamp in ms, or null if invalid.
 */
const parseExamDate = (dateStr) => {
    if (!dateStr) return null;
    try {
        if (dateStr instanceof Date) return dateStr.getTime();

        const datePart = typeof dateStr === 'string' ? dateStr.replace(/\s+IST$/i, '') : dateStr;
        const date = new Date(datePart);
        
        if (isNaN(date.getTime())) return null;
        
        return date.getTime();
    } catch (e) {
        console.error("Error parsing exam date:", e);
        return null;
    }
};

/**
 * Determines the exam status based on registration data.
 * @param {Object} reg - Registration document
 * @param {number} [defaultDuration=0] - Fallback duration in minutes if not set on the reg
 * @returns {string} - 'Submitted' or 'Not Submitted'
 */
const calculateExamStatus = (reg, defaultDuration = 0) => {
    // 1. Check if definitely submitted via flags or dates
    const isActuallySubmitted =
        reg.is_submitted === true ||
        reg.is_submitted === 'true' ||
        (reg.submittedAt && reg.submittedAt !== null) ||
        (reg.leader?.is_submitted === true) ||
        (reg.leader?.is_submitted === 'true') ||
        (reg.leader?.submittedAt && reg.leader?.submittedAt !== null);

    if (isActuallySubmitted) return 'Submitted';

    // 2. Check for "Success" or other status indicators in text fields
    const statusText = String(
        reg.examStatus || 
        reg.leader?.examStatus || 
        ''
    ).toLowerCase().trim();
    
    const submissionKeywords = ['submitted', 'completed', 'finished', 'success', 'true', 'yes', '1', 'qualified', 'disqualified', 'started'];
    
    // Note: 'started' is included if the system considers starting as "submitted" in some contexts, 
    // but usually we want at least a timer check.
    if (submissionKeywords.includes(statusText)) {
        // If it's just "started", we keep checking timer
        if (statusText !== 'started') return 'Submitted';
    }

    // 3. Check for timer expiry
    const startTimeStamp = parseExamDate(reg.startTime || reg.examStartedAt);
    const durationMinutes = reg.examDuration || defaultDuration || 0;

    if (startTimeStamp && durationMinutes > 0) {
        const now = Date.now();
        const durationMs = durationMinutes * 60 * 1000;
        if (now - startTimeStamp > durationMs) {
            return 'Submitted';
        }
    }

    return 'Not Submitted';
};

module.exports = {
    parseExamDate,
    calculateExamStatus
};
