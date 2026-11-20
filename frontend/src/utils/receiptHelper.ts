/**
 * Utility to safely parse, convert, display, and download payment receipts (PDFs & Images).
 * Completely eliminates InvalidCharacterError: Failed to execute 'atob' on 'Window'
 * and solves browser security restrictions when opening data: URLs in a new tab.
 */

export interface ReceiptInfo {
    rawUrl: string;
    blobUrl: string;
    dataUrl?: string;
    isPdf: boolean;
    mimeType: string;
    filename: string;
    isGoogleDrive?: boolean;
    googleDriveFileId?: string;
    googleDrivePreviewUrl?: string;
    googleDriveDownloadUrl?: string;
    googleDriveDirectImgUrl?: string;
}

/**
 * Extracts the file ID from a Google Drive URL.
 */
export function extractGoogleDriveFileId(url?: string | null): string | null {
    if (!url || typeof url !== 'string') return null;
    if (!url.includes('drive.google.com') && !url.includes('docs.google.com') && !url.includes('googleusercontent.com')) return null;

    const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i);
    if (m1 && m1[1]) return m1[1];

    const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
    if (m2 && m2[1]) return m2[1];

    const m3 = url.match(/\/d\/([a-zA-Z0-9_-]+)/i);
    if (m3 && m3[1]) return m3[1];

    return null;
}

/**
 * Converts a Base64 string to a Blob in memory safely in chunks.
 */
export function base64ToBlob(base64String: string, mimeType: string): Blob | null {
    if (!base64String || typeof window === 'undefined') return null;
    try {
        let clean = base64String.trim();
        const commaIdx = clean.indexOf(',');
        if (commaIdx !== -1 && clean.substring(0, commaIdx).includes('base64')) {
            clean = clean.substring(commaIdx + 1);
        }
        while (clean.includes(';base64,')) {
            const idx = clean.indexOf(';base64,');
            clean = clean.substring(idx + 8);
        }
        if (clean.includes('%')) {
            try { clean = decodeURIComponent(clean); } catch (e) {}
        }
        clean = clean.replace(/[\r\n\t\s]/g, '').replace(/-/g, '+').replace(/_/g, '/');
        const rem = clean.length % 4;
        if (rem === 2) clean += '==';
        else if (rem === 3) clean += '=';
        else if (rem === 1) clean = clean.slice(0, -1);

        const byteCharacters = window.atob(clean);
        const byteNumbers = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }

        return new Blob([byteNumbers], { type: mimeType });
    } catch (err) {
        console.warn('base64ToBlob conversion error:', err);
        return null;
    }
}

/**
 * Parses and sanitizes a raw receipt input (Base64 or URL) into a ReceiptInfo object.
 */
