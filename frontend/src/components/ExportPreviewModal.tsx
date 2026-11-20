'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Download, FileSpreadsheet, FileText, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExportPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    data: any[];
    fileNamePrefix: string;
}

export default function ExportPreviewModal({
    isOpen,
    onClose,
    title,
    data,
    fileNamePrefix
}: ExportPreviewModalProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [downloadedType, setDownloadedType] = useState<string | null>(null);

    const filteredData = useMemo(() => {
        if (!searchTerm.trim()) return data;
        const q = searchTerm.toLowerCase().trim();
        return data.filter(row => {
            return Object.values(row).some(val => 
                val !== null && val !== undefined && String(val).toLowerCase().includes(q)
            );
        });
    }, [data, searchTerm]);

    const columns = useMemo(() => {
        if (!data || data.length === 0) return [];
        return Object.keys(data[0]);
    }, [data]);

    const getCleanTimestamp = () => {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
        return `${dateStr}_${timeStr}`;
    };

    const handleDownloadExcel = () => {
        try {
            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
            const fileName = `${fileNamePrefix}_${data.length}_${getCleanTimestamp()}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            setDownloadedType('excel');
            setTimeout(() => setDownloadedType(null), 3000);
        } catch (error) {
            console.error('Error downloading Excel:', error);
            alert('Failed to download Excel file.');
        }
    };

    const handleDownloadCSV = () => {
        try {
            const worksheet = XLSX.utils.json_to_sheet(data);
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${fileNamePrefix}_${data.length}_${getCleanTimestamp()}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 60000);
            setDownloadedType('csv');
            setTimeout(() => setDownloadedType(null), 3000);
        } catch (error) {
            console.error('Error downloading CSV:', error);
            alert('Failed to download CSV file.');
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 15 }}
                    className="bg-white rounded-3xl border border-black/10 shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-6 px-8 border-b border-[#e5e5e7] bg-[#fbfbfd] flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-[#007aff]/10 text-[#007aff] flex items-center justify-center font-bold">
                                <FileSpreadsheet className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-xl font-bold text-[#1d1d1f] tracking-tight">{title}</h3>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-[#007aff]">
                                        {data.length} Total Records
                                    </span>
                                </div>
                                <p className="text-xs text-[#86868b] mt-0.5">
                                    Review and verify student details before downloading
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative w-64">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search in table..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#e5e5e7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007aff]/20"
                                />
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-[#e5e5e7] rounded-full transition-colors cursor-pointer text-gray-500 hover:text-gray-900"
                                title="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Table Container */}
                    <div className="flex-1 overflow-auto custom-scrollbar p-6 bg-[#fbfbfd]/50">
                        {data.length === 0 ? (
                            <div className="text-center py-20 text-gray-500 font-medium">
                                No records found to preview.
                            </div>
                        ) : filteredData.length === 0 ? (
                            <div className="text-center py-16 text-gray-500 font-medium">
                                No records match "{searchTerm}".
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-[#e5e5e7] overflow-hidden shadow-xs">
                                <div className="overflow-x-auto max-h-[55vh]">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead className="bg-[#f5f5f7] sticky top-0 z-10 border-b border-[#e5e5e7] shadow-2xs">
                                            <tr>
                                                {columns.map((col, idx) => (
                                                    <th key={idx} className="p-3.5 px-4 font-black text-[#1d1d1f] tracking-wider uppercase whitespace-nowrap bg-[#f5f5f7]">
                                                        {col}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#e5e5e7]/70">
                                            {filteredData.slice(0, 300).map((row, rIdx) => (
                                                <tr key={rIdx} className="hover:bg-blue-50/40 transition-colors">
                                                    {columns.map((col, cIdx) => {
                                                        const val = row[col];
                                                        const isStatus = col.toLowerCase().includes('status');
                                                        const isEmail = col.toLowerCase().includes('email');
                                                        const isPhone = col.toLowerCase().includes('mobile') || col.toLowerCase().includes('phone');
                                                        const isId = col.toLowerCase().includes('id');
                                                        
                                                        return (
                                                            <td key={cIdx} className="p-3 px-4 whitespace-nowrap font-medium text-[#424245]">
                                                                {isStatus ? (
                                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                                        String(val).toLowerCase() === 'approved' || String(val).toLowerCase() === 'submitted' || String(val).toLowerCase() === 'yes'
                                                                            ? 'bg-emerald-100 text-emerald-700'
                                                                            : String(val).toLowerCase() === 'pending'
                                                                            ? 'bg-amber-100 text-amber-800'
                                                                            : 'bg-gray-100 text-gray-700'
                                                                    }`}>
                                                                        {String(val ?? '—')}
                                                                    </span>
                                                                ) : isId ? (
                                                                    <span className="font-mono text-[#007aff] font-bold">
                                                                        {String(val ?? '—')}
                                                                    </span>
                                                                ) : isEmail || isPhone ? (
                                                                    <span className="font-mono text-gray-600">
                                                                        {String(val ?? '—')}
                                                                    </span>
                                                                ) : (
                                                                    String(val ?? '—')
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {filteredData.length > 300 && (
                                    <div className="p-2.5 text-center bg-gray-50 border-t border-[#e5e5e7] text-[11px] text-[#86868b] font-medium">
                                        Showing first 300 of {filteredData.length} records. All {data.length} records will be included when downloaded.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 px-8 border-t border-[#e5e5e7] bg-white flex flex-wrap items-center justify-between gap-4">
                        <div className="text-xs text-[#86868b] font-medium">
                            Showing <strong className="text-[#1d1d1f]">{filteredData.length}</strong> of {data.length} records
                            {downloadedType && (
                                <span className="ml-3 inline-flex items-center gap-1 text-emerald-600 font-bold">
                                    <CheckCircle2 className="w-4 h-4" /> Downloaded successfully!
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                            >
                                Close
                            </button>

                            <button
                                onClick={handleDownloadCSV}
                                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
                                title="Download as CSV (Compatible with any text editor or spreadsheet app)"
                            >
                                <FileText className="w-4 h-4 text-gray-700" />
                                Download CSV (.csv)
                            </button>

                            <button
                                onClick={handleDownloadExcel}
                                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#007aff] hover:bg-[#0062cc] text-white transition-all flex items-center gap-2 cursor-pointer shadow-md hover:shadow-lg active:scale-95"
                                title="Download as Microsoft Excel format (.xlsx)"
                            >
                                <Download className="w-4 h-4" />
                                Download Excel (.xlsx)
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

