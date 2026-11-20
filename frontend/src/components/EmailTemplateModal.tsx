"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit3, Send, AlertCircle, Users, Check, ChevronLeft, ChevronRight, Mail, List, UserCheck, Zap, Clock } from 'lucide-react';
import api from '@/lib/api';

interface EmailTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (studentId: string | string[]) => void;
    student?: any;
    students?: any[];
    apiPath: string; // e.g. '/students' or '/individual-students'
}

export default function EmailTemplateModal({ isOpen, onClose, onSuccess, student, students, apiPath }: EmailTemplateModalProps) {
    const [mode, setMode] = useState<'preview' | 'edit'>('preview');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const [subject, setSubject] = useState('Spheronix Hackathon 2026 - Official Registration Confirmation');
    const [body, setBody] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [sendProgress, setSendProgress] = useState<{
        current: number;
        total: number;
        etaSeconds?: number;
        currentRate?: number;
    } | null>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [previewIndex, setPreviewIndex] = useState(0);
    const [showStudentList, setShowStudentList] = useState(false);

    const prevOpenRef = useRef(false);
    const cancelSendRef = useRef(false);

    const isBulk = Boolean(students && students.length > 0);
    const studentList = isBulk ? (students || []) : (student ? [student] : []);
    const activeStudent = studentList[previewIndex] || studentList[0] || null;
    const totalCount = studentList.length;

    const totalStudentsInModal = useMemo(() => {
        return studentList.reduce((acc: number, s: any) => acc + 1 + (Array.isArray(s.team_members) ? s.team_members.length : 0), 0);
    }, [studentList]);

    // Only initialize and fetch settings when the modal actually transitions from closed to open
    useEffect(() => {
        if (isOpen && !prevOpenRef.current) {
            fetchSettings();
            setMode('preview');
            setSuccess('');
            setError('');
            setPreviewIndex(0);
            setSendProgress(null);
            setShowStudentList(false);
        }
        prevOpenRef.current = isOpen;
    }, [isOpen]);

    const fetchSettings = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/settings');
            if (res.data) {
                if (res.data.emailTemplateSubject) setSubject(res.data.emailTemplateSubject);
                if (res.data.emailTemplateBody) setBody(res.data.emailTemplateBody);
            }
        } catch (err) {
            console.error('Error fetching email template:', err);
            setError('Failed to load email template from settings.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveTemplate = async () => {
        setIsSaving(true);
        setError('');
        try {
            await api.put('/settings', {
                emailTemplateSubject: subject,
                emailTemplateBody: body
            });
            setSuccess('Template saved successfully!');
            setTimeout(() => setMode('preview'), 1500);
        } catch (err) {
            console.error('Error saving template:', err);
            setError('Failed to save email template.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSendMail = async () => {
        setIsSending(true);
        cancelSendRef.current = false;
        setError('');
        setSuccess('');

        if (isBulk) {
            const targetIds = studentList.map(s => s._id);
            const total = targetIds.length;
            const startTime = Date.now();

            // Initial estimate: ~0.4s per student with connection pooling
            const initialEta = Math.max(3, Math.ceil(total * 0.4));
            setSendProgress({ current: 0, total, etaSeconds: initialEta });

            const BATCH_SIZE = 5;
            const allSentIds: string[] = [];
            const allFailedIds: string[] = [];

            try {
                for (let i = 0; i < total; i += BATCH_SIZE) {
                    if (cancelSendRef.current) break;

                    const chunkIds = targetIds.slice(i, i + BATCH_SIZE);
                    try {
                        const res = await api.post(`${apiPath}/bulk-send-mail`, { studentIds: chunkIds });
                        const sent = res.data?.sentIds || chunkIds;
                        allSentIds.push(...sent);
                        if (res.data?.failedIds) {
                            allFailedIds.push(...res.data.failedIds);
                        }
                    } catch (batchErr: any) {
                        console.error(`Bulk batch failed for chunk:`, batchErr);
                        allFailedIds.push(...chunkIds);
                    }

                    const completedSoFar = Math.min(i + chunkIds.length, total);
                    const elapsedSec = (Date.now() - startTime) / 1000;
                    const rate = completedSoFar / (elapsedSec || 1);
                    const remainingItems = total - completedSoFar;
                    const etaSeconds = rate > 0 ? Math.ceil(remainingItems / rate) : 0;

                    setSendProgress({
                        current: completedSoFar,
                        total,
                        etaSeconds,
                        currentRate: Math.round(rate * 10) / 10
                    });
                }

                const elapsedFinal = Math.round((Date.now() - startTime) / 1000);
                if (cancelSendRef.current) {
                    setSuccess(`Bulk sending stopped. Delivered to ${allSentIds.length} of ${total} students.`);
                    if (onSuccess && allSentIds.length > 0) {
                        onSuccess(allSentIds);
                    }
                } else if (allSentIds.length > 0) {
                    setSuccess(`Delivered ${allSentIds.length} of ${total} emails successfully in ${elapsedFinal}s!${allFailedIds.length > 0 ? ` (${allFailedIds.length} failed)` : ''}`);
                    if (onSuccess) {
                        onSuccess(allSentIds);
                    }
                    setTimeout(() => {
                        onClose();
                    }, 2200);
                } else {
                    setError('Failed to deliver emails to the selected recipients.');
                }
            } catch (err: any) {
                console.error('Error during bulk sending:', err);
                setError(err.response?.data?.message || err.message || 'Failed to send bulk emails.');
            } finally {
                setIsSending(false);
                setSendProgress(null);
            }
        } else {
            // Single student sending
            if (!activeStudent?._id) return;
            try {
                const res = await api.post(`${apiPath}/${activeStudent._id}/send-mail`);
                setSuccess(res.data.message || 'Email sent successfully!');
                if (onSuccess && activeStudent?._id) {
                    onSuccess(activeStudent._id);
                }
                setTimeout(() => {
                    onClose();
                }, 1500);
            } catch (err: any) {
                console.error('Error sending email:', err);
                setError(err.response?.data?.message || 'Failed to send email.');
            } finally {
                setIsSending(false);
            }
        }
    };

    const generatePreviewData = (targetStudent: any) => {
        if (!targetStudent) return {};

        const isTeamMode = 
            targetStudent.participationMode?.toLowerCase() === 'team' || 
            targetStudent.participation_mode?.toLowerCase() === 'team' || 
            Boolean(targetStudent.team_name) || 
            Boolean(targetStudent.team_id) ||
            (Array.isArray(targetStudent.team_members) && targetStudent.team_members.length > 0) ||
            (targetStudent.participant_id && String(targetStudent.participant_id).toUpperCase().includes('TEAM'));
        const teamSize = isTeamMode ? (1 + (targetStudent.team_members?.length || 0)) : 1;
        const perHead = 399;
        const storedAmount = isTeamMode
            ? teamSize * perHead
            : (targetStudent.payment && targetStudent.payment.amount && targetStudent.payment.amount > 0 ? targetStudent.payment.amount : perHead);
        const txnId = targetStudent.payment?.transaction_id || null;

        let memberName = targetStudent.name || targetStudent.fullName || (targetStudent.leader && targetStudent.leader.name) || '';
        let memberEmail = targetStudent.email || (targetStudent.leader && targetStudent.leader.email) || '';
        if (isTeamMode && targetStudent.leader) {
            memberName = targetStudent.leader.name;
            memberEmail = targetStudent.leader.email;
        }

        let teamMembersDetails = '';
        if (isTeamMode) {
            const leaderPhone = targetStudent.leader?.phone || targetStudent.mobile || targetStudent.phone || 'N/A';
            teamMembersDetails += `<b>Leader:</b> ${targetStudent.leader?.name || targetStudent.name || targetStudent.fullName || 'N/A'} (${targetStudent.leader?.email || targetStudent.email || 'N/A'} - Ph: ${leaderPhone})<br/>`;
            if (targetStudent.team_members && targetStudent.team_members.length > 0) {
                targetStudent.team_members.forEach((m: any, idx: number) => {
                    const memberPhone = m.phone || m.mobile || 'N/A';
                    teamMembersDetails += `<b>Member ${idx + 1}:</b> ${m.name || 'N/A'} (${m.email || 'N/A'} - Ph: ${memberPhone})<br/>`;
                });
            }
        } else {
            teamMembersDetails = 'N/A (Individual)';
        }

        const normalizeStatus = (s: string | undefined): string => {
            if (!s) return 'Success';
            const lower = s.toLowerCase();
            if (['failed', 'failure', 'declined', 'cancelled', 'canceled', 'rejected'].includes(lower)) return 'Failed';
            return 'Success';
        };
        const payStatus = normalizeStatus(targetStudent.payment?.status || targetStudent.payment_status || targetStudent.status);

        return {
            // Identity
            name: memberName,
            participant_name: memberName,
            student_id: targetStudent.participant_id || targetStudent.team_id || 'N/A',
            year: targetStudent.currentYear || 'N/A',
            // Contact
            email: memberEmail,
            mobile: targetStudent.mobile || targetStudent.leader?.phone || 'N/A',
            college: targetStudent.leader?.college || targetStudent.college || 'N/A',
            // Registration
            participation_mode: isTeamMode ? 'Team' : 'Individual',
            team_participation_mode: isTeamMode ? 'Team Leader' : 'Individual',
            team_name: targetStudent.team_name || (isTeamMode ? 'N/A' : '—'),
            team_id: targetStudent.team_id || (isTeamMode ? 'N/A' : '—'),
            team_size: isTeamMode ? `${teamSize} members` : 'Individual',
            team_members_details: teamMembersDetails,
            // Payment
            utr_upi_id: txnId || 'N/A',
            transaction_id: txnId || 'N/A',
            amount: `INR ${storedAmount}.00`,
            payment_status: payStatus,
            date_processed: targetStudent.payment?.timestamp ? new Date(targetStudent.payment.timestamp).toLocaleString('en-IN') : new Date().toLocaleString('en-IN'),
            receipt_url: '#'
        };
    };

    const processTemplate = (template: string, data: any) => {
        if (!template) return '';
        return template.replace(/{{(.*?)}}/g, (match, key) => {
            return data[key.trim()] || `[${key.trim()}]`;
        });
    };

    const previewData = generatePreviewData(activeStudent);
    const previewSubject = processTemplate(subject, previewData);
    const previewBody = processTemplate(body, previewData);

    const isTeam = Boolean(
        activeStudent?.participationMode?.toLowerCase() === 'team' ||
        activeStudent?.participation_mode?.toLowerCase() === 'team' ||
        Boolean(activeStudent?.team_name) ||
        Boolean(activeStudent?.team_id) ||
        (Array.isArray(activeStudent?.team_members) && activeStudent.team_members.length > 0)
    );

    const teamRecipientsList = useMemo(() => {
        if (!activeStudent) return [];
        const list: { name: string; email: string; role: string; isLeader: boolean }[] = [];
        const leaderEmail = activeStudent.leader?.email || activeStudent.email;
        const leaderName = activeStudent.leader?.name || activeStudent.fullName || activeStudent.name || 'Team Leader';
        if (leaderEmail) {
            list.push({ name: leaderName, email: leaderEmail, role: 'Team Leader', isLeader: true });
        }
        const members = Array.isArray(activeStudent.team_members)
            ? activeStudent.team_members
            : (Array.isArray(activeStudent.members) ? activeStudent.members : []);
        members.forEach((m: any, idx: number) => {
            const mEmail = m?.email || m?.mail || m?.studentEmail || m?.Email || m?.gmail;
            const mName = m?.name || m?.fullName || m?.studentName || `Member ${idx + 1}`;
            if (mEmail && !list.some(r => r.email.toLowerCase() === mEmail.toLowerCase())) {
                list.push({ name: mName, email: mEmail, role: `Member ${idx + 1}`, isLeader: false });
            }
        });
        return list;
    }, [activeStudent]);

    const totalRecipients = isTeam ? Math.max(1, teamRecipientsList.length) : 1;

    if (!isOpen || !mounted) return null;

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    {isBulk ? (
                                        <>
                                            <span className="p-2 bg-[#007aff]/10 text-[#007aff] rounded-xl inline-flex">
                                                <Mail size={20} />
                                            </span>
                                            {mode === 'preview' ? `Bulk Email Preview (${totalStudentsInModal} Students • ${totalCount} Registrations)` : 'Edit Email Template'}
                                        </>
                                    ) : (
                                        mode === 'preview' ? 'Email Preview' : 'Edit Email Template'
                                    )}
                                </h2>
                                {!isBulk && activeStudent?.mail_sent && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
                                        <Check size={14} className="text-emerald-600 stroke-[2.5]" />
                                        Mail Already Sent {activeStudent.mail_sent_at ? `(${new Date(activeStudent.mail_sent_at).toLocaleDateString('en-IN')})` : ''}
                                    </span>
                                )}
                                {isBulk && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-[#007aff] border border-blue-200 rounded-full text-xs font-bold">
                                        {totalStudentsInModal} Students ({totalCount} Registrations)
                                    </span>
                                )}
                            </div>

                            {mode === 'preview' && (
                                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                    {isBulk ? (
                                        <>
                                            <p className="text-sm text-gray-600">
                                                Sample preview for student <strong>{previewIndex + 1} of {totalCount}</strong> ({activeStudent?.name || activeStudent?.fullName || 'Student'})
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => setShowStudentList(!showStudentList)}
                                                className="text-xs font-semibold text-[#007aff] hover:underline flex items-center gap-1"
                                            >
                                                <List size={14} />
                                                {showStudentList ? 'Hide List' : 'View All Selected'}
                                            </button>
                                        </>
                                    ) : (
                                        <p className="text-sm text-gray-500 flex items-center gap-2">
                                            {isTeam ? (
                                                <><Users size={16} className="text-blue-500" /> Will be sent to {totalRecipients} team members</>
                                            ) : (
                                                <>Will be sent to {previewData.email}</>
                                            )}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {isBulk && mode === 'preview' && totalCount > 1 && (
                                <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-2 py-1 shadow-sm mr-2">
                                    <button
                                        type="button"
                                        disabled={previewIndex === 0}
                                        onClick={() => setPreviewIndex(p => Math.max(0, p - 1))}
                                        className="p-1 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent"
                                        title="Previous Student"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className="text-xs font-semibold px-1 text-gray-600">
                                        {previewIndex + 1} / {totalCount}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={previewIndex >= totalCount - 1}
                                        onClick={() => setPreviewIndex(p => Math.min(totalCount - 1, p + 1))}
                                        className="p-1 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent"
                                        title="Next Student"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            )}
                            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                    </div>

                    {/* Bulk Selected Students Quick Drawer */}
                    {isBulk && showStudentList && (
                        <div className="bg-blue-50/70 border-b border-blue-100 p-4 max-h-40 overflow-y-auto">
                            <p className="text-xs font-bold uppercase tracking-wider text-blue-900 mb-2">
                                Selected Recipients ({totalCount})
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {studentList.map((s, idx) => (
                                    <button
                                        key={s._id || idx}
                                        type="button"
                                        onClick={() => setPreviewIndex(idx)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${previewIndex === idx
                                            ? 'bg-[#007aff] text-white shadow-sm'
                                            : 'bg-white text-gray-700 hover:bg-blue-100 border border-blue-200'
                                            }`}
                                    >
                                        <span className="truncate max-w-[150px]">{s.name || s.fullName || s.student_id}</span>
                                        {s.mail_sent && <Check size={12} className="text-emerald-500" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Body */}
                    <div className="p-6 overflow-y-auto flex-1 bg-gray-50/30">
                        {error && (
                            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 border border-red-100">
                                <AlertCircle size={20} />
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-xl flex items-center gap-3 border border-green-100">
                                <Check size={20} className="text-green-600" />
                                {success}
                            </div>
                        )}

                        {isSending && sendProgress && (
                            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 via-indigo-50/60 to-blue-50 border border-blue-200/90 rounded-2xl shadow-sm">
                                <div className="flex justify-between items-center mb-2.5">
                                    <div className="flex items-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
                                        <span className="text-sm font-bold text-blue-950">
                                            Sending Emails to Students...
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {sendProgress.etaSeconds !== undefined && sendProgress.etaSeconds > 0 && (
                                            <span className="text-[11px] font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full flex items-center gap-1">
                                                <Clock size={11} />
                                                ~{sendProgress.etaSeconds}s left
                                            </span>
                                        )}
                                        <span className="text-xs font-extrabold text-blue-700 bg-white px-2.5 py-0.5 rounded-full border border-blue-200 shadow-2xs">
                                            {sendProgress.current} / {sendProgress.total} ({Math.round((sendProgress.current / sendProgress.total) * 100)}%)
                                        </span>
                                    </div>
                                </div>
                                <div className="w-full bg-blue-200/80 rounded-full h-3 overflow-hidden p-0.5">
                                    <div
                                        className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 h-2 rounded-full transition-all duration-300 ease-out shadow-xs"
                                        style={{ width: `${Math.max(2, (sendProgress.current / sendProgress.total) * 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between items-center mt-2 text-[11px] text-blue-700/80 font-medium">
                                    <span className="flex items-center gap-1">
                                        <Zap size={11} className="text-amber-500" />
                                        Parallel delivery (5 pooled SMTP connections)
                                    </span>
                                    {sendProgress.currentRate ? (
                                        <span className="font-semibold text-blue-900">
                                            {sendProgress.currentRate} emails/sec
                                        </span>
                                    ) : (
                                        <span className="animate-pulse">Connecting to mail server...</span>
                                    )}
                                </div>
                            </div>
                        )}

                        {isLoading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        ) : mode === 'preview' ? (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="p-4 border-b border-gray-100 bg-gray-50">
                                    <div className="flex gap-4 items-start">
                                        <span className="text-gray-500 font-medium w-16 pt-1">To:</span>
                                        <div className="flex-1">
                                            {isTeam && teamRecipientsList.length > 0 ? (
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-xs font-bold px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-md">
                                                            All {teamRecipientsList.length} Team Recipients
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            (Personalized email &amp; official PDF receipt sent to each member)
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                                        {teamRecipientsList.map((rec, rIdx) => (
                                                            <span
                                                                key={rIdx}
                                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                                                                    rec.isLeader
                                                                        ? 'bg-blue-50 text-blue-900 border-blue-200'
                                                                        : 'bg-purple-50 text-purple-900 border-purple-200'
                                                                }`}
                                                            >
                                                                <span className="font-bold text-[10px] uppercase opacity-80">{rec.role}:</span>
                                                                <span className="font-semibold">{rec.name}</span>
                                                                <span className="text-gray-500 font-mono text-[11px]">&lt;{rec.email}&gt;</span>
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-gray-900 font-medium">
                                                    {previewData.email}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-4 items-center mt-2">
                                        <span className="text-gray-500 font-medium w-16">Subject:</span>
                                        <span className="text-gray-900 font-medium">{previewSubject}</span>
                                    </div>
                                </div>
                                <div className="p-6 prose max-w-none text-gray-800" dangerouslySetInnerHTML={{ __html: previewBody }} />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Subject Template</label>
                                    <input
                                        type="text"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex justify-between items-end">
                                        <span>Body Template</span>
                                        <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                            Available: {'{{name}}'}, {'{{email}}'}, {'{{student_id}}'}, {'{{college}}'}, {'{{payment_status}}'}, {'{{team_name}}'}, {'{{team_id}}'}, {'{{transaction_id}}'}, {'{{amount}}'}, {'{{date_processed}}'}, {'{{team_participation_mode}}'}, {'{{team_members_details}}'}
                                        </span>
                                    </label>
                                    <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
                                        <textarea
                                            value={body}
                                            onChange={(e) => setBody(e.target.value)}
                                            rows={14}
                                            spellCheck={false}
                                            className="w-full p-4 text-xs font-mono text-gray-700 bg-white border-0 outline-none resize-y leading-relaxed"
                                            placeholder="Enter HTML for your email body. Use {{name}}, {{student_id}}, etc. as placeholders."
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-gray-100 bg-white flex justify-between items-center gap-3">
                        <div>
                            {isBulk && (
                                <p className="text-xs font-medium text-gray-500">
                                    Each recipient receives personalized details & official PDF receipt attachment.
                                </p>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            {mode === 'preview' ? (
                                <>
                                    {isSending && isBulk && (
                                        <button
                                            type="button"
                                            onClick={() => { cancelSendRef.current = true; }}
                                            className="px-5 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
                                        >
                                            Stop Sending
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setMode('edit')}
                                        disabled={isSending}
                                        className="px-6 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-semibold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                    >
                                        <Edit3 size={18} />
                                        Edit Template
                                    </button>
                                    <button
                                        onClick={handleSendMail}
                                        disabled={isSending || totalCount === 0}
                                        className={`px-6 py-2.5 ${isBulk
                                            ? 'bg-[#007aff] hover:bg-[#0062cc]'
                                            : (activeStudent?.mail_sent ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#007aff] hover:bg-blue-600')
                                            } text-white rounded-xl font-semibold transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-md hover:shadow-lg active:scale-95`}
                                    >
                                        {isSending ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                                        ) : isBulk ? (
                                            <Send size={18} />
                                        ) : activeStudent?.mail_sent ? (
                                            <Check size={18} />
                                        ) : (
                                            <Send size={18} />
                                        )}
                                        {isSending
                                            ? (isBulk ? 'Sending Bulk Emails...' : 'Sending...')
                                            : isBulk
                                                ? `Send Mail to All ${totalCount} Selected Students`
                                                : (activeStudent?.mail_sent ? 'Resend Mail' : 'Send Mail')
                                        }
                                    </button>
                                    {!isBulk && activeStudent?._id && (
                                        <a
                                            href={`/api/${isTeam ? 'students' : 'individual-students'}/${activeStudent?._id}/receipt-pdf`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-6 py-2.5 bg-green-600 text-white hover:bg-green-700 rounded-xl font-semibold transition-all flex items-center gap-2 cursor-pointer"
                                            style={{ textDecoration: 'none' }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                            Download PDF
                                        </a>
                                    )}
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => {
                                            setMode('preview');
                                            fetchSettings();
                                        }}
                                        className="px-6 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-semibold transition-all cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveTemplate}
                                        disabled={isSaving}
                                        className="px-6 py-2.5 bg-green-500 text-white hover:bg-green-600 rounded-xl font-semibold transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                                    >
                                        {isSaving ? 'Saving...' : 'Save & Preview'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
}
