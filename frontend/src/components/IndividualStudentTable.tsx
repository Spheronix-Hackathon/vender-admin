import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EmailTemplateModal from './EmailTemplateModal';
import TrackTaskEditModal from './TrackTaskEditModal';
import CollegeEditModal from './CollegeEditModal';
import StudentEditModal from './StudentEditModal';
import ReceiptModal from './ReceiptModal';
import { parseAndCreateReceiptBlob, ReceiptInfo } from '@/utils/receiptHelper';
import { parseExamDate, calculateRemainingTime, getFrontendExamStatus } from '@/lib/examUtils';
import { normalizeCollegeName, getStudentCollegeName } from '@/lib/collegeUtils';
import { Pencil, ArrowUpDown, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import api from '@/lib/api';

export interface TeamMember {
    name?: string;
    email?: string;
    phone?: string;
    college?: string;
    branch?: string;
    participant_id?: string;
    user_feedback?: string;
    [key: string]: any;
}

export interface Student {
    _id: string;
    student_id: string;
    team_id?: string;
    rollNumber?: string;
    currentYear?: string;
    name: string;
    email: string;
    college: string;
    participation_mode: string;
    phone: string;
    team_name?: string | null;
    leader?: any;
    team_members?: TeamMember[];
    amount?: number;
    branch: string;
    hackathon_track: string;
    task?: string;
    status: string;
    is_reviewed?: boolean;
    Reviewedby?: string | null;
    review?: string | null;
    is_selected?: boolean;
    isStarted?: boolean;
    examStartedBy?: string;
    githubLink: string;
    examStatus?: string;
    examStartedAt?: string | Date | null;
    startTime?: string | null;
    examDuration?: number | null;
    submittedAt?: string | Date | null;
    user_feedback?: string;
    transaction_id?: string | null;
    receipt?: string | null;
    receipt_name?: string | null;
    receipt_url?: string | null;
    mail_sent?: boolean;
    mail_sent_at?: string | Date | null;
    registration_date?: string | Date | null;
    city?: string;
}

export interface StatusUpdate {
    id: string;
    is_reviewed: boolean;
    is_selected: boolean;
    Reviewedby?: string | null;
    review?: string | null;
    examStatus?: string;
}

const CountdownTimer = ({ isSubmitted, startTimeStr, examDuration }: {
    isSubmitted: boolean,
    startTimeStr?: string | null,
    examDuration?: number | null
}) => {
    const [timeLeft, setTimeLeft] = useState<string>('—');

    useEffect(() => {
        if (isSubmitted) {
            setTimeLeft('Submitted');
            return;
        }
        if (!startTimeStr || !examDuration) {
            setTimeLeft('—');
            return;
        }

        const updateTimer = () => {
            const remainingSeconds = calculateRemainingTime(startTimeStr, examDuration);

            if (remainingSeconds === null) {
                setTimeLeft('—');
                return;
            }

            if (remainingSeconds <= 0) {
                setTimeLeft('Submitted');
                return;
            }

            const h = Math.floor(remainingSeconds / 3600);
            const m = Math.floor((remainingSeconds % 3600) / 60);
            const s = Math.floor(remainingSeconds % 60);

            setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [isSubmitted, startTimeStr, examDuration]);

    if (!startTimeStr) return <span className="text-xs text-[#86868b]">—</span>;

    const isSubmittedText = timeLeft === 'Submitted';

    return (
        <span className={`font-mono text-xs font-bold ${isSubmittedText ? 'text-green-600' : 'text-[#007aff]'}`}>
            {timeLeft}
        </span>
    );
};

// Fast WeakMap cache for college names to prevent heavy regex recalculations on sort
const collegeNameCache = new WeakMap<Student, string>();
const getFastCollegeName = (student: Student): string => {
    let cached = collegeNameCache.get(student);
    if (cached === undefined) {
        cached = (getStudentCollegeName(student) || student.college || '').toLowerCase();
        collegeNameCache.set(student, cached);
    }
    return cached;
};

const IndividualStudentTable = ({ data, onStatusUpdate, onReAdd, selectedIds = [], onSelectionChange, onResetMFA, onDelete, onMailSent, onUpdate, showUpload = true, apiPath = '/individual-students' }: {
    data: Student[],
    onStatusUpdate: (updates: StatusUpdate[]) => Promise<any>,
    onReAdd: (student: Student) => Promise<void>,
    selectedIds?: string[],
    onSelectionChange?: (ids: string[]) => void,
    onResetMFA?: (id: string) => void,
    onDelete?: (student: Student) => void | Promise<void>,
    onMailSent?: (id: string) => void,
    onUpdate?: () => void,
    showUpload?: boolean,
    apiPath?: string
}) => {
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [localChanges, setLocalChanges] = useState<Record<string, { is_reviewed: boolean, is_selected: boolean, Reviewedby?: string | null, review?: string | null, examStatus?: string }>>({});
    const [isUpdating, setIsUpdating] = useState(false);
    const [missingItems, setMissingItems] = useState<Student[]>([]);
    const [selectedReceipt, setSelectedReceipt] = useState<ReceiptInfo | null>(null);
    const [selectedStudentForMail, setSelectedStudentForMail] = useState<any | null>(null);
    const [bulkStudentsForMail, setBulkStudentsForMail] = useState<Student[] | null>(null);
    const [sentMailIds, setSentMailIds] = useState<Set<string>>(new Set());
    const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [studentToEditDetails, setStudentToEditDetails] = useState<Student | null>(null);

    const [adminEmail, setAdminEmail] = useState<string | null>(() => {
        if (typeof window === 'undefined') return null;
        const token = localStorage.getItem('admin_token');
        if (token && token.includes('.')) {
            try {
                const payload = JSON.parse(window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
                return payload.email || null;
            } catch (e) {}
        }
        return null;
    });
    const [userRole, setUserRole] = useState<string | null>(() => {
        if (typeof window === 'undefined') return null;
        const token = localStorage.getItem('admin_token');
        if (token && token.includes('.')) {
            try {
                const payload = JSON.parse(window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
                return payload.role || null;
            } catch (e) {}
        }
        return null;
    });
    const [editingStudentForTrackTask, setEditingStudentForTrackTask] = useState<Student | null>(null);
    const [editingStudentForCollege, setEditingStudentForCollege] = useState<Student | null>(null);
    const [tableData, setTableData] = useState<Student[]>(data);
    const [sortField, setSortField] = useState<string>('registration_date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    useEffect(() => {
        setTableData(data);
    }, [data]);

    useEffect(() => {
        api.get('/auth/me')
            .then(res => {
                if (res.data?.user?.email) {
                    setAdminEmail(res.data.user.email);
                }
            })
            .catch(() => {
                try {
                    const stored = localStorage.getItem('user');
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        if (parsed.email) setAdminEmail(parsed.email);
                    }
                } catch (e) {}
            });
    }, []);

    const handleConfirmDelete = async () => {
        if (!studentToDelete) return;
        try {
            setIsDeleting(true);
            if (onDelete) {
                await onDelete(studentToDelete);
            } else {
                await api.delete(`${apiPath}/${studentToDelete._id}`);
                setTableData(prev => prev.filter(s => s._id !== studentToDelete._id));
            }
            onUpdate?.();
            setStudentToDelete(null);
        } catch (err: any) {
            console.error('Failed to delete student:', err);
            alert(err.response?.data?.message || 'Failed to delete student from database');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSort = (field: string) => {
        setCurrentPage(1);
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            if (field === 'registration_date' || field === 'amount') {
                setSortDirection('desc');
            } else {
                setSortDirection('asc');
            }
        }
    };

    const sortedData = useMemo(() => {
        if (!sortField) return tableData;

        return [...tableData].sort((a, b) => {
            let valA: any = '';
            let valB: any = '';

            switch (sortField) {
                case 'student_id':
                    valA = a.student_id || '';
                    valB = b.student_id || '';
                    break;
                case 'rollNumber':
                    valA = a.rollNumber || '';
                    valB = b.rollNumber || '';
                    break;
                case 'currentYear':
                    valA = a.currentYear || '';
                    valB = b.currentYear || '';
                    break;
                case 'name':
                    valA = (a.name || '').toLowerCase();
                    valB = (b.name || '').toLowerCase();
                    break;
                case 'email':
                    valA = (a.email || '').toLowerCase();
                    valB = (b.email || '').toLowerCase();
                    break;
                case 'phone':
                    valA = a.phone || '';
                    valB = b.phone || '';
                    break;
                case 'college':
                    valA = getFastCollegeName(a);
                    valB = getFastCollegeName(b);
                    break;
                case 'branch':
                    valA = (a.branch || '').toLowerCase();
                    valB = (b.branch || '').toLowerCase();
                    break;
                case 'participation_mode':
                    valA = (a.participation_mode || '').toLowerCase();
                    valB = (b.participation_mode || '').toLowerCase();
                    break;
                case 'hackathon_track':
                    valA = (a.hackathon_track || '').toLowerCase();
                    valB = (b.hackathon_track || '').toLowerCase();
                    break;
                case 'task':
                    valA = (a.task || '').toLowerCase();
                    valB = (b.task || '').toLowerCase();
                    break;
                case 'amount':
                    valA = Number(a.amount) || 0;
                    valB = Number(b.amount) || 0;
                    break;
                case 'registration_date':
                    valA = a.registration_date ? new Date(a.registration_date).getTime() : 0;
                    valB = b.registration_date ? new Date(b.registration_date).getTime() : 0;
                    break;
                case 'is_reviewed':
                    valA = (localChanges[a._id]?.is_reviewed ?? a.is_reviewed) ? 1 : 0;
                    valB = (localChanges[b._id]?.is_reviewed ?? b.is_reviewed) ? 1 : 0;
                    break;
                case 'Reviewedby':
                    valA = (localChanges[a._id]?.Reviewedby ?? a.Reviewedby ?? '').toLowerCase();
                    valB = (localChanges[b._id]?.Reviewedby ?? b.Reviewedby ?? '').toLowerCase();
                    break;
                case 'is_selected':
                    valA = (localChanges[a._id]?.is_selected ?? a.is_selected) ? 1 : 0;
                    valB = (localChanges[b._id]?.is_selected ?? b.is_selected) ? 1 : 0;
                    break;
                case 'status':
                    valA = (a.status || '').toLowerCase();
                    valB = (b.status || '').toLowerCase();
                    break;
                case 'examStatus': {
                    const statusA = localChanges[a._id]?.examStatus ?? a.examStatus ?? 'Not Submitted';
                    const statusB = localChanges[b._id]?.examStatus ?? b.examStatus ?? 'Not Submitted';
                    valA = (getFrontendExamStatus(statusA, a.startTime, a.examDuration) || '').toLowerCase();
                    valB = (getFrontendExamStatus(statusB, b.startTime, b.examDuration) || '').toLowerCase();
                    break;
                }
                case 'mail_sent':
                    valA = (sentMailIds.has(a._id) || a.mail_sent) ? 1 : 0;
                    valB = (sentMailIds.has(b._id) || b.mail_sent) ? 1 : 0;
                    break;
                default:
                    valA = (a as any)[sortField] || '';
                    valB = (b as any)[sortField] || '';
            }

            if (typeof valA === 'number' && typeof valB === 'number') {
                return sortDirection === 'asc' ? valA - valB : valB - valA;
            }

            const cmp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
            return sortDirection === 'asc' ? cmp : -cmp;
        });
    }, [tableData, sortField, sortDirection, localChanges]);

    const totalStudentsInTable = useMemo(() => {
        return sortedData.reduce((acc, s) => acc + 1 + (Array.isArray(s.team_members) ? s.team_members.length : 0), 0);
    }, [sortedData]);

    const selectedStudentsInTable = useMemo(() => {
        const sel = sortedData.filter(s => selectedIds.includes(s._id));
        return sel.reduce((acc, s) => acc + 1 + (Array.isArray(s.team_members) ? s.team_members.length : 0), 0);
    }, [sortedData, selectedIds]);

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState<number>(50);

    useEffect(() => {
        setCurrentPage(1);
    }, [data.length]);

    const totalItems = sortedData.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(Math.max(1, currentPage), totalPages);

    const paginatedStudents = useMemo(() => {
        const start = (safePage - 1) * pageSize;
        return sortedData.slice(start, start + pageSize);
    }, [sortedData, safePage, pageSize]);

    const renderSortHeader = (label: string, field: string, minWidth?: string) => {
        const isActive = sortField === field;
        return (
            <th
                onClick={() => handleSort(field)}
                className={`p-5 text-xs font-semibold tracking-wider uppercase cursor-pointer select-none transition-all group ${minWidth || ''} ${
                    isActive ? 'bg-[#007aff]/10 text-[#007aff] font-bold' : 'text-[#86868b] hover:bg-[#ececf0] hover:text-[#1d1d1f]'
                }`}
                title={`Click to sort by ${label} (${isActive && sortDirection === 'asc' ? 'Click for Descending' : 'Click for Ascending'})`}
            >
                <div className="flex items-center gap-1.5">
                    <span>{label}</span>
                    {isActive ? (
                        sortDirection === 'asc' ? (
                            <ArrowUp size={14} className="text-[#007aff] shrink-0 font-bold" />
                        ) : (
                            <ArrowDown size={14} className="text-[#007aff] shrink-0 font-bold" />
                        )
                    ) : (
                        <ArrowUpDown size={13} className="text-gray-400 group-hover:text-blue-500 transition-colors shrink-0" />
                    )}
                </div>
            </th>
        );
    };

    useEffect(() => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
        if (token && token.includes('.')) {
            try {
                const base64Payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
                const payload = JSON.parse(window.atob(base64Payload));
                if (payload?.email) {
                    setAdminEmail(payload.email);
                }
            } catch (e) {}
        }
        api.get('/auth/me')
            .then(res => {
                if (res.data?.user?.email) {
                    setAdminEmail(res.data.user.email);
                }
                if (res.data?.user?.role) {
                    setUserRole(res.data.user.role);
                }
            })
            .catch(() => {});
    }, []);

    const superAdmins = ['yashwanthkumar87657@gmail.com', 'dhanushsunny00@gmail.com'];
    const isSuperAdmin = Boolean(
        (adminEmail && superAdmins.includes(adminEmail.toLowerCase().trim())) ||
        userRole === 'superadmin' ||
        userRole === 'super_admin'
    );
    const isAuthorizedUpdater = isSuperAdmin;
    const canEditTrackTask = isSuperAdmin;
    const canUploadReceipt = isSuperAdmin;
    const [uploadingReceiptId, setUploadingReceiptId] = useState<string | null>(null);

    const handleReceiptFileChange = async (studentId: string, studentName: string, file?: File) => {
        if (!file) return;
        setUploadingReceiptId(studentId);
        try {
            const reader = new FileReader();
            reader.onload = async () => {
                const base64 = reader.result as string;
                try {
                    const res = await api.post(`${apiPath}/${studentId}/upload-receipt`, {
                        receipt_base64: base64,
                        filename: file.name
                    });
                    if (res.data?.success) {
                        const uploadedUrl = res.data?.data?.receipt_url || res.data?.receipt_url || base64;
                        setTableData(prev => prev.map(s => s._id === studentId ? {
                            ...s,
                            receipt: uploadedUrl,
                            receipt_url: uploadedUrl,
                            payment_receipt_url: uploadedUrl,
                            receipt_name: file.name
                        } : s));
                        onUpdate?.();
                        alert(`✅ Receipt uploaded successfully for ${studentName}!`);
                    } else {
                        alert(`❌ Upload failed: ${res.data?.message || 'Unknown error'}`);
                    }
                } catch (err: any) {
                    alert(`❌ Upload error: ${err.response?.data?.message || err.message || 'Please try again.'}`);
                } finally {
                    setUploadingReceiptId(null);
                }
            };
            reader.onerror = () => {
                alert('❌ Failed to read file.');
                setUploadingReceiptId(null);
            };
            reader.readAsDataURL(file);
        } catch (e: any) {
            alert(`❌ Upload error: ${e.message}`);
            setUploadingReceiptId(null);
        }
    };

    const handleTrackTaskSuccess = (updated: { _id: string; hackathon_track: string; task: string }) => {
        setTableData(prev => prev.map(s => s._id === updated._id ? { ...s, hackathon_track: updated.hackathon_track, task: updated.task } : s));
        onUpdate?.();
    };

    const handleCollegeSuccess = (updated: { _id: string; college: string }) => {
        setTableData(prev => prev.map(s => s._id === updated._id ? { ...s, college: updated.college } : s));
        onUpdate?.();
    };

    const handleStudentEditSuccess = (updated: any) => {
        setTableData(prev => prev.map(s => s._id === updated._id ? {
            ...s,
            ...updated,
            name: updated.name || s.name,
            email: updated.email || s.email,
            phone: updated.phone || s.phone,
            college: updated.college || s.college,
            branch: updated.branch || s.branch,
            currentYear: updated.currentYear || s.currentYear,
            rollNumber: updated.rollNumber || s.rollNumber,
            hackathon_track: updated.hackathon_track || updated.track || s.hackathon_track,
            task: updated.task || s.task
        } : s));
        onUpdate?.();
    };

    const handleOpenReceipt = (receipt?: string | null, studentId?: string, receiptName?: string | null) => {
        const info = parseAndCreateReceiptBlob(receipt, receiptName, studentId);
        if (info) {
            setSelectedReceipt(info);
        }
    };


    const toggleRow = (id: string) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleStatusToggle = (id: string, field: 'is_reviewed' | 'is_selected', currentVal: boolean) => {
        setLocalChanges(prev => {
            const current = prev[id] || {
                is_reviewed: data.find(s => s._id === id)?.is_reviewed ?? false,
                is_selected: data.find(s => s._id === id)?.is_selected ?? false,
                Reviewedby: data.find(s => s._id === id)?.Reviewedby ?? null,
                review: data.find(s => s._id === id)?.review ?? ''
            };
            return {
                ...prev,
                [id]: {
                    ...current,
                    [field]: !currentVal
                }
            };
        });
    };

    const handleReviewerChange = (id: string, name: string) => {
        setLocalChanges(prev => {
            const current = prev[id] || {
                is_reviewed: data.find(s => s._id === id)?.is_reviewed ?? false,
                is_selected: data.find(s => s._id === id)?.is_selected ?? false,
                Reviewedby: data.find(s => s._id === id)?.Reviewedby ?? null,
                review: data.find(s => s._id === id)?.review ?? ''
            };
            return {
                ...prev,
                [id]: {
                    ...current,
                    Reviewedby: name
                }
            };
        });
    };

    const handleReviewTextChange = (id: string, text: string) => {
        setLocalChanges(prev => {
            const current = prev[id] || {
                is_reviewed: data.find(s => s._id === id)?.is_reviewed ?? false,
                is_selected: data.find(s => s._id === id)?.is_selected ?? false,
                Reviewedby: data.find(s => s._id === id)?.Reviewedby ?? null,
                review: data.find(s => s._id === id)?.review ?? ''
            };
            return {
                ...prev,
                [id]: {
                    ...current,
                    review: text
                }
            };
        });
    };



    const handleSubmitChanges = async () => {
        setIsUpdating(true);
        try {
            const updates = Object.entries(localChanges).map(([id, changes]) => ({
                id,
                ...changes
            }));
            const response = await onStatusUpdate(updates);

            if (response?.missingIds?.length > 0) {
                const missing = data.filter(s => response.missingIds.includes(s._id));
                setMissingItems(missing);
            }

            setLocalChanges({});
        } catch (error) {
            console.error('Failed to submit status updates:', error);
            alert('Failed to update statuses');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleConfirmReAdd = async (confirm: boolean) => {
        if (confirm && missingItems.length > 0) {
            for (const student of missingItems) {
                await onReAdd(student);
            }
        }
        setMissingItems([]);
    };

    const hasChanges = Object.keys(localChanges).length > 0;

    return (
        <>
        <div className="flex flex-col gap-4 relative">
            {/* Missing Data Popup/Modal */}
            {missingItems.length > 0 && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 m-4 scale-in-center overflow-hidden">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                    <line x1="12" y1="9" x2="12" y2="13" />
                                    <line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-[#1d1d1f]">Record Not Found</h3>
                            <p className="text-[#86868b] text-sm leading-relaxed">
                                {missingItems.length === 1
                                    ? `The entry for "${missingItems[0].name}" no longer exists in the database.`
                                    : `${missingItems.length} entries no longer exist in the database.`
                                }
                                <br />Would you like to re-add this data?
                            </p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => handleConfirmReAdd(false)}
                                className="flex-1 px-6 py-3 rounded-2xl font-bold text-sm bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed] transition-colors"
                            >
                                No, Skip
                            </button>
                            <button
                                onClick={() => handleConfirmReAdd(true)}
                                className="flex-1 px-6 py-3 rounded-2xl font-bold text-sm bg-[#007aff] text-white hover:bg-[#0071e3] transition-colors shadow-lg shadow-blue-500/20"
                            >
                                Yes, Re-add
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {hasChanges && (
                <div className="flex justify-end pr-4">
                    <button
                        onClick={handleSubmitChanges}
                        disabled={isUpdating}
                        className="bg-[#007aff] text-white px-6 py-2 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isUpdating ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : null}
                        Submit Changes ({Object.keys(localChanges).length})
                    </button>
                </div>
            )}
            <div className="glass-card overflow-x-auto">
                <table className="w-full text-left min-w-[2900px]">
                    <thead className="bg-[#fbfbfd] border-b border-[#e5e5e7]">
                        <tr>
                            <th className="p-5 w-10">
                                <div className="flex items-center justify-center">
                                    <input
                                        type="checkbox"
                                        checked={sortedData.length > 0 && selectedIds.length === sortedData.length}
                                        onChange={(e) => {
                                            if (onSelectionChange) {
                                                onSelectionChange(e.target.checked ? sortedData.map(s => s._id) : []);
                                            }
                                        }}
                                        className="w-4 h-4 rounded-md border-[#d2d2d7] text-[#007aff] focus:ring-[#007aff] cursor-pointer accent-[#007aff]"
                                    />
                                </div>
                            </th>
                            {renderSortHeader('ID', 'student_id')}
                            {renderSortHeader('Roll Number', 'rollNumber')}
                            {renderSortHeader('Year', 'currentYear')}
                            {renderSortHeader('Name', 'name')}
                            {renderSortHeader('Email', 'email')}
                            {renderSortHeader('Phone', 'phone')}
                            {renderSortHeader('College', 'college')}
                            {renderSortHeader('Category', 'branch')}
                            {renderSortHeader('Mode', 'participation_mode')}
                            {renderSortHeader('Track', 'hackathon_track')}
                            {renderSortHeader('Task', 'task')}
                            <th className="p-5 text-xs font-semibold text-[#86868b] tracking-wider uppercase min-w-[100px]">UTR</th>
                            <th className="p-5 text-xs font-semibold text-[#86868b] tracking-wider uppercase min-w-[100px]">Receipt</th>
                            {renderSortHeader('Date & Time', 'registration_date', 'min-w-[140px]')}
                            {renderSortHeader('Reviewed', 'is_reviewed')}
                            {renderSortHeader('Reviewed By', 'Reviewedby')}
                            <th className="p-5 text-xs font-semibold text-[#86868b] tracking-wider uppercase min-w-[220px]">Review</th>
                            {renderSortHeader('Selected', 'is_selected')}
                            {renderSortHeader('Status', 'status')}
                            {renderSortHeader('Exam Status', 'examStatus')}
                            <th className="p-5 text-xs font-semibold text-[#86868b] tracking-wider uppercase">Remaining Time</th>
                            <th className="p-5 text-xs font-semibold text-[#86868b] tracking-wider uppercase">GitHub</th>
                            <th className="p-5 text-xs font-semibold text-[#86868b] tracking-wider uppercase">Exam</th>
                            {isSuperAdmin && (
                                <th className="p-5 text-xs font-semibold text-[#86868b] tracking-wider uppercase">Started By</th>
                            )}
                            <th className="p-5 text-xs font-semibold text-[#86868b] tracking-wider uppercase min-w-[200px]">User Feedback</th>
                            <th className="p-5 text-xs font-semibold text-[#86868b] tracking-wider uppercase">Actions</th>
                            <th className="p-4 text-xs font-semibold text-[#86868b] tracking-wider uppercase min-w-[280px]">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleSort('mail_sent')}
                                        className="flex items-center gap-1 font-bold text-[#1d1d1f] hover:text-[#007aff] transition-colors cursor-pointer group select-none"
                                        title={`Click to sort by Mail status (${sortField === 'mail_sent' && sortDirection === 'asc' ? 'Click for Descending' : 'Click for Ascending'})`}
                                    >
                                        <span>Mail</span>
                                        {sortField === 'mail_sent' ? (
                                            sortDirection === 'asc' ? <ArrowUp size={13} className="text-[#007aff] shrink-0 font-bold" /> : <ArrowDown size={13} className="text-[#007aff] shrink-0 font-bold" />
                                        ) : (
                                            <ArrowUpDown size={12} className="text-gray-400 group-hover:text-blue-500 transition-colors shrink-0" />
                                        )}
                                    </button>
                                    <div className="flex items-center gap-1.5 ml-auto">
                                        {/* Button 1: Send Selected Students */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const sel = sortedData.filter(s => selectedIds.includes(s._id));
                                                if (sel.length === 0) {
                                                    alert('⚠️ Please select at least one student using the checkboxes on the left first.');
                                                    return;
                                                }
                                                setBulkStudentsForMail(sel);
                                            }}
                                            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold rounded-lg shadow-sm transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
                                                selectedIds.length > 0
                                                    ? 'bg-[#007aff] hover:bg-[#0062cc] text-white hover:scale-105'
                                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                                            }`}
                                            title={selectedIds.length > 0 ? `Send email to ${selectedStudentsInTable} selected student(s) (${selectedIds.length} registrations)` : 'Select students on left, then click here to send'}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <rect width="20" height="16" x="2" y="4" rx="2" />
                                                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                            </svg>
                                            {selectedIds.length > 0 ? `Send Selected (${selectedStudentsInTable} Students)` : 'Send Selected'}
                                        </button>

                                        {/* Button 2: Send All Students at once */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (sortedData.length === 0) {
                                                    alert('No approved students available to send email.');
                                                    return;
                                                }
                                                setBulkStudentsForMail(sortedData);
                                            }}
                                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap"
                                            title={`Send approval email to all ${totalStudentsInTable} students (${sortedData.length} registrations)`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                                <circle cx="9" cy="7" r="4" />
                                                <polyline points="16 11 18 13 22 9" />
                                            </svg>
                                            Send All ({totalStudentsInTable} Students)
                                        </button>
                                    </div>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5e5e7]">
                        {paginatedStudents.map((student, sIdx) => {
                            const isTeam = !!(student.team_name) || student.participation_mode === 'team';
                            const members: TeamMember[] = Array.isArray(student.team_members) ? student.team_members : [];
                            const isExpanded = expandedRows.has(student._id);

                            return (
                                <React.Fragment key={student._id || student.student_id || `s-${sIdx}`}>
                                    <tr className={`${isExpanded ? 'bg-blue-50/50' : 'hover:bg-[#f5f5f7]'} ${selectedIds.includes(student._id) ? 'bg-[#007aff]/5' : ''}`}>
                                        <td className="p-5 w-10" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(student._id)}
                                                    onChange={(e) => {
                                                        if (onSelectionChange) {
                                                            const newSelection = e.target.checked
                                                                ? [...selectedIds, student._id]
                                                                : selectedIds.filter(id => id !== student._id);
                                                            onSelectionChange(newSelection);
                                                        }
                                                    }}
                                                    className="w-4 h-4 rounded-md border-[#d2d2d7] text-[#007aff] focus:ring-[#007aff] cursor-pointer accent-[#007aff]"
                                                />
                                            </div>
                                        </td>
                                        <td className="p-5 text-sm font-mono text-[#86868b]">
                                            {student.student_id}
                                        </td>
                                        <td className="p-5 text-sm font-mono text-[#86868b]">
                                            {student.rollNumber || '—'}
                                        </td>
                                        <td className="p-5 text-sm text-[#86868b]">
                                            {student.currentYear || '—'}
                                        </td>
                                        <td className="p-5 text-sm font-semibold text-[#1d1d1f]">
                                            {student.name}
                                        </td>
                                        <td className="p-5 text-sm text-[#86868b]">
                                            {student.email}
                                        </td>
                                        <td className="p-5 text-sm text-[#86868b]">
                                            {student.phone}
                                        </td>
                                        <td className="p-5 text-sm text-[#86868b] max-w-[220px]">
                                            <div className="flex items-center justify-between gap-1.5 group">
                                                <span className="font-medium text-[#1d1d1f]" title={getStudentCollegeName(student)}>
                                                    {getStudentCollegeName(student)}
                                                </span>
                                                {canEditTrackTask && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingStudentForCollege(student);
                                                        }}
                                                        title="Edit College (Authorized Admin)"
                                                        className="p-1 text-[#007aff] hover:bg-[#007aff]/10 rounded-md transition-colors shrink-0 cursor-pointer"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-5 text-sm text-[#86868b]">
                                            {student.branch}
                                        </td>
                                        <td className="p-5 text-sm">
                                            {isTeam ? (
                                                <button
                                                    onClick={() => toggleRow(student._id)}
                                                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer hover:opacity-80 ${isExpanded
                                                        ? 'bg-purple-100 text-purple-700 shadow-sm'
                                                        : 'bg-purple-50 text-purple-600'
                                                        }`}
                                                >
                                                    {student.participation_mode || 'team'}
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        width="10" height="10"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="3"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                                    >
                                                        <path d="m6 9 6 6 6-6" />
                                                    </svg>
                                                </button>
                                            ) : (
                                                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600">
                                                    {student.participation_mode || 'individual'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-5 text-sm text-[#86868b]">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[#1d1d1f] font-medium">{student.hackathon_track || '—'}</span>
                                                {canEditTrackTask && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingStudentForTrackTask(student);
                                                        }}
                                                        title="Edit Track & Task (Authorized Admin)"
                                                        className="p-1 text-[#007aff] hover:bg-[#007aff]/10 rounded-md transition-colors shrink-0"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-5 text-sm text-[#86868b]">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[#1d1d1f] font-medium">{student.status === 'approved' ? (student.task || '—') : (student.task || 'Not Assigned')}</span>
                                                {canEditTrackTask && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingStudentForTrackTask(student);
                                                        }}
                                                        title="Edit Track & Task (Authorized Admin)"
                                                        className="p-1 text-[#007aff] hover:bg-[#007aff]/10 rounded-md transition-colors shrink-0"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>

                                        <td className="p-5">
                                            {student.transaction_id && !student.transaction_id.startsWith('IMPORT_') ? (
                                                <span className="text-xs font-mono font-medium text-[#1d1d1f] bg-gray-100 px-2 py-1 rounded-md max-w-[120px] truncate" title={student.transaction_id}>
                                                    {student.transaction_id}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-medium text-[#86868b] bg-gray-50 border border-gray-200/60 px-2 py-0.5 rounded-full inline-block" title="UTR not provided">
                                                    No UTR
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-5">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {(() => {
                                                    const activeReceiptEndpoint = student.receipt || student.receipt_url || `/api${apiPath}/${student._id}/payment-receipt`;
                                                    return (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenReceipt(activeReceiptEndpoint, student.student_id, student.receipt_name)}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#e8f2ff] text-[#007aff] hover:bg-[#d1e5ff] hover:shadow-sm transition-all duration-200 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                                                                View Receipt
                                                            </button>
                                                            {canUploadReceipt && (
                                                                <label
                                                                    htmlFor={`reupload-receipt-${student._id}`}
                                                                    title="Upload new / replace receipt (Super Admin Only)"
                                                                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-300 hover:border-amber-400 transition-all duration-200 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none ${uploadingReceiptId === student._id ? 'opacity-50 pointer-events-none' : ''}`}
                                                                >
                                                                    {uploadingReceiptId === student._id ? (
                                                                        <svg className="animate-spin h-3 w-3 text-amber-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                                                                    ) : (
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                                                    )}
                                                                    <span>{uploadingReceiptId === student._id ? 'Uploading...' : 'Upload / Replace'}</span>
                                                                    <input
                                                                        id={`reupload-receipt-${student._id}`}
                                                                        type="file"
                                                                        accept="image/jpeg,image/png,image/webp,application/pdf"
                                                                        className="hidden"
                                                                        disabled={uploadingReceiptId === student._id}
                                                                        onChange={(e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (file) handleReceiptFileChange(student._id, student.name || student.student_id, file);
                                                                            e.target.value = '';
                                                                        }}
                                                                    />
                                                                </label>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </td>
                                        <td className="p-5 text-sm">
                                            {student.registration_date ? (
                                                (() => {
                                                    const d = new Date(student.registration_date);
                                                    if (isNaN(d.getTime())) return <span className="text-gray-400 italic text-xs">—</span>;
                                                    return (
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-semibold text-[#1d1d1f] whitespace-nowrap">
                                                                {d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </span>
                                                            <span className="text-[10px] text-[#86868b] font-medium uppercase tracking-wider mt-0.5 whitespace-nowrap">
                                                                {d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                            </span>
                                                        </div>
                                                    );
                                                })()
                                            ) : (
                                                <span className="text-gray-400 italic text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="p-5">
                                            <button
                                                onClick={() => handleStatusToggle(student._id, 'is_reviewed', localChanges[student._id]?.is_reviewed ?? student.is_reviewed ?? false)}
                                                className={`w-10 h-5 rounded-full transition-colors relative ${(localChanges[student._id]?.is_reviewed ?? student.is_reviewed) ? 'bg-[#34c759]' : 'bg-[#e5e5e7]'}`}
                                            >
                                                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${(localChanges[student._id]?.is_reviewed ?? student.is_reviewed) ? 'translate-x-5' : ''}`} />
                                            </button>
                                        </td>
                                        <td className="p-5">
                                            <input
                                                type="text"
                                                value={localChanges[student._id]?.Reviewedby ?? student.Reviewedby ?? ''}
                                                onChange={(e) => handleReviewerChange(student._id, e.target.value)}
                                                placeholder="Enter admin name"
                                                className="w-full px-3 py-1.5 text-xs bg-white/50 border border-[#e5e5e7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007aff]/20 transition-all font-medium text-[#1d1d1f]"
                                            />
                                        </td>
                                        <td className="p-5 min-w-[220px]">
                                            <textarea
                                                value={localChanges[student._id]?.review ?? student.review ?? ''}
                                                onChange={(e) => handleReviewTextChange(student._id, e.target.value)}
                                                placeholder="Enter evaluation feedback..."
                                                rows={2}
                                                className="w-full px-3 py-1.5 text-xs bg-white/50 border border-[#e5e5e7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007aff]/20 transition-all font-medium text-[#1d1d1f] resize-y min-h-[42px]"
                                            />
                                        </td>
                                        <td className="p-5">
                                            <button
                                                onClick={() => handleStatusToggle(student._id, 'is_selected', localChanges[student._id]?.is_selected ?? student.is_selected ?? false)}
                                                className={`w-10 h-5 rounded-full transition-colors relative ${(localChanges[student._id]?.is_selected ?? student.is_selected) ? 'bg-[#007aff]' : 'bg-[#e5e5e7]'}`}
                                            >
                                                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${(localChanges[student._id]?.is_selected ?? student.is_selected) ? 'translate-x-5' : ''}`} />
                                            </button>
                                        </td>
                                        <td className="p-5">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${student.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                                {student.status}
                                            </span>
                                        </td>
                                        <td className="p-5">
                                            {(() => {
                                                const rawStatus = localChanges[student._id]?.examStatus ?? student.examStatus ?? 'Not Submitted';
                                                const isSubmitted = getFrontendExamStatus(rawStatus, student.startTime, student.examDuration) === 'Submitted';

                                                return (
                                                    <div className="flex flex-col items-start gap-1">
                                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${isSubmitted ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
                                                            {isSubmitted ? 'Submitted' : 'Not Submitted'}
                                                        </span>
                                                        {isSubmitted && student.submittedAt && (
                                                            <span className="text-[9px] text-[#86868b] font-medium leading-tight whitespace-nowrap">
                                                                {new Date(student.submittedAt).toLocaleString('en-US', {
                                                                    month: 'short', day: 'numeric',
                                                                    hour: '2-digit', minute: '2-digit'
                                                                })}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="p-5">
                                            {(() => {
                                                const rawStatus = localChanges[student._id]?.examStatus ?? student.examStatus ?? 'Not Submitted';
                                                const isSubmitted = getFrontendExamStatus(rawStatus, student.startTime, student.examDuration) === 'Submitted';

                                                return <CountdownTimer
                                                    isSubmitted={isSubmitted}
                                                    startTimeStr={student.startTime}
                                                    examDuration={student.examDuration}
                                                />;
                                            })()}
                                        </td>
                                        <td className="p-5">
                                            {student.githubLink && student.githubLink !== 'N/A' ? (
                                                <a
                                                    href={student.githubLink.startsWith('http') ? student.githubLink : `https://${student.githubLink}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition-all border border-gray-200 group"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform">
                                                        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                                                    </svg>
                                                    <span className="text-xs font-bold">Link</span>
                                                </a>
                                            ) : (
                                                <span className="text-xs text-[#86868b] italic">Not Provided</span>
                                            )}
                                        </td>
                                        <td className="p-5">
                                            {student.isStarted ? (
                                                <span className="px-2 py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded uppercase">Started</span>
                                            ) : (
                                                <span className="px-2 py-1 bg-gray-50 text-gray-400 text-[10px] font-bold rounded uppercase">Not Started</span>
                                            )}
                                        </td>
                                        {isSuperAdmin && (
                                            <td className="p-5 min-w-[120px]">
                                                {student.examStartedBy ? (
                                                    <span className="text-[11px] font-medium text-[#007aff] break-all">{student.examStartedBy}</span>
                                                ) : (
                                                    <span className="text-xs text-[#86868b] italic">Not Started</span>
                                                )}
                                            </td>
                                        )}
                                        <td className="p-5 min-w-[200px]">
                                            {student.user_feedback ? (
                                                <div className="relative group cursor-default">
                                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur opacity-0 group-hover:opacity-30 transition duration-500"></div>
                                                    <div className="relative text-xs text-[#1d1d1f] leading-relaxed max-h-24 overflow-y-auto bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-[#e5e5e7]/50 shadow-sm group-hover:shadow-md transition-all duration-300">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-1.5 text-[#007aff] -mt-0.5 opacity-80"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                                        <span className="font-medium tracking-wide whitespace-pre-wrap">{student.user_feedback}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-xs text-[#86868b] italic bg-[#f5f5f7]/60 p-3 rounded-xl border border-dashed border-[#d2d2d7] flex items-center gap-1.5 justify-center opacity-70">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="m4.9 4.9 14.2 14.2"></path></svg>
                                                    No feedback
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-5">
                                            <div className="flex items-center gap-2">
                                                {isAuthorizedUpdater && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setStudentToEditDetails(student);
                                                        }}
                                                        className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-[#007aff] hover:bg-[#007aff] hover:text-white transition-all border border-blue-200 text-xs font-bold flex items-center gap-1 whitespace-nowrap shadow-sm hover:shadow cursor-pointer"
                                                        title={`Edit details for ${student.name} (Super Admin Only)`}
                                                    >
                                                        <Pencil size={12} />
                                                        Edit
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (window.confirm(`Are you sure you want to reset MFA for ${student.name}?`)) {
                                                            onResetMFA && onResetMFA(student._id);
                                                        }
                                                    }}
                                                    className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all border border-amber-200 text-xs font-bold whitespace-nowrap shadow-sm"
                                                    title={`Reset MFA for ${student.name}`}
                                                >
                                                    Reset MFA
                                                </button>
                                                {isSuperAdmin && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setStudentToDelete(student);
                                                        }}
                                                        className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all border border-red-200 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shadow-sm hover:shadow"
                                                        title={`Delete ${student.name} permanently from database (Super Admin Only)`}
                                                    >
                                                        <Trash2 size={13} />
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            {Boolean(student.mail_sent || sentMailIds.has(student._id)) ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedStudentForMail(student);
                                                    }}
                                                    title={student.mail_sent_at ? `Mail sent on ${new Date(student.mail_sent_at).toLocaleString('en-IN')}. Click to view or resend.` : 'Mail already sent. Click to view or resend.'}
                                                    className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all border border-emerald-300 text-xs font-bold flex items-center gap-1.5 shadow-sm"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                    Mail Sent
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedStudentForMail(student);
                                                    }}
                                                    className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all border border-blue-200 text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                                                    Send Mail
                                                </button>
                                            )}
                                        </td>
                                    </tr>

                                    {isExpanded && (
                                        <tr>
                                            <td colSpan={28} className="p-0 bg-gradient-to-r from-blue-50/60 to-transparent border-l-4 border-[#007aff]">
                                                <div className="px-8 py-6">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#007aff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                                                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                                        </svg>
                                                        <span className="text-sm font-bold text-[#007aff]">
                                                            Team: {student.team_name || '(Unnamed)'}
                                                        </span>
                                                    </div>

                                                    {members.length === 0 ? (
                                                        <div className="flex items-start gap-3">
                                                            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#007aff]/20 shadow-sm w-80">
                                                                <div className="w-9 h-9 rounded-full bg-[#007aff] text-white flex items-center justify-center font-bold text-sm uppercase shrink-0">
                                                                    {(student.name || 'L').charAt(0)}
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex justify-between items-start">
                                                                        <p className="font-semibold text-sm text-[#1d1d1f] truncate">
                                                                            {student.name}
                                                                            <span className="ml-2 text-[10px] font-bold text-[#007aff] bg-blue-50 px-1.5 py-0.5 rounded">Leader</span>
                                                                        </p>
                                                                        <CountdownTimer
                                                                            isSubmitted={false}
                                                                            startTimeStr={student.startTime}
                                                                            examDuration={student.examDuration}
                                                                        />
                                                                    </div>
                                                                    <p className="text-xs font-mono text-[#86868b]">{student.team_id !== 'N/A' ? student.team_id : student.student_id}</p>
                                                                    <p className="text-xs text-[#86868b] truncate">{student.email}</p>
                                                                    <p className="text-xs text-[#86868b] truncate">{student.phone || (student as any).mobile}</p>
                                                                    {student.status === 'approved' && student.task && student.task !== 'Not Assigned' && (
                                                                        <p className="text-[10px] text-[#007aff] font-medium mt-0.5 truncate italic">Task: {student.task}</p>
                                                                    )}
                                                                    {student.user_feedback ? (
                                                                        <div className="mt-2 text-[10px] text-[#1d1d1f] bg-[#f5f5f7]/80 p-2 rounded-lg border border-[#e5e5e7] max-h-20 overflow-y-auto">
                                                                            <span className="font-semibold text-[#86868b] block mb-0.5">Feedback:</span>
                                                                            <span className="italic whitespace-pre-wrap">{student.user_feedback}</span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="mt-2 text-[10px] text-[#86868b] italic opacity-60">No feedback submitted</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <p className="text-xs text-[#86868b] italic mt-4">No additional members found. Restart backend to load team data.</p>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                                            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#007aff]/20 shadow-sm">
                                                                <div className="w-9 h-9 rounded-full bg-[#007aff] text-white flex items-center justify-center font-bold text-sm uppercase shrink-0">
                                                                    {(student.name || 'L').charAt(0)}
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex justify-between items-start">
                                                                        <p className="font-semibold text-sm text-[#1d1d1f] truncate">
                                                                            {student.name}
                                                                            <span className="ml-2 text-[10px] font-bold text-[#007aff] bg-blue-50 px-1.5 py-0.5 rounded">Leader</span>
                                                                        </p>
                                                                        <CountdownTimer
                                                                            isSubmitted={false}
                                                                            startTimeStr={student.startTime}
                                                                            examDuration={student.examDuration}
                                                                        />
                                                                    </div>
                                                                    <p className="text-xs font-mono text-[#86868b]">{student.team_id !== 'N/A' ? student.team_id : student.student_id}</p>
                                                                    <p className="text-xs text-[#86868b] truncate">{student.email}</p>
                                                                    <p className="text-xs text-[#86868b] truncate">{student.phone || (student as any).mobile}</p>
                                                                    {student.status === 'approved' && student.task && student.task !== 'Not Assigned' && (
                                                                        <p className="text-[10px] text-[#007aff] font-medium mt-0.5 truncate italic">Task: {student.task}</p>
                                                                    )}
                                                                    {student.user_feedback ? (
                                                                        <div className="mt-2 text-[10px] text-[#1d1d1f] bg-[#f5f5f7]/80 p-2 rounded-lg border border-[#e5e5e7] max-h-20 overflow-y-auto">
                                                                            <span className="font-semibold text-[#86868b] block mb-0.5">Feedback:</span>
                                                                            <span className="italic whitespace-pre-wrap">{student.user_feedback}</span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="mt-2 text-[10px] text-[#86868b] italic opacity-60">No feedback submitted</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {members.map((member, idx) => (
                                                                <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#e5e5e7] shadow-sm">
                                                                    <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm uppercase shrink-0">
                                                                        {(member.name || member.email || 'M').charAt(0)}
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="flex justify-between items-start">
                                                                            <p className="font-semibold text-sm text-[#1d1d1f] truncate">{member.name || member.email || `Member ${idx + 1}`}</p>
                                                                            <CountdownTimer
                                                                                isSubmitted={member.examstatus === 'Submitted' || member.is_submitted === true}
                                                                                startTimeStr={member.startTime || student.startTime}
                                                                                examDuration={member.examDuration || student.examDuration}
                                                                            />
                                                                        </div>
                                                                        <p className="text-xs font-mono text-[#86868b]">{member.participant_id || 'N/A'}</p>
                                                                        {member.email && member.email !== member.name && <p className="text-xs text-[#86868b] truncate">{member.email}</p>}
                                                                        {member.phone && <p className="text-xs text-[#86868b] truncate">{member.phone}</p>}
                                                                        {member.college && <p className="text-xs text-[#86868b] truncate">{getStudentCollegeName(member)}</p>}
                                                                        {member.branch && <p className="text-xs text-[#007aff] font-medium truncate">{member.branch}</p>}
                                                                        {member.user_feedback ? (
                                                                            <div className="mt-2 text-[10px] text-[#1d1d1f] bg-[#f5f5f7]/80 p-2 rounded-lg border border-[#e5e5e7] max-h-20 overflow-y-auto">
                                                                                <span className="font-semibold text-[#86868b] block mb-0.5">Feedback:</span>
                                                                                <span className="italic whitespace-pre-wrap">{member.user_feedback}</span>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="mt-2 text-[10px] text-[#86868b] italic opacity-60">No feedback submitted</div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <div className="mt-4 p-4 bg-white rounded-xl border border-[#e5e5e7] shadow-sm">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#007aff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                            </svg>
                                                            <span className="text-xs font-bold text-[#1d1d1f] uppercase tracking-wider">Review & Feedback</span>
                                                        </div>
                                                        <textarea
                                                            value={localChanges[student._id]?.review ?? student.review ?? ''}
                                                            onChange={(e) => handleReviewTextChange(student._id, e.target.value)}
                                                            placeholder="Write evaluation feedback (code quality, implementation, problem-solving approach, overall performance)..."
                                                            rows={3}
                                                            className="w-full p-3 text-xs bg-[#f5f5f7]/50 border border-[#e5e5e7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007aff]/20 transition-all text-[#1d1d1f]"
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={28} className="p-10 text-center text-[#86868b]">No students found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {totalItems > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-4 py-3 bg-white/80 backdrop-blur-md rounded-2xl border border-[#e5e5e7] shadow-sm">
                    <div className="flex items-center gap-3 text-xs text-[#86868b]">
                        <span>
                            Showing <strong className="text-[#1d1d1f]">{Math.min((safePage - 1) * pageSize + 1, totalItems)}</strong> to <strong className="text-[#1d1d1f]">{Math.min(safePage * pageSize, totalItems)}</strong> of <strong className="text-[#1d1d1f]">{totalItems.toLocaleString()}</strong> individual students
                        </span>
                        <div className="flex items-center gap-1.5 ml-4">
                            <span className="text-[#86868b]">Per page:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="px-2 py-1 bg-white border border-[#e5e5e7] rounded-lg text-xs font-semibold text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#007aff]/30"
                            >
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={200}>200</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            disabled={safePage <= 1}
                            onClick={() => setCurrentPage(1)}
                            className="px-2.5 py-1 text-xs font-semibold text-[#1d1d1f] bg-white hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none rounded-lg border border-[#e5e5e7] transition-all"
                            title="First Page"
                        >
                            «
                        </button>
                        <button
                            type="button"
                            disabled={safePage <= 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className="px-3 py-1 text-xs font-semibold text-[#1d1d1f] bg-white hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none rounded-lg border border-[#e5e5e7] transition-all flex items-center gap-1"
                        >
                            ‹ Prev
                        </button>

                        <div className="flex items-center gap-1 px-2">
                            <span className="text-xs text-[#86868b]">Page</span>
                            <span className="text-xs font-bold text-[#007aff] px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-md">
                                {safePage}
                            </span>
                            <span className="text-xs text-[#86868b]">of {totalPages}</span>
                        </div>

                        <button
                            type="button"
                            disabled={safePage >= totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className="px-3 py-1 text-xs font-semibold text-[#1d1d1f] bg-white hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none rounded-lg border border-[#e5e5e7] transition-all flex items-center gap-1"
                        >
                            Next ›
                        </button>
                        <button
                            type="button"
                            disabled={safePage >= totalPages}
                            onClick={() => setCurrentPage(totalPages)}
                            className="px-2.5 py-1 text-xs font-semibold text-[#1d1d1f] bg-white hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none rounded-lg border border-[#e5e5e7] transition-all"
                            title="Last Page"
                        >
                            »
                        </button>
                    </div>
                </div>
            )}

            <ReceiptModal
                isOpen={!!selectedReceipt}
                receipt={selectedReceipt}
                onClose={() => setSelectedReceipt(null)}
            />
        </div>
            <EmailTemplateModal
                isOpen={!!selectedStudentForMail || !!bulkStudentsForMail}
                onClose={() => {
                    setSelectedStudentForMail(null);
                    setBulkStudentsForMail(null);
                }}
                onSuccess={(idOrIds) => {
                    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
                    setSentMailIds(prev => {
                        const next = new Set(prev);
                        ids.forEach(id => next.add(id));
                        return next;
                    });
                    setTableData(prev => prev.map(s => ids.includes(s._id) ? { ...s, mail_sent: true, mail_sent_at: new Date() } : s));
                    if (onMailSent) {
                        ids.forEach(id => onMailSent(id));
                    }
                }}
                student={selectedStudentForMail ? {
                    ...selectedStudentForMail,
                    mail_sent: Boolean(selectedStudentForMail.mail_sent || sentMailIds.has(selectedStudentForMail._id))
                } : null}
                students={bulkStudentsForMail ? bulkStudentsForMail.map(s => ({
                    ...s,
                    mail_sent: Boolean(s.mail_sent || sentMailIds.has(s._id))
                })) : undefined}
                apiPath={apiPath}
            />
            <TrackTaskEditModal
                isOpen={!!editingStudentForTrackTask}
                onClose={() => setEditingStudentForTrackTask(null)}
                student={editingStudentForTrackTask}
                apiPath={apiPath}
                onSuccess={handleTrackTaskSuccess}
            />
            <CollegeEditModal
                isOpen={!!editingStudentForCollege}
                onClose={() => setEditingStudentForCollege(null)}
                student={editingStudentForCollege}
                apiPath={apiPath}
                onSuccess={handleCollegeSuccess}
            />
            <StudentEditModal
                isOpen={!!studentToEditDetails}
                onClose={() => setStudentToEditDetails(null)}
                student={studentToEditDetails}
                apiPath={apiPath}
                onSuccess={handleStudentEditSuccess}
            />

            {/* Delete Student Confirmation Modal */}
            <AnimatePresence>
                {studentToDelete && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md"
                        onClick={() => !isDeleting && setStudentToDelete(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white/95 backdrop-blur-xl border border-white/40 rounded-3xl shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3)] w-full max-w-md flex flex-col overflow-hidden"
                        >
                            <div className="p-8 pb-6 flex flex-col items-center text-center gap-4">
                                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-2 border border-red-100">
                                    <Trash2 className="w-8 h-8 text-red-600" />
                                </div>
                                <h3 className="text-2xl font-black text-[#1d1d1f] tracking-tight">Delete Student?</h3>
                                <p className="text-[#86868b] font-medium leading-relaxed">
                                    Are you sure you want to permanently delete <strong className="text-[#1d1d1f]">{studentToDelete.name}</strong>?
                                </p>
                                <div className="w-full bg-[#f5f5f7] p-3 rounded-2xl text-left flex flex-col gap-1.5 text-xs border border-[#e5e5e7]">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[#86868b] font-medium">Participant ID:</span>
                                        <span className="font-mono font-bold text-[#1d1d1f]">{studentToDelete.student_id || studentToDelete._id}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[#86868b] font-medium">Email:</span>
                                        <span className="font-medium text-[#1d1d1f] truncate max-w-[200px]" title={studentToDelete.email}>{studentToDelete.email}</span>
                                    </div>
                                    {studentToDelete.college && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-[#86868b] font-medium">College:</span>
                                            <span className="font-medium text-[#1d1d1f] truncate max-w-[200px]" title={studentToDelete.college}>{studentToDelete.college}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="text-xs text-red-600 bg-red-50/70 border border-red-100 p-3 rounded-xl w-full text-left leading-relaxed">
                                    ⚠️ <strong>Warning:</strong> This will permanently delete this student record from the database. This action cannot be undone.
                                </div>
                                <div className="text-[11px] text-[#007aff] bg-blue-50/70 border border-blue-100 p-2.5 rounded-xl w-full text-left flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-[#007aff] animate-pulse shrink-0" />
                                    <span>Audit Notice: Deletion action will be logged under <strong>{adminEmail || 'current admin'}</strong> and linked to Super Admin logs.</span>
                                </div>
                            </div>
                            <div className="p-6 pt-0 flex gap-3">
                                <button
                                    type="button"
                                    disabled={isDeleting}
                                    onClick={() => setStudentToDelete(null)}
                                    className="flex-1 py-3 bg-[#f5f5f7] hover:bg-[#e5e5e7] text-[#1d1d1f] font-bold rounded-2xl transition-all cursor-pointer disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={isDeleting}
                                    onClick={handleConfirmDelete}
                                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-2xl shadow-[0_8px_16px_-4px_rgba(239,68,68,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    {isDeleting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Deleting...
                                        </>
                                    ) : (
                                        'Yes, Delete'
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default IndividualStudentTable;