export function parseAndCreateReceiptBlob(
    rawInput?: string | null,
    receiptName?: string | null,
    studentId?: string
): ReceiptInfo | null {
    if (!rawInput || typeof rawInput !== 'string') return null;

    let input = rawInput.trim();
    if (!input) return null;

    // Strip wrapping quotes
    input = input.replace(/^["']+|["']+$/g, '').trim();

    // Sanitize any description/text prefix accidentally prepended (e.g., "payment recipt link will be :data:...")
    const dataIndex = input.indexOf('data:');
    const httpIndex = input.search(/https?:\/\//i);
    const jvberiIndex = input.indexOf('JVBERi');
    const jpegIndex = input.indexOf('/9j/');
    const pngIndex = input.indexOf('iVBORw0K');

    if (dataIndex !== -1 && (httpIndex === -1 || dataIndex < httpIndex)) {
        input = input.substring(dataIndex);
    } else if (httpIndex !== -1 && (dataIndex === -1 || httpIndex < dataIndex)) {
        input = input.substring(httpIndex);
    } else if (jvberiIndex !== -1 && jvberiIndex > 0) {
        input = input.substring(jvberiIndex);
    } else if (jpegIndex !== -1 && jpegIndex > 0) {
        input = input.substring(jpegIndex);
    } else if (pngIndex !== -1 && pngIndex > 0) {
        input = input.substring(pngIndex);
    }

    const name = String(receiptName || '').toLowerCase();

    // Prepend protocol if protocol-relative or Supabase / media host
    if (input.startsWith('//')) {
        input = 'https:' + input;
    } else if (/^(drive\.google\.com|res\.cloudinary\.com|lh3\.googleusercontent\.com|[a-z0-9.-]+\.supabase\.co|[a-z0-9.-]+\.s3[a-z0-9.-]*\.amazonaws\.com)/i.test(input)) {
        input = 'https://' + input;
    }

    // Resolve Supabase storage path or filename if raw filename was provided
    const SUPABASE_BASE = 'https://nxmksgveznvjajuscplq.supabase.co';
    if (/^(students-payment-receipts|student-payment-receipts|student-receipts|receipts)\//i.test(input)) {
        const clean = input.replace(/^\/?(students-payment-receipts|student-payment-receipts|student-receipts|receipts)\//i, '');
        let bucket = 'students-payment-receipts';
        if (input.toLowerCase().startsWith('receipts')) bucket = 'receipts';
        else if (input.toLowerCase().startsWith('student-receipts')) bucket = 'student-receipts';
        else if (input.toLowerCase().startsWith('student-payment-receipts')) bucket = 'student-payment-receipts';
        input = `${SUPABASE_BASE}/storage/v1/object/public/${bucket}/${clean}`;
    } else if (!input.startsWith('http') && !input.startsWith('/') && !input.startsWith('data:') && (/\.(jpe?g|png|webp|pdf)$/i.test(input) || /^\d{10,}_/i.test(input) || /^SPX_/i.test(input))) {
        if (studentId) {
            input = `/api/individual-students/${studentId}/payment-receipt`;
        } else {
            input = `${SUPABASE_BASE}/storage/v1/object/public/students-payment-receipts/${input}`;
        }
    }

    // Check if input is a Google Drive link
    const gDriveId = extractGoogleDriveFileId(input);
    if (gDriveId) {
        const isPdf = name.endsWith('.pdf') || input.toLowerCase().includes('.pdf');
        const defaultExt = isPdf ? 'pdf' : (name.endsWith('.png') ? 'png' : 'jpg');
        const previewUrl = `https://drive.google.com/file/d/${gDriveId}/preview`;
        const downloadUrl = `https://drive.google.com/uc?export=download&id=${gDriveId}`;
        const directImgUrl = `https://lh3.googleusercontent.com/d/${gDriveId}`;
        const originalViewUrl = input.includes('view') ? input : `https://drive.google.com/file/d/${gDriveId}/view?usp=sharing`;

        return {
            rawUrl: originalViewUrl,
            blobUrl: previewUrl,
            dataUrl: directImgUrl,
            isPdf,
            mimeType: isPdf ? 'application/pdf' : (name.endsWith('.png') ? 'image/png' : 'image/jpeg'),
            filename: receiptName || `receipt_${studentId || 'doc'}.${defaultExt}`,
            isGoogleDrive: true,
            googleDriveFileId: gDriveId,
            googleDrivePreviewUrl: previewUrl,
            googleDriveDownloadUrl: downloadUrl,
            googleDriveDirectImgUrl: directImgUrl
        };
    }

    const isDirectWebUrl = input.startsWith('http://') || input.startsWith('https://');
    const isApiPath = input.startsWith('/');

    // Handle normal external URLs or backend API endpoints
    if (isDirectWebUrl || isApiPath) {
        let fullUrl = input;
        if (isApiPath && typeof window !== 'undefined') {
            const host = window.location.hostname || 'localhost';
            const protocol = window.location.protocol;
            if (protocol === 'https:' || host.includes('trycloudflare.com') || host.includes('cloudflare')) {
                fullUrl = input;
            } else {
                const apiBase = process.env.NEXT_PUBLIC_API_URL 
                    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, '') 
                    : `http://${host}:5050`;
                fullUrl = `${apiBase}${input}`;
            }
        }
        const isExplicitImage = name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.webp') ||
                                fullUrl.toLowerCase().includes('.jpg') || fullUrl.toLowerCase().includes('.jpeg') || fullUrl.toLowerCase().includes('.png') || fullUrl.toLowerCase().includes('.webp');
        const isPdf = !isExplicitImage && (name.endsWith('.pdf') || fullUrl.toLowerCase().includes('.pdf') || fullUrl.includes('/receipt-pdf') || fullUrl.includes('/payment-receipt'));
        const defaultExt = isPdf ? 'pdf' : (name.endsWith('.png') ? 'png' : 'jpg');
        return {
            rawUrl: fullUrl,
            blobUrl: fullUrl,
            dataUrl: fullUrl,
            isPdf,
            mimeType: isPdf ? 'application/pdf' : (name.endsWith('.png') ? 'image/png' : 'image/jpeg'),
            filename: receiptName || `receipt_${studentId || 'doc'}.${defaultExt}`
        };
    }

    // Strip duplicate or nested data prefixes if present
    while (/^data:[^;,]+;base64,data:[^;,]+;base64,/i.test(input)) {
        input = input.replace(/^data:[^;,]+;base64,/i, '');
    }

    // Extract Base64 payload and MIME header
    let mimeType = '';
    let base64 = input;

    if (base64.startsWith('data:')) {
        const commaIndex = base64.indexOf(',');
        if (commaIndex !== -1) {
            const header = base64.substring(5, commaIndex).toLowerCase();
            if (header.includes('pdf')) {
                mimeType = 'application/pdf';
            } else if (header.includes('png')) {
                mimeType = 'image/png';
            } else if (header.includes('jpeg') || header.includes('jpg')) {
                mimeType = 'image/jpeg';
            } else if (header.includes('webp')) {
                mimeType = 'image/webp';
            }
            base64 = base64.substring(commaIndex + 1);
        }
    }

    // Also strip any residual nested ;base64, headers in payload
    while (base64.includes(';base64,')) {
        const idx = base64.indexOf(';base64,');
        base64 = base64.substring(idx + 8);
    }

    // Decode URL encoding if present (e.g. %20, %0A, %2B, %2F)
    if (base64.includes('%')) {
        try {
            base64 = decodeURIComponent(base64);
        } catch (e) {
            // Ignore URI malformed error
        }
    }

    // Strip ALL whitespace, newlines, carriage returns, tabs and spaces
    base64 = base64.replace(/[\r\n\t\s]/g, '');

    // Convert URL-safe base64 (- and _) to standard (+ and /)
    base64 = base64.replace(/-/g, '+').replace(/_/g, '/');

    // Detect true MIME type via magic bytes FIRST (magic bytes are ground truth)
    if (base64.startsWith('/9j/')) {
        mimeType = 'image/jpeg';
    } else if (base64.startsWith('iVBORw0K')) {
        mimeType = 'image/png';
    } else if (base64.startsWith('JVBERi')) {
        mimeType = 'application/pdf';
    } else if (base64.startsWith('UklGR')) {
        mimeType = 'image/webp';
    } else if (base64.startsWith('R0lGOD')) {
        mimeType = 'image/gif';
    } else if (name.endsWith('.pdf')) {
        mimeType = 'application/pdf';
    } else if (name.endsWith('.png')) {
        mimeType = 'image/png';
    } else if (name.endsWith('.webp')) {
        mimeType = 'image/webp';
    } else if (name.endsWith('.jpg') || name.endsWith('.jpeg')) {
        mimeType = 'image/jpeg';
    } else if (!mimeType) {
        mimeType = 'image/jpeg';
    }

    const isPdf = mimeType === 'application/pdf';

    // Fix Base64 padding if needed
    const remainder = base64.length % 4;
    if (remainder === 2) {
        base64 += '==';
    } else if (remainder === 3) {
        base64 += '=';
    } else if (remainder === 1) {
        base64 = base64.slice(0, -1);
    }

    const fullDataUrl = `data:${mimeType};base64,${base64}`;

    // Attempt to convert to Blob URL for fast browser rendering
    let blobUrl = fullDataUrl;
    let blob = base64ToBlob(base64, mimeType);

    if (!blob) {
        // Fallback: clean only valid Base64 characters and retry
        const cleanOnly = base64.replace(/[^A-Za-z0-9+/=]/g, '');
        blob = base64ToBlob(cleanOnly, mimeType);
    }

    if (blob) {
        try {
            blobUrl = URL.createObjectURL(blob);
        } catch (e) {
            blobUrl = fullDataUrl;
        }
    }

    const defaultExt = isPdf ? 'pdf' : (mimeType === 'image/png' ? 'png' : 'jpg');
    return {
        rawUrl: input,
        blobUrl,
        dataUrl: fullDataUrl,
        isPdf,
        mimeType,
        filename: receiptName || `receipt_${studentId || 'doc'}.${defaultExt}`
    };
}

/**
 * Resolves a relative API endpoint (like /api/individual-students/.../payment-receipt) to a full URL
 */
export function resolveFullReceiptUrl(url: string): string {
    if (typeof window === 'undefined' || !url || !url.startsWith('/')) return url;
    const host = window.location.hostname || 'localhost';
    const protocol = window.location.protocol;
    if (protocol === 'https:' || host.includes('trycloudflare.com') || host.includes('cloudflare')) {
        return url;
    }
    const apiBase = process.env.NEXT_PUBLIC_API_URL 
        ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, '') 
        : `http://${host}:5050`;
    return `${apiBase}${url}`;
}

/**
 * Downloads the receipt file directly to the user's computer.
 */
export function downloadReceiptFile(blobUrlOrData: string, filename: string) {
    if (typeof window === 'undefined' || !blobUrlOrData) return;
    const resolvedUrl = resolveFullReceiptUrl(blobUrlOrData);

    try {
        const gDriveId = extractGoogleDriveFileId(resolvedUrl);
        if (gDriveId) {
            window.open(`https://drive.google.com/uc?export=download&id=${gDriveId}`, '_blank');
            return;
        }

        // If it's an external web URL (e.g. Supabase Storage or Backend API), fetch as blob for seamless direct download
        if (resolvedUrl.startsWith('http://') || resolvedUrl.startsWith('https://')) {
            fetch(resolvedUrl)
                .then(res => {
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return res.blob();
                })
                .then(blob => {
                    const tempUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = tempUrl;
                    a.download = filename || 'receipt.jpg';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(tempUrl), 2000);
                })
                .catch(() => {
                    const a = document.createElement('a');
                    a.href = resolvedUrl;
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    a.download = filename || 'receipt.jpg';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                });
            return;
        }

        let dlUrl = resolvedUrl;
        let createdTempBlob = false;

        // If it's a data URL, convert to Blob URL first so Chrome handles large files smoothly
        if (resolvedUrl.startsWith('data:')) {
            const commaIndex = resolvedUrl.indexOf(',');
            if (commaIndex !== -1) {
                const header = resolvedUrl.substring(5, commaIndex);
                const mime = header.split(';')[0] || 'image/jpeg';
                const b64 = resolvedUrl.substring(commaIndex + 1);
                const blob = base64ToBlob(b64, mime);
                if (blob) {
                    dlUrl = URL.createObjectURL(blob);
                    createdTempBlob = true;
                }
            }
        }

        const a = document.createElement('a');
        a.href = dlUrl;
        a.download = filename || 'receipt.jpg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        if (createdTempBlob) {
            setTimeout(() => URL.revokeObjectURL(dlUrl), 2000);
        }
    } catch (err) {
        console.error('Failed to trigger download:', err);
        window.open(resolvedUrl, '_blank');
    }
}

