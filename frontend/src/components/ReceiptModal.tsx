'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ReceiptInfo, downloadReceiptFile, openReceiptInNewTab, revokeReceiptBlob } from '@/utils/receiptHelper';

interface ReceiptModalProps {
    isOpen: boolean;
    receipt: ReceiptInfo | null;
    onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, receipt, onClose }) => {
    const [imgSrc, setImgSrc] = useState<string>('');
    const [hasError, setHasError] = useState<boolean>(false);
    const [isPdfMode, setIsPdfMode] = useState<boolean>(false);
    const [fetchedBlobUrl, setFetchedBlobUrl] = useState<string | null>(null);

    useEffect(() => {
        if (receipt) {
            const isImage = (!receipt.isPdf && receipt.mimeType.startsWith('image/')) || 
                            (receipt.dataUrl && receipt.dataUrl.startsWith('data:image/')) ||
                            (receipt.blobUrl && receipt.mimeType.startsWith('image/'));

            const preferred = receipt.blobUrl || receipt.dataUrl || receipt.rawUrl;
            setImgSrc(preferred);
            setHasError(false);

            const isExplicitImage = receipt.mimeType?.startsWith('image/') ||
                                    receipt.filename?.toLowerCase().endsWith('.jpg') ||
                                    receipt.filename?.toLowerCase().endsWith('.jpeg') ||
                                    receipt.filename?.toLowerCase().endsWith('.png') ||
                                    receipt.filename?.toLowerCase().endsWith('.webp') ||
                                    preferred.toLowerCase().includes('.jpg') ||
                                    preferred.toLowerCase().includes('.jpeg') ||
                                    preferred.toLowerCase().includes('.png') ||
                                    preferred.toLowerCase().includes('.webp');

            // PDF is detected ONLY if it is truly a PDF, and NOT an image!
            const isPdfDetected = !isExplicitImage && !isImage && (
                receipt.isPdf || 
                receipt.mimeType === 'application/pdf' || 
                receipt.filename?.toLowerCase().endsWith('.pdf') ||
                preferred.toLowerCase().includes('.pdf') || 
                preferred.includes('/receipt-pdf')
            );
            setIsPdfMode(isPdfDetected);

            // If it's a remote or API URL, fetch into a same-origin Blob to bypass cross-origin iframe blocking
            const targetUrl = receipt.rawUrl || receipt.blobUrl || receipt.dataUrl;
            if (targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://') || targetUrl.startsWith('/'))) {
                let active = true;
                fetch(targetUrl)
                    .then(async (res) => {
                        if (!res.ok) return;
                        const cType = res.headers.get('content-type') || '';
                        const blob = await res.blob();
                        if (!active) return;
                        const bUrl = URL.createObjectURL(blob);
                        setFetchedBlobUrl(bUrl);
                        if (cType.startsWith('image/')) {
                            setIsPdfMode(false);
                            setImgSrc(bUrl);
                            setHasError(false);
                        } else if (cType.includes('pdf')) {
                            setIsPdfMode(true);
                            setHasError(false);
                        }
                    })
                    .catch(() => {});
                return () => {
                    active = false;
                };
            }
        }
    }, [receipt]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                handleClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, receipt]);

    const handleClose = () => {
        if (fetchedBlobUrl) {
            const fUrl = fetchedBlobUrl;
            setTimeout(() => {
                revokeReceiptBlob(fUrl);
            }, 30000);
            setFetchedBlobUrl(null);
        }
        if (receipt?.blobUrl && receipt.blobUrl.startsWith('blob:')) {
            const urlToRevoke = receipt.blobUrl;
            setTimeout(() => {
                revokeReceiptBlob(urlToRevoke);
            }, 30000);
        }
        onClose();
    };

    if (!isOpen || !receipt) return null;

    const activeUrl = imgSrc || receipt.blobUrl || receipt.dataUrl || receipt.rawUrl;

    const handleImgError = () => {
        // If the URL is an API payment-receipt endpoint, it serves PDF if no custom image was uploaded
        if (activeUrl.includes('/payment-receipt') || activeUrl.includes('/receipt-pdf') || activeUrl.toLowerCase().includes('.pdf')) {
            setIsPdfMode(true);
            setHasError(false);
            return;
        }

        const isImage = (!receipt.isPdf && receipt.mimeType.startsWith('image/')) || 
                        (receipt.dataUrl && receipt.dataUrl.startsWith('data:image/'));

        // If it's an image, cycle through alternative sources instead of switching to PDF
        if (isImage) {
            if (receipt.blobUrl && imgSrc !== receipt.blobUrl) {
                setImgSrc(receipt.blobUrl);
                return;
            }
            if (receipt.dataUrl && imgSrc !== receipt.dataUrl) {
                setImgSrc(receipt.dataUrl);
                return;
            }
            if (receipt.rawUrl && imgSrc !== receipt.rawUrl) {
                setImgSrc(receipt.rawUrl);
                return;
            }
            if (receipt.rawUrl?.includes('/api/') || receipt.blobUrl?.includes('/api/')) {
                setIsPdfMode(true);
                setHasError(false);
                return;
            }
            setHasError(true);
            return;
        }

        setIsPdfMode(true);
        setHasError(false);
    };

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-black/60 backdrop-blur-md"
                onClick={handleClose}
            >
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0, y: 15 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 15 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-[#d2d2d7]/50"
                >
                    {/* Header */}
                    <div className="p-5 px-6 border-b border-[#e5e5e7] flex justify-between items-center bg-[#fbfbfd]">
                        <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${receipt.isPdf ? 'bg-[#ffefe5] text-[#ff3b30]' : (receipt.isGoogleDrive ? 'bg-[#e8f2ff] text-[#007aff]' : 'bg-[#e8f2ff] text-[#007aff]')}`}>
                                {receipt.isPdf ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                ) : receipt.isGoogleDrive ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                )}
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-[#1d1d1f] tracking-tight">Payment Receipt</h3>
                                <p className="text-xs text-[#86868b] truncate max-w-[280px] sm:max-w-md font-mono">
                                    {receipt.filename}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="w-8 h-8 rounded-full bg-[#f5f5f7] hover:bg-[#e5e5e7] text-[#1d1d1f] flex items-center justify-center transition-all"
                            title="Close"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>

                    {/* Receipt Viewer Body */}
                    <div className="flex-1 overflow-auto p-4 sm:p-6 bg-[#f5f5f7]/50 flex items-center justify-center min-h-[350px] max-h-[68vh]">
                        {receipt.isGoogleDrive ? (
                            <div className="w-full h-full min-h-[480px] sm:min-h-[540px] bg-white rounded-2xl border border-[#e5e5e7] overflow-hidden shadow-inner flex flex-col relative">
                                <iframe 
                                    src={receipt.googleDrivePreviewUrl || `https://drive.google.com/file/d/${receipt.googleDriveFileId}/preview`} 
                                    title="Google Drive Receipt Preview"
                                    className="w-full h-full min-h-[480px] sm:min-h-[540px] border-0"
                                    allow="autoplay; encrypted-media; fullscreen"
                                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                                />
                            </div>
                        ) : (receipt.isPdf || isPdfMode) ? (
                            <div className="w-full h-full flex flex-col gap-3 min-h-[520px]">
                                {/* Quick PDF Action Banner */}
                                <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/70 border border-blue-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs tracking-wider shadow-2xs">
                                            PDF
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-[#1d1d1f]">Official Spheronix Payment Receipt</h4>
                                            <p className="text-[11px] text-[#86868b]">Verified registration & transaction records</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => openReceiptInNewTab(receipt.rawUrl || receipt.blobUrl || activeUrl, receipt.filename)}
                                            className="px-3.5 py-1.5 bg-[#007aff] hover:bg-[#0066cc] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                            Open Full Tab
                                        </button>
                                        <button
                                            onClick={() => downloadReceiptFile(receipt.rawUrl || receipt.blobUrl || activeUrl, receipt.filename)}
                                            className="px-3.5 py-1.5 bg-white border border-[#d2d2d7] hover:bg-[#f5f5f7] text-[#1d1d1f] text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                            Download
                                        </button>
                                    </div>
                                </div>

                                {/* PDF Frame */}
                                <div className="w-full flex-1 min-h-[440px] bg-white rounded-2xl border border-[#e5e5e7] overflow-hidden shadow-inner relative">
                                    <iframe 
                                        src={fetchedBlobUrl || (activeUrl.startsWith('blob:') ? activeUrl : (activeUrl.includes('#') ? activeUrl : `${activeUrl}#toolbar=1&navpanes=0`))} 
                                        title="Receipt PDF Preview"
                                        className="w-full h-full min-h-[440px] border-0"
                                    />
                                </div>
                            </div>
                        ) : !hasError ? (
                            <div className="max-w-full max-h-full flex items-center justify-center p-2">
                                <img 
                                    src={activeUrl} 
                                    alt="Payment Receipt" 
                                    className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-md border border-[#e5e5e7] bg-white"
                                    onError={handleImgError}
                                />
                            </div>
                        ) : (
                            <div className="text-center p-8 bg-white rounded-2xl border border-[#e5e5e7] max-w-md shadow-sm">
                                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                </div>
                                <h4 className="text-sm font-bold text-[#1d1d1f]">Direct in-browser preview unavailable</h4>
                                <p className="text-xs text-[#86868b] mt-1.5 mb-4">
                                    The receipt file is intact. You can open it in a dedicated window or download it directly.
                                </p>
                                <div className="flex justify-center gap-2">
                                    <button
                                        onClick={() => openReceiptInNewTab(receipt.isGoogleDrive ? (receipt.rawUrl || activeUrl) : (receipt.blobUrl || activeUrl), receipt.filename)}
                                        className="px-4 py-2 bg-[#f5f5f7] hover:bg-[#e5e5e7] text-[#1d1d1f] text-xs font-semibold rounded-xl transition-all"
                                    >
                                        Open in New Tab
                                    </button>
                                    <button
                                        onClick={() => downloadReceiptFile(receipt.isGoogleDrive ? (receipt.googleDriveDownloadUrl || activeUrl) : (receipt.blobUrl || activeUrl), receipt.filename)}
                                        className="px-4 py-2 bg-[#007aff] hover:bg-[#0066cc] text-white text-xs font-bold rounded-xl transition-all"
                                    >
                                        Download Receipt
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Actions Footer */}
                    <div className="p-4 px-6 border-t border-[#e5e5e7] bg-[#fbfbfd] flex flex-wrap justify-between items-center gap-3">
                        <span className="text-xs text-[#86868b] font-medium hidden sm:inline">
                            Format: <span className="font-semibold text-[#1d1d1f] uppercase">{receipt.isGoogleDrive ? 'GOOGLE DRIVE' : receipt.mimeType.replace('application/', '').replace('image/', '')}</span>
                        </span>

                        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
                            <button
                                onClick={handleClose}
                                className="px-4 py-2 text-sm font-semibold text-[#1d1d1f] hover:bg-[#e5e5e7] rounded-xl transition-all"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => openReceiptInNewTab(receipt.isGoogleDrive ? (receipt.rawUrl || activeUrl) : (receipt.rawUrl || receipt.blobUrl || activeUrl), receipt.filename)}
                                className="px-4 py-2 bg-[#f5f5f7] hover:bg-[#e5e5e7] text-[#1d1d1f] text-sm font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                Open in New Tab
                            </button>
                            <button
                                onClick={() => downloadReceiptFile(receipt.isGoogleDrive ? (receipt.googleDriveDownloadUrl || activeUrl) : (receipt.rawUrl || receipt.blobUrl || activeUrl), receipt.filename)}
                                className="px-5 py-2 bg-[#007aff] hover:bg-[#0066cc] text-white text-sm font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                Download Receipt
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ReceiptModal;
