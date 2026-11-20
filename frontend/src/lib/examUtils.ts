/**
 * Robustly parses a date string, handling the " IST" suffix.
 * @param dateStr - Date string from the backend
 * @returns Date object or null
 */
export const parseExamDate = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr) return null;
    try {
        const datePart = dateStr.replace(/\s+IST$/i, '');
        const date = new Date(datePart);
        return isNaN(date.getTime()) ? null : date;
    } catch (e) {
        console.error("Error parsing exam date:", e);
        return null;
    }
};

/**
 * Calculates remaining time in seconds.
 * @param startTimeStr - Start time string
 * @param durationMinutes - Duration in minutes
 * @returns Seconds remaining (can be negative if expired)
 */
export const calculateRemainingTime = (startTimeStr: string | null | undefined, durationMinutes: number | null | undefined): number | null => {
    if (!startTimeStr || !durationMinutes) return null;
    
    const startTime = parseExamDate(startTimeStr);
    if (!startTime) return null;

    const endTime = startTime.getTime() + (durationMinutes * 60 * 1000);
    const now = new Date().getTime();
    
    return Math.max(0, Math.floor((endTime - now) / 1000));
};

/**
 * Determines if the exam is "Submitted" based on timer or other flags.
 * This should match the backend logic in calculateExamStatus.
 */
export const getFrontendExamStatus = (
    currentStatus: string, 
    startTime: string | null | undefined, 
    duration: number | null | undefined
): string => {
    const statusLower = (currentStatus || '').toLowerCase().trim();
    if (['submitted', 'completed', 'finished', 'success', 'true', 'yes', '1'].includes(statusLower)) {
        return 'Submitted';
    }
    
    // Check timer
    if (startTime && duration) {
        const remaining = calculateRemainingTime(startTime, duration);
        if (remaining !== null && remaining <= 0) return 'Submitted';
    }
    
    return currentStatus || 'Not Submitted';
};
