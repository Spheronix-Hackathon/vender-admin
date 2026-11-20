/**
 * Date helper utility to ensure all dates are consistently handled in Indian Standard Time (IST, UTC+05:30)
 * matching the user's display format (en-IN).
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const IST_TIMEZONE = '+05:30';

/**
 * Returns UTC Date objects for the start and end of the requested date range in IST (+05:30).
 * e.g. for '2026-10-01':
 *   start = 2026-09-30T18:30:00.000Z (which is 2026-10-01 00:00:00.000 IST)
 *   end   = 2026-10-01T18:29:59.999Z (which is 2026-10-01 23:59:59.999 IST)
 */
function getISTDateRange(startDateStr, endDateStr) {
    const startStr = (startDateStr || endDateStr || '').trim().toLowerCase();
    const endStr = (endDateStr || startDateStr || '').trim().toLowerCase();
    if (!startStr && !endStr) return null;

    if (startStr === 'today' || endStr === 'today') {
        const nowUtc = new Date();
        const nowIst = new Date(nowUtc.getTime() + IST_OFFSET_MS);
        const y = nowIst.getUTCFullYear();
        const m = nowIst.getUTCMonth();
        const d = nowIst.getUTCDate();
        const start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - IST_OFFSET_MS);
        const end = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - IST_OFFSET_MS);
        return { start, end };
    }

    if (startStr === 'week' || endStr === 'week') {
        const now = new Date();
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { start, end: now };
    }

    if (startStr === 'month' || endStr === 'month') {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0) - IST_OFFSET_MS);
        const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999) - IST_OFFSET_MS);
        return { start, end };
    }

    if (startStr === 'last_month' || startStr === 'lastmonth' || startStr === 'last-month' || endStr === 'last_month' || endStr === 'lastmonth' || endStr === 'last-month') {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const lastYear = month === 0 ? year - 1 : year;
        const lastMonth = month === 0 ? 11 : month - 1;
        const start = new Date(Date.UTC(lastYear, lastMonth, 1, 0, 0, 0, 0) - IST_OFFSET_MS);
        const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999) - IST_OFFSET_MS);
        return { start, end };
    }

    const parseToStartUtc = (str) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
            const [y, m, d] = str.split('-').map(Number);
            return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - IST_OFFSET_MS);
        }
        const d = new Date(str);
        if (isNaN(d.getTime())) return new Date(0);
        d.setUTCHours(0, 0, 0, 0);
        return d;
    };

    const parseToEndUtc = (str) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
            const [y, m, d] = str.split('-').map(Number);
            return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - IST_OFFSET_MS);
        }
        const d = new Date(str);
        if (isNaN(d.getTime())) return new Date();
        d.setUTCHours(23, 59, 59, 999);
        return d;
    };

    return {
        start: parseToStartUtc(startStr),
        end: parseToEndUtc(endStr)
    };
}

/**
 * Builds a MongoDB query condition matching documents whose effective registration date
 * falls within the IST range [start, end].
 * Resolves date in priority: registeredAt -> createdAt -> payment.timestamp
 */
function buildDateMongoCondition(startDateStr, endDateStr) {
    const range = getISTDateRange(startDateStr, endDateStr);
    if (!range) return null;

    const { start, end } = range;
    return {
        $or: [
            { registeredAt: { $gte: start, $lte: end } },
            {
                registeredAt: null,
                createdAt: { $gte: start, $lte: end }
            },
            {
                registeredAt: null,
                createdAt: null,
                'payment.timestamp': { $gte: start, $lte: end }
            }
        ]
    };
}

module.exports = {
    IST_OFFSET_MS,
    IST_TIMEZONE,
    getISTDateRange,
    buildDateMongoCondition
};
