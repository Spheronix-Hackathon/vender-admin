"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, AlertCircle, Edit3, School, Sparkles, User, Mail, Phone, BookOpen, Calendar, Hash, FolderGit2, FileCode } from 'lucide-react';
import api from '@/lib/api';

export interface StudentEditData {
    _id: string;
    student_id?: string;
    name: string;
    email: string;
    phone: string;
    college: string;
    branch?: string;
    currentYear?: string;
    rollNumber?: string;
    hackathon_track?: string;
    task?: string;
    participation_mode?: string;
    [key: string]: any;
}

interface StudentEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: StudentEditData | null;
    apiPath?: string; // '/individual-students' or '/students'
    onSuccess: (updatedStudent: Partial<StudentEditData> & { _id: string }) => void;
}

export default function StudentEditModal({
    isOpen,
    onClose,
    student,
    apiPath = '/individual-students',
    onSuccess
}: StudentEditModalProps) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [college, setCollege] = useState('');
    const [branch, setBranch] = useState('');
    const [currentYear, setCurrentYear] = useState('');
    const [rollNumber, setRollNumber] = useState('');
    const [track, setTrack] = useState('');
    const [task, setTask] = useState('');

    const [collegesList, setCollegesList] = useState<string[]>([]);
    const [categoriesList, setCategoriesList] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Load available colleges and tasks for dropdown convenience
    useEffect(() => {
        if (!isOpen) return;

        const loadDropdownData = async () => {
            try {
                const [collegesRes, tasksRes] = await Promise.allSettled([
                    api.get('/colleges'),
                    api.get('/tasks')
                ]);

                if (collegesRes.status === 'fulfilled' && Array.isArray(collegesRes.value.data)) {
                    setCollegesList(collegesRes.value.data.map((c: any) => c.name || c).filter(Boolean));
                }
                if (tasksRes.status === 'fulfilled' && Array.isArray(tasksRes.value.data)) {
                    setCategoriesList(tasksRes.value.data);
                }
            } catch (e) {
                console.warn('Failed to fetch reference dropdown options:', e);
            }
        };

        loadDropdownData();
    }, [isOpen]);

    // Populate initial state from student
    useEffect(() => {
        if (student && isOpen) {
            setName(student.name || '');
            setEmail(student.email || '');
            setPhone(student.phone || (student as any).mobile || '');
            setCollege(student.college || '');
            setBranch(student.branch || '');
            setCurrentYear(student.currentYear || '');
            setRollNumber(student.rollNumber || '');
            setTrack(student.hackathon_track || '');
            setTask(student.task || '');
            setErrorMsg(null);
        }
    }, [student, isOpen]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!student) return;

        if (!name.trim()) {
            setErrorMsg('Student name is required.');
            return;
        }

        setIsSaving(true);
        setErrorMsg(null);

        try {
            const payload = {
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim(),
                college: college.trim(),
                branch: branch.trim(),
                currentYear: currentYear.trim(),
                rollNumber: rollNumber.trim(),
                track: track.trim(),
                task: task.trim()
            };

            await api.put(`${apiPath}/${student._id}`, payload);

            onSuccess({
                _id: student._id,
                ...payload,
                hackathon_track: payload.track
            });

            onClose();
        } catch (err: any) {
            console.error('Error saving student details:', err);
            setErrorMsg(err.response?.data?.message || err.message || 'Failed to update student details in database');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen || !student) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white rounded-3xl shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3)] border border-[#e5e5e7] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 px-8 border-b border-[#e5e5e7]/60 bg-gradient-to-r from-blue-50/50 via-white to-white">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-[#007aff]/10 flex items-center justify-center text-[#007aff] shrink-0">
                                <Edit3 className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-xl font-black text-[#1d1d1f] tracking-tight">Edit Student Details</h3>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                                        Super Admin Only
                                    </span>
                                </div>
                                <p className="text-xs text-[#86868b] mt-0.5">
                                    Participant ID: <span className="font-mono font-bold text-[#007aff]">{student.student_id || student._id}</span>
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/5 rounded-full transition-all cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-5">
                        {errorMsg && (
                            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Full Name */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-[#1d1d1f] flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-[#007aff]" />
                                    Full Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Jyothi Volluri"
                                    required
                                    className="px-4 py-2.5 rounded-xl border border-[#e5e5e7] focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 text-sm font-medium outline-none transition-all"
                                />
                            </div>

                            {/* Email */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-[#1d1d1f] flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5 text-[#007aff]" />
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="e.g. student@gmail.com"
                                    className="px-4 py-2.5 rounded-xl border border-[#e5e5e7] focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 text-sm font-medium outline-none transition-all"
                                />
                            </div>

                            {/* Phone */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-[#1d1d1f] flex items-center gap-1.5">
                                    <Phone className="w-3.5 h-3.5 text-[#007aff]" />
                                    Mobile Number
                                </label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="e.g. 9876543210"
                                    className="px-4 py-2.5 rounded-xl border border-[#e5e5e7] focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 text-sm font-medium outline-none transition-all"
                                />
                            </div>

                            {/* Roll Number */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-[#1d1d1f] flex items-center gap-1.5">
                                    <Hash className="w-3.5 h-3.5 text-[#007aff]" />
                                    Roll Number
                                </label>
                                <input
                                    type="text"
                                    value={rollNumber}
                                    onChange={(e) => setRollNumber(e.target.value)}
                                    placeholder="e.g. 21A91A0501"
                                    className="px-4 py-2.5 rounded-xl border border-[#e5e5e7] focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 text-sm font-medium outline-none transition-all"
                                />
                            </div>

                            {/* Branch / Category */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-[#1d1d1f] flex items-center gap-1.5">
                                    <BookOpen className="w-3.5 h-3.5 text-[#007aff]" />
                                    Branch / Category
                                </label>
                                <input
                                    type="text"
                                    value={branch}
                                    onChange={(e) => setBranch(e.target.value)}
                                    placeholder="e.g. B.Tech / CSE / MCA"
                                    className="px-4 py-2.5 rounded-xl border border-[#e5e5e7] focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 text-sm font-medium outline-none transition-all"
                                />
                            </div>

                            {/* Current Year */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-[#1d1d1f] flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-[#007aff]" />
                                    Current Year
                                </label>
                                <input
                                    type="text"
                                    value={currentYear}
                                    onChange={(e) => setCurrentYear(e.target.value)}
                                    placeholder="e.g. 3rd Year / 4th Year"
                                    className="px-4 py-2.5 rounded-xl border border-[#e5e5e7] focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 text-sm font-medium outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* College Name */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-[#1d1d1f] flex items-center gap-1.5">
                                <School className="w-3.5 h-3.5 text-[#007aff]" />
                                College Name
                            </label>
                            <input
                                type="text"
                                list="college-options-list"
                                value={college}
                                onChange={(e) => setCollege(e.target.value)}
                                placeholder="Select or type College Name"
                                className="px-4 py-2.5 rounded-xl border border-[#e5e5e7] focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 text-sm font-medium outline-none transition-all"
                            />
                            <datalist id="college-options-list">
                                {collegesList.map((c, i) => (
                                    <option key={i} value={c} />
                                ))}
                            </datalist>
                        </div>

                        {/* Track & Task */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-[#1d1d1f] flex items-center gap-1.5">
                                    <FolderGit2 className="w-3.5 h-3.5 text-[#007aff]" />
                                    Hackathon Track (Domain)
                                </label>
                                <input
                                    type="text"
                                    list="track-options-list"
                                    value={track}
                                    onChange={(e) => setTrack(e.target.value)}
                                    placeholder="e.g. Full Stack Application"
                                    className="px-4 py-2.5 rounded-xl border border-[#e5e5e7] focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 text-sm font-medium outline-none transition-all"
                                />
                                <datalist id="track-options-list">
                                    {categoriesList.map((cat, i) => (
                                        <option key={i} value={cat.name} />
                                    ))}
                                </datalist>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-[#1d1d1f] flex items-center gap-1.5">
                                    <FileCode className="w-3.5 h-3.5 text-[#007aff]" />
                                    Challenge Task
                                </label>
                                <input
                                    type="text"
                                    value={task}
                                    onChange={(e) => setTask(e.target.value)}
                                    placeholder="e.g. Personal Finance Portal"
                                    className="px-4 py-2.5 rounded-xl border border-[#e5e5e7] focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 text-sm font-medium outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Pin-to-pin database sync guarantee note */}
                        <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-start gap-2.5 text-xs text-[#007aff]">
                            <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                            <div className="leading-relaxed">
                                <strong>Pin-to-Pin Database Sync:</strong> Changes saved here are automatically synchronized across all document fields, leader subdocuments, and team records in the database.
                            </div>
                        </div>
                    </form>

                    {/* Footer */}
                    <div className="p-6 px-8 border-t border-[#e5e5e7]/60 bg-white flex justify-end gap-3">
                        <button
                            type="button"
                            disabled={isSaving}
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl bg-[#f5f5f7] hover:bg-[#e5e5e7] text-sm font-bold text-[#1d1d1f] transition-all cursor-pointer disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={isSaving}
                            onClick={handleSave}
                            className="px-6 py-2.5 rounded-xl bg-[#007aff] hover:bg-[#0062cc] active:bg-[#0052ad] text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Saving to Database...
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
