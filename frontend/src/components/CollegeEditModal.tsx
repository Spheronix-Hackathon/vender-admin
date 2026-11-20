"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, AlertCircle, School, Search, Sparkles, Building2 } from 'lucide-react';
import api from '@/lib/api';

interface CollegeOption {
    _id?: string;
    name: string;
    code?: string;
}

interface CollegeEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: {
        _id: string;
        student_id: string;
        name: string;
        email?: string;
        college?: string;
    } | null;
    apiPath: string; // '/students' or '/individual-students'
    onSuccess: (updatedStudent: { _id: string; college: string }) => void;
}

export default function CollegeEditModal({
    isOpen,
    onClose,
    student,
    apiPath,
    onSuccess
}: CollegeEditModalProps) {
    const [colleges, setColleges] = useState<CollegeOption[]>([]);
    const [loadingColleges, setLoadingColleges] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    const [selectedCollege, setSelectedCollege] = useState('');
    const [isCustomCollege, setIsCustomCollege] = useState(false);
    const [customCollegeInput, setCustomCollegeInput] = useState('');

    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Fetch colleges on open
    useEffect(() => {
        if (!isOpen) return;

        const fetchColleges = async () => {
            setLoadingColleges(true);
            try {
                const res = await api.get('/colleges');
                if (Array.isArray(res.data)) {
                    setColleges(res.data);
                }
            } catch (err) {
                console.warn('Failed to load colleges from /colleges:', err);
            } finally {
                setLoadingColleges(false);
            }
        };

        fetchColleges();
    }, [isOpen]);

    // Initialize fields when student changes
    useEffect(() => {
        if (student && isOpen) {
            const currentCollege = student.college && student.college !== '—' && student.college !== 'N/A' 
                ? student.college 
                : '';

            setSelectedCollege(currentCollege);
            setIsCustomCollege(false);
            setCustomCollegeInput('');
            setSearchQuery('');
            setErrorMsg(null);
        }
    }, [student, isOpen]);

    // Handle Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const filteredColleges = colleges.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (c.code && c.code.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleCollegeSelect = (val: string) => {
        if (val === '__CUSTOM__') {
            setIsCustomCollege(true);
            setSelectedCollege('');
        } else {
            setIsCustomCollege(false);
            setSelectedCollege(val);
        }
    };

    const handleSave = async () => {
        setErrorMsg(null);
        const finalCollege = (isCustomCollege ? customCollegeInput : selectedCollege).trim();

        if (!finalCollege) {
            setErrorMsg('Please select or enter a College name.');
            return;
        }

        if (!student) return;

        setIsSaving(true);
        try {
            await api.put(`${apiPath}/${student._id}/college`, {
                college: finalCollege
            });

            onSuccess({
                _id: student._id,
                college: finalCollege
            });

            onClose();
        } catch (err: any) {
            console.error('Error saving college:', err);
            const msg = err.response?.data?.message || err.message || 'Failed to update College';
            setErrorMsg(msg);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen || !student) return null;

    return (
        <AnimatePresence>
            <div 
                onClick={onClose}
                className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-3xl shadow-2xl border border-[#e5e5e7] w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-[#f0f0f2] flex items-center justify-between bg-gradient-to-b from-gray-50/80 to-white">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-[#007aff]/10 text-[#007aff] flex items-center justify-center shadow-inner">
                                <School className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-[#1d1d1f] tracking-tight">Edit Student College</h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs font-semibold text-[#007aff] bg-[#007aff]/10 px-2 py-0.5 rounded-md">
                                        Super Admin Only
                                    </span>
                                    <span className="text-xs text-[#86868b] truncate max-w-[180px]">
                                        {student.name}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-[#f5f5f7] hover:bg-[#e5e5e7] text-[#86868b] hover:text-[#1d1d1f] flex items-center justify-center transition-all"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
                        {/* Current College Info Badge */}
                        <div className="p-3.5 bg-[#f5f5f7] rounded-2xl border border-[#e5e5e7]/60 flex items-start gap-3">
                            <Building2 className="w-5 h-5 text-[#86868b] shrink-0 mt-0.5" />
                            <div className="text-xs leading-relaxed">
                                <span className="font-semibold text-[#1d1d1f]">Currently Assigned College:</span>{' '}
                                <span className="text-[#007aff] font-medium break-words">
                                    {student.college || 'None Assigned'}
                                </span>
                            </div>
                        </div>

                        {errorMsg && (
                            <div className="p-3.5 bg-red-50 text-red-600 rounded-2xl text-xs font-semibold flex items-center gap-2 border border-red-100">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        {/* Mode toggle: Pick from List vs Custom Entry */}
                        <div className="flex items-center gap-2 p-1 bg-[#f5f5f7] rounded-xl border border-[#e5e5e7]">
                            <button
                                type="button"
                                onClick={() => setIsCustomCollege(false)}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                    !isCustomCollege 
                                        ? 'bg-white text-[#1d1d1f] shadow-sm' 
                                        : 'text-[#86868b] hover:text-[#1d1d1f]'
                                }`}
                            >
                                Select From Registered
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsCustomCollege(true);
                                    if (!customCollegeInput && selectedCollege) {
                                        setCustomCollegeInput(selectedCollege);
                                    }
                                }}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                                    isCustomCollege 
                                        ? 'bg-[#007aff] text-white shadow-sm' 
                                        : 'text-[#86868b] hover:text-[#1d1d1f]'
                                }`}
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                Custom / Manual Entry
                            </button>
                        </div>

                        {!isCustomCollege ? (
                            <div className="space-y-3">
                                {/* Search input */}
                                <div className="relative">
                                    <Search className="w-4 h-4 text-[#86868b] absolute left-3.5 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        placeholder="Search colleges by name or code..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 text-xs bg-[#fbfbfd] border border-[#e5e5e7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007aff]/30 transition-all font-medium text-[#1d1d1f]"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#86868b] hover:text-[#1d1d1f] text-xs p-1"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>

                                {/* Colleges List */}
                                <div className="max-h-[220px] overflow-y-auto border border-[#e5e5e7] rounded-2xl divide-y divide-[#f0f0f2] bg-[#fbfbfd] custom-scrollbar">
                                    {loadingColleges ? (
                                        <div className="p-8 text-center text-xs text-[#86868b]">Loading colleges...</div>
                                    ) : filteredColleges.length > 0 ? (
                                        filteredColleges.map((col) => {
                                            const isSelected = selectedCollege.toLowerCase().trim() === col.name.toLowerCase().trim();
                                            return (
                                                <button
                                                    key={col._id || col.name}
                                                    type="button"
                                                    onClick={() => handleCollegeSelect(col.name)}
                                                    className={`w-full text-left p-3 text-xs flex items-center justify-between transition-colors ${
                                                        isSelected 
                                                            ? 'bg-[#007aff]/10 text-[#007aff] font-bold' 
                                                            : 'text-[#1d1d1f] hover:bg-gray-100/70 font-medium'
                                                    }`}
                                                >
                                                    <div className="flex flex-col pr-2">
                                                        <span>{col.name}</span>
                                                        {col.code && <span className="text-[10px] text-[#86868b] uppercase tracking-wider font-mono">{col.code}</span>}
                                                    </div>
                                                    {isSelected && <Check className="w-4 h-4 shrink-0 text-[#007aff]" />}
                                                </button>
                                            );
                                        })
                                    ) : (
                                        <div className="p-6 text-center text-xs text-[#86868b]">
                                            No colleges found matching "{searchQuery}".
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsCustomCollege(true);
                                                    setCustomCollegeInput(searchQuery);
                                                }}
                                                className="block mx-auto mt-2 text-[#007aff] font-bold hover:underline"
                                            >
                                                Use "{searchQuery}" as custom college
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-[#1d1d1f] block">
                                    Enter College Name Manually:
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. JNTUA College of Engineering, Anantapur"
                                    value={customCollegeInput}
                                    onChange={(e) => setCustomCollegeInput(e.target.value)}
                                    className="w-full px-4 py-2.5 text-xs bg-[#fbfbfd] border border-[#e5e5e7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007aff]/30 font-medium text-[#1d1d1f]"
                                    autoFocus
                                />
                                <p className="text-[11px] text-[#86868b]">
                                    Enter the exact institution name. This will update the student record and team records immediately.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 px-6 border-t border-[#f0f0f2] bg-[#fbfbfd] flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold text-[#86868b] hover:text-[#1d1d1f] transition-all rounded-xl"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-5 py-2.5 bg-[#007aff] hover:bg-[#0066cc] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-[#007aff]/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    <span>Save College</span>
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