/**
 * Opens the receipt in a new tab without being blocked by Chrome's top-level data: URL navigation ban.
 */
export function openReceiptInNewTab(blobUrlOrData: string, filename?: string) {
    if (typeof window === 'undefined' || !blobUrlOrData) return;
    const resolvedUrl = resolveFullReceiptUrl(blobUrlOrData);

    // Handle Google Drive links directly
    const gDriveId = extractGoogleDriveFileId(resolvedUrl);
    if (gDriveId) {
        const openUrl = resolvedUrl.includes('drive.google.com/file') && resolvedUrl.includes('view') 
            ? resolvedUrl 
            : `https://drive.google.com/file/d/${gDriveId}/view?usp=sharing`;
        window.open(openUrl, '_blank', 'noopener,noreferrer');
        return;
    }

    // 1. If it's already a blob: or http(s): URL, standard window.open works
    if (resolvedUrl.startsWith('blob:') || resolvedUrl.startsWith('http://') || resolvedUrl.startsWith('https://')) {
        const opened = window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
        if (opened) return;
    }

    // 2. If it's a data: URL, convert to Blob URL first for native browser rendering
    let activeUrl = resolvedUrl;
    let isPdf = resolvedUrl.includes('application/pdf');

    if (blobUrlOrData.startsWith('data:')) {
        const commaIndex = blobUrlOrData.indexOf(',');
        if (commaIndex !== -1) {
            const header = blobUrlOrData.substring(5, commaIndex);
            let mime = header.split(';')[0] || 'image/jpeg';
            const b64 = blobUrlOrData.substring(commaIndex + 1);
            if (b64.startsWith('/9j/')) {
                mime = 'image/jpeg';
                isPdf = false;
            } else if (b64.startsWith('iVBORw0K')) {
                mime = 'image/png';
                isPdf = false;
            } else if (b64.startsWith('JVBERi')) {
                mime = 'application/pdf';
                isPdf = true;
            }
            const blob = base64ToBlob(b64, mime);
            if (blob) {
                const bUrl = URL.createObjectURL(blob);
                const win = window.open(bUrl, '_blank');
                if (win) return;
                activeUrl = bUrl;
            }
        }
    }
    try {
        const newWin = window.open('', '_blank');
        if (newWin) {
            const isPdfFinal = isPdf || activeUrl.includes('application/pdf') || (filename && filename.toLowerCase().endsWith('.pdf'));
            const title = filename || (isPdfFinal ? 'Payment Receipt (PDF)' : 'Payment Receipt');
            newWin.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>${title}</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        * { box-sizing: border-box; }
                        body {
                            margin: 0;
                            padding: 0;
                            background: #0f172a;
                            color: #f1f5f9;
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                            display: flex;
                            flex-direction: column;
                            min-height: 100vh;
                        }
                        .header {
                            background: rgba(15, 23, 42, 0.9);
                            backdrop-filter: blur(12px);
                            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                            padding: 12px 24px;
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            position: sticky;
                            top: 0;
                            z-index: 10;
                        }
                        .title {
                            font-size: 14px;
                            font-weight: 600;
                            letter-spacing: -0.01em;
                        }
                        .actions {
                            display: flex;
                            gap: 10px;
                        }
                        .btn {
                            background: #007aff;
                            color: #ffffff;
                            border: none;
                            padding: 8px 18px;
                            border-radius: 8px;
                            font-size: 13px;
                            font-weight: 600;
                            cursor: pointer;
                            text-decoration: none;
                            display: inline-flex;
                            align-items: center;
                            gap: 6px;
                            transition: background 0.2s;
                        }
                        .btn:hover {
                            background: #0066cc;
                        }
                        .viewer {
                            flex: 1;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            padding: 24px;
                            overflow: auto;
                        }
                        img {
                            max-width: 100%;
                            max-height: calc(100vh - 100px);
                            object-fit: contain;
                            border-radius: 12px;
                            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
                            background: #ffffff;
                        }
                        iframe, object {
                            width: 100%;
                            height: calc(100vh - 100px);
                            border: none;
                            border-radius: 12px;
                            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
                            background: #ffffff;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <span class="title">${title}</span>
                        <div class="actions">
                            <a href="${activeUrl}" download="${title}" class="btn">
                                ⬇ Download
                            </a>
                        </div>
                    </div>
                    <div class="viewer">
                        ${isPdfFinal 
                            ? `<object data="${activeUrl}" type="application/pdf" style="width:100%;height:calc(100vh - 100px);border:none;border-radius:12px;"><iframe src="${activeUrl}" style="width:100%;height:100%;border:none;"></iframe></object>` 
                            : `<img src="${activeUrl}" alt="Payment Receipt" />`
                        }
                    </div>
                </body>
                </html>
            `);
            newWin.document.close();
            return;
        }
    } catch (err) {
        console.error('Failed to write receipt preview to new tab:', err);
    }
}

/**
 * Revokes a generated Blob URL to free browser memory.
 */
export function revokeReceiptBlob(blobUrl?: string | null) {
    if (typeof window !== 'undefined' && blobUrl && blobUrl.startsWith('blob:')) {
        try {
            URL.revokeObjectURL(blobUrl);
        } catch (e) {
            // Ignore revoke error
        }
    }
}
