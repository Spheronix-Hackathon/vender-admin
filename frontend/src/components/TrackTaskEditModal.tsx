"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, AlertCircle, Edit3, ShieldAlert, Sparkles, FolderGit2, FileCode } from 'lucide-react';
import api from '@/lib/api';

interface TaskCategoryOption {
    _id?: string;
    name: string;
    questions: Array<{ name: string; description?: string; requirements?: string }>;
}

interface TrackTaskEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: {
        _id: string;
        student_id: string;
        name: string;
        email?: string;
        participation_mode?: string;
        hackathon_track?: string;
        task?: string;
    } | null;
    apiPath: string; // '/students' or '/individual-students'
    onSuccess: (updatedStudent: { _id: string; hackathon_track: string; task: string }) => void;
}

export default function TrackTaskEditModal({
    isOpen,
    onClose,
    student,
    apiPath,
    onSuccess
}: TrackTaskEditModalProps) {
    const [categories, setCategories] = useState<TaskCategoryOption[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(false);
    
    const [selectedTrack, setSelectedTrack] = useState('');
    const [isCustomTrack, setIsCustomTrack] = useState(false);
    const [customTrackInput, setCustomTrackInput] = useState('');

    const [selectedTask, setSelectedTask] = useState('');
    const [isCustomTask, setIsCustomTask] = useState(false);
    const [customTaskInput, setCustomTaskInput] = useState('');

    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Fetch categories on open
    useEffect(() => {
        if (!isOpen) return;

        const fetchCats = async () => {
            setLoadingCategories(true);
            try {
                const res = await api.get('/tasks');
                if (Array.isArray(res.data)) {
                    setCategories(res.data);
                }
            } catch (err) {
                console.warn('Failed to load categories from /tasks:', err);
            } finally {
                setLoadingCategories(false);
            }
        };

        fetchCats();
    }, [isOpen]);

    // Initialize fields when student changes
    useEffect(() => {
        if (student && isOpen) {
            const currentTrack = student.hackathon_track && student.hackathon_track !== '—' && student.hackathon_track !== 'N/A' 
                ? student.hackathon_track 
                : '';
            const currentTask = student.task && student.task !== '—' && student.task !== 'Not Assigned' 
                ? student.task 
                : '';

            setSelectedTrack(currentTrack);
            setIsCustomTrack(false);
            setCustomTrackInput('');

            setSelectedTask(currentTask);
            setIsCustomTask(false);
            setCustomTaskInput('');
            setErrorMsg(null);
        }
    }, [student, isOpen]);

    // Get available questions for currently selected track
    const currentCategoryObj = categories.find(c => c.name.toLowerCase().trim() === selectedTrack.toLowerCase().trim());
    const availableQuestions = currentCategoryObj?.questions || [];

    const handleTrackChange = (val: string) => {
        if (val === '__CUSTOM__') {
            setIsCustomTrack(true);
            setSelectedTrack('');
            setSelectedTask('');
            setIsCustomTask(true);
        } else {
            setIsCustomTrack(false);
            setSelectedTrack(val);
            // Check if track is Ideathon
            if (val.toLowerCase() === 'ideathon') {
                setSelectedTask('Ideathon');
                setIsCustomTask(false);
            } else {
                setSelectedTask('');
                setIsCustomTask(false);
            }
        }
    };

    const handleTaskChange = (val: string) => {
        if (val === '__CUSTOM__') {
            setIsCustomTask(true);
            setSelectedTask('');
        } else {
            setIsCustomTask(false);
            setSelectedTask(val);
        }
    };

    const handleSave = async () => {
        setErrorMsg(null);
        const finalTrack = (isCustomTrack ? customTrackInput : selectedTrack).trim();
        const finalTask = (isCustomTask ? customTaskInput : selectedTask).trim();

        if (!finalTrack) {
            setErrorMsg('Please select or enter a Track.');
            return;
        }

        if (!finalTask) {
            setErrorMsg('Please select or enter a Task.');
            return;
        }

        if (!student) return;

        setIsSaving(true);
        try {
            const res = await api.put(`${apiPath}/${student._id}/track-task`, {
                track: finalTrack,
                task: finalTask
            });

            onSuccess({
                _id: student._id,
                hackathon_track: finalTrack,
                task: finalTask
            });

            onClose();
        } catch (err: any) {
            console.error('Error saving Track and Task:', err);
            const msg = err.response?.data?.message || err.message || 'Failed to update Track & Task';
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
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-3xl shadow-2xl border border-[#e5e5e7] w-full max-w-lg overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-[#f0f0f2] flex items-center justify-between bg-gradient-to-b from-gray-50/80 to-white">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-[#007aff]/10 text-[#007aff] flex items-center justify-center shadow-inner">
                                <Edit3 className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-bold text-[#1d1d1f] tracking-tight">Edit Track & Challenge Task</h3>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                                        Super Admin Only
                                    </span>
                                </div>
                                <p className="text-xs text-[#86868b]">Authorized Super Admins only</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Student Info Card */}
                    <div className="p-6 space-y-5">
                        <div className="p-3.5 bg-[#f5f5f7] rounded-2xl flex items-center justify-between text-xs">
                            <div>
                                <span className="font-semibold text-[#1d1d1f] text-sm block">{student.name}</span>
                                <span className="font-mono text-[#86868b]">{student.student_id}</span>
                            </div>
                            <span className="px-3 py-1 rounded-full font-bold uppercase tracking-wider text-[10px] bg-white border border-[#e5e5e7] text-[#007aff]">
                                {student.participation_mode || 'individual'}
                            </span>
                        </div>

                        {errorMsg && (
                            <div className="p-3.5 bg-red-50 text-red-700 text-xs rounded-2xl flex items-center gap-2 border border-red-100">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        {/* Track Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-[#86868b] uppercase tracking-wider flex items-center gap-1.5">
                                <FolderGit2 className="w-3.5 h-3.5 text-[#007aff]" />
                                Hackathon Track (Domain)
                            </label>

                            {!isCustomTrack ? (
                                <div className="space-y-2">
                                    <select
                                        value={selectedTrack}
                                        onChange={(e) => handleTrackChange(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-[#d2d2d7] text-sm text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#007aff]/30 focus:border-[#007aff] bg-white cursor-pointer"
                                    >
                                        <option value="">-- Select a Track --</option>
                                        {categories.map((cat, idx) => (
                                            <option key={cat._id || idx} value={cat.name}>
                                                {cat.name}
                                            </option>
                                        ))}
                                        <option value="Ideathon">Ideathon</option>
                                        <option value="Full Stack Application">Full Stack Application</option>
                                        <option value="Bug Hunt">Bug Hunt</option>
                                        <option value="Data Science & AI">Data Science & AI</option>
                                        <option value="Cyber Security">Cyber Security</option>
                                        <option value="__CUSTOM__">+ Enter Custom Track Name</option>
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setIsCustomTrack(true)}
                                        className="text-xs text-[#007aff] hover:underline font-medium"
                                    >
                                        Need a custom track name? Click here
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Enter track name (e.g. Mobile App Dev)"
                                            value={customTrackInput}
                                            onChange={(e) => setCustomTrackInput(e.target.value)}
                                            className="flex-1 px-4 py-2.5 rounded-xl border border-[#d2d2d7] text-sm focus:outline-none focus:ring-2 focus:ring-[#007aff]/30 focus:border-[#007aff]"
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsCustomTrack(false);
                                                setSelectedTrack(categories[0]?.name || '');
                                            }}
                                            className="px-3 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
                                        >
                                            Pick from List
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Task Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-[#86868b] uppercase tracking-wider flex items-center gap-1.5">
                                <FileCode className="w-3.5 h-3.5 text-[#007aff]" />
                                Assigned Challenge Task
                            </label>

                            {!isCustomTask && availableQuestions.length > 0 ? (
                                <div className="space-y-2">
                                    <select
                                        value={selectedTask}
                                        onChange={(e) => handleTaskChange(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-[#d2d2d7] text-sm text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#007aff]/30 focus:border-[#007aff] bg-white cursor-pointer"
                                    >
                                        <option value="">-- Select Challenge Task --</option>
                                        {availableQuestions.map((q, idx) => (
                                            <option key={idx} value={q.name}>
                                                {q.name}
                                            </option>
                                        ))}
                                        <option value="__CUSTOM__">+ Enter Custom Challenge Task</option>
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setIsCustomTask(true)}
                                        className="text-xs text-[#007aff] hover:underline font-medium"
                                    >
                                        Need a custom task description? Click here
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Enter challenge task title"
                                            value={isCustomTask ? customTaskInput : selectedTask}
                                            onChange={(e) => {
                                                if (!isCustomTask) setIsCustomTask(true);
                                                setCustomTaskInput(e.target.value);
                                            }}
                                            className="flex-1 px-4 py-2.5 rounded-xl border border-[#d2d2d7] text-sm focus:outline-none focus:ring-2 focus:ring-[#007aff]/30 focus:border-[#007aff]"
                                        />
                                        {availableQuestions.length > 0 && isCustomTask && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsCustomTask(false);
                                                    setSelectedTask(availableQuestions[0]?.name || '');
                                                }}
                                                className="px-3 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
                                            >
                                                Pick from List
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 px-6 border-t border-[#f0f0f2] bg-gray-50/50 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            disabled={isSaving}
                            className="px-5 py-2.5 text-sm font-semibold text-[#1d1d1f] hover:bg-[#e5e5e7] rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-6 py-2.5 bg-[#007aff] hover:bg-[#0066cc] text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSaving ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Check className="w-4 h-4" />
                            )}
                            Save Changes
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
