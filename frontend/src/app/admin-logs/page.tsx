"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { 
    ScrollText, Search, RefreshCcw, Calendar, Activity, AlertCircle, 
    Trash2, ShieldCheck, KeyRound, RotateCcw, Users, Clock, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { socket } from '@/lib/socket';

interface LogEntry {
    _id?: string;
    action: string;
    details: any;
    ipAddress: string;
    createdAt: string;
}

interface AdminLog {
    _id: string;
    adminId: string;
    adminEmail: string;
    logs: LogEntry[];
    createdAt: string;
    updatedAt: string;
}

interface AdminUser {
    _id: string;
    email: string;
    role: string;
    isTotpEnabled: boolean;
    createdAt?: string;
    updatedAt?: string;
}

const getAvatarColor = (email: string) => {
    if (!email) return 'from-gray-500 to-gray-600';
    const colors = [
        'from-indigo-500 to-purple-600',
        'from-emerald-500 to-teal-600',
        'from-rose-500 to-red-600',
        'from-amber-500 to-orange-600',
        'from-blue-500 to-cyan-600',
        'from-fuchsia-500 to-pink-600'
    ];
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
        hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

export default function AdminLogsPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'logs' | 'security'>('logs');

    // Logs state
    const [adminDocs, setAdminDocs] = useState<AdminLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'deletions'>('all');
    const [unauthorized, setUnauthorized] = useState(false);
    const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

    // 2FA Admin Management state
    const [adminsList, setAdminsList] = useState<AdminUser[]>([]);
    const [loadingAdmins, setLoadingAdmins] = useState(false);
    const [resettingEmail, setResettingEmail] = useState<string | null>(null);
    const [securityMsg, setSecurityMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const toggleDate = (adminId: string, date: string) => {
        const key = `${adminId}-${date}`;
        setExpandedDates(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin-logs');
            if (response.data.success) {
                const docs = response.data.data;
                setAdminDocs(docs);
                
                // Initialize all dates as expanded by default
                const initialExpanded: Record<string, boolean> = {};
                docs.forEach((doc: AdminLog) => {
                    const dates = new Set<string>();
                    doc.logs?.forEach(log => {
                        const dateKey = new Date(log.createdAt).toLocaleDateString(undefined, {
                            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                        });
                        dates.add(dateKey);
                    });
                    dates.forEach(date => {
                        initialExpanded[`${doc._id}-${date}`] = true;
                    });
                });
                setExpandedDates(initialExpanded);
            }
        } catch (error: any) {
            console.error('Error fetching admin logs:', error);
            if (error.response?.status === 403 || error.response?.status === 401) {
                setUnauthorized(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchAdmins = async () => {
        setLoadingAdmins(true);
        try {
            const res = await api.get('/auth/admins');
            if (Array.isArray(res.data)) {
                setAdminsList(res.data);
            }
        } catch (err: any) {
            console.error('Error fetching admins list:', err);
            if (err.response?.status === 403 || err.response?.status === 401) {
                setUnauthorized(true);
            }
        } finally {
            setLoadingAdmins(false);
        }
    };

    const handleReset2FA = async (targetEmail: string) => {
        const confirmed = window.confirm(
            `Are you sure you want to reset 2FA for ${targetEmail}?\n\nThe user will be required to scan a new QR code in their Authenticator app upon their next login.`
        );
        if (!confirmed) return;

        setResettingEmail(targetEmail);
        setSecurityMsg(null);
        try {
            const res = await api.post('/auth/admin/reset-2fa', { targetEmail });
            setSecurityMsg({ 
                text: res.data.message || `2FA successfully reset for ${targetEmail}.`, 
                type: 'success' 
            });
            await fetchAdmins();
        } catch (err: any) {
            setSecurityMsg({ 
                text: err.response?.data?.message || 'Failed to reset 2FA.', 
                type: 'error' 
            });
        } finally {
            setResettingEmail(null);
        }
    };

    useEffect(() => {
        fetchLogs();
        fetchAdmins();

        const handleLiveLog = () => {
            fetchLogs();
        };

        socket.on('adminLogAdded', handleLiveLog);
        socket.on('individualRegistrationUpdated', handleLiveLog);
        socket.on('registrationUpdated', handleLiveLog);

        return () => {
            socket.off('adminLogAdded', handleLiveLog);
            socket.off('individualRegistrationUpdated', handleLiveLog);
            socket.off('registrationUpdated', handleLiveLog);
        };
    }, []);

    const filteredDocs = adminDocs.map(doc => {
        let matchingLogs = doc.logs || [];
        if (filterType === 'deletions') {
            matchingLogs = matchingLogs.filter(log => (log.action || '').toUpperCase().includes('DELETE'));
        }
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            matchingLogs = matchingLogs.filter(log =>
                doc.adminEmail.toLowerCase().includes(q) ||
                (log.action || '').toLowerCase().includes(q) ||
                (log.ipAddress && log.ipAddress.includes(q)) ||
                (log.details && JSON.stringify(log.details).toLowerCase().includes(q))
            );
        }
        return {
            ...doc,
            logs: matchingLogs
        };
    }).filter(doc => (doc.logs && doc.logs.length > 0) || (!searchTerm && filterType === 'all'));

    const totalEvents = filteredDocs.reduce((acc, doc) => acc + (doc.logs?.length || 0), 0);

    if (unauthorized) {
        return (
            <div className="p-8 h-full flex flex-col items-center justify-center">
                <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
                <p className="text-gray-500">You do not have Super Admin privileges to view this page.</p>
                <button 
                    onClick={() => router.push('/')}
                    className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold"
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    const totalAdmins = adminsList.length;
    const totpActiveCount = adminsList.filter(a => a.isTotpEnabled).length;
    const totpPendingCount = totalAdmins - totpActiveCount;

    return (
        <div className="p-8 pb-24">
            {/* Page Header */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
                <div>
                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
                        {activeTab === 'logs' ? 'Admin Logs' : 'Admin 2FA Security'}
                    </h1>
                    <p className="text-gray-500 font-medium">
                        {activeTab === 'logs' 
                            ? 'Monitor administrative actions, audit trails & student deletions grouped by account'
                            : 'Super Admin control panel: manage admin accounts and reset Authenticator (TOTP) 2FA'}
                    </p>
                </div>
                <button 
                    onClick={activeTab === 'logs' ? fetchLogs : fetchAdmins}
                    className="group flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all shadow-sm hover:shadow-md active:scale-95 cursor-pointer"
                >
                    <RefreshCcw className={`w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors ${(loading || loadingAdmins) ? 'animate-spin' : ''}`} />
                    <span className="text-sm font-semibold text-gray-700">Refresh</span>
                </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-3 mb-8">
                <button
                    type="button"
                    onClick={() => setActiveTab('logs')}
                    className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
                        activeTab === 'logs'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                    }`}
                >
                    <ScrollText className="w-4 h-4" />
                    Activity Logs ({totalEvents})
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setActiveTab('security');
                        fetchAdmins();
                    }}
                    className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
                        activeTab === 'security'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                    }`}
                >
                    <ShieldCheck className="w-4 h-4" />
                    Admin Accounts & 2FA Management ({totalAdmins})
                </button>
            </div>

            {/* ════════════════ TAB 1: 2FA SECURITY & ADMIN MANAGEMENT ════════════════ */}
            {activeTab === 'security' && (
                <div className="flex flex-col gap-6">
                    {/* Status Message */}
                    {securityMsg && (
                        <div className={`p-4 rounded-2xl border text-sm font-semibold flex items-center justify-between ${
                            securityMsg.type === 'success' 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                                : 'bg-red-50 border-red-200 text-red-800'
                        }`}>
                            <span>{securityMsg.text}</span>
                            <button 
                                onClick={() => setSecurityMsg(null)}
                                className="text-xs underline cursor-pointer ml-4 font-bold"
                            >
                                Dismiss
                            </button>
                        </div>
                    )}

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Admins</div>
                                <div className="text-2xl font-black text-gray-900 mt-0.5">{totalAdmins}</div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">2FA Active (App)</div>
                                <div className="text-2xl font-black text-emerald-600 mt-0.5">{totpActiveCount}</div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                <Clock className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Setup Pending / Reset</div>
                                <div className="text-2xl font-black text-amber-600 mt-0.5">{totpPendingCount}</div>
                            </div>
                        </div>
                    </div>

                    {/* Information Note */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100/80 rounded-3xl p-6">
                        <div className="flex items-start gap-4">
                            <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-md shadow-blue-500/20">
                                <KeyRound className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-extrabold text-blue-950 mb-1">Super Admin 2FA Reset Authority</h3>
                                <p className="text-xs text-blue-900/80 leading-relaxed font-medium">
                                    If a junior admin loses their mobile device, uninstalls Google Authenticator, or switches phones, click <strong>Reset 2FA</strong> for that account below. Upon their next login with email & password, they will immediately be presented with a new QR code to scan and re-enroll.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Admins Table */}
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
                        <div className="p-6 border-b border-gray-50 bg-gray-50/30">
                            <h2 className="text-base font-extrabold text-gray-900">Registered Admin Accounts</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Admin Account</th>
                                        <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Access Role</th>
                                        <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">2FA Status</th>
                                        <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loadingAdmins ? (
                                        Array.from({ length: 3 }).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td className="px-8 py-6"><div className="h-8 bg-gray-100 rounded-lg w-48"></div></td>
                                                <td className="px-8 py-6"><div className="h-6 bg-gray-100 rounded-lg w-24"></div></td>
                                                <td className="px-8 py-6"><div className="h-6 bg-gray-100 rounded-lg w-32"></div></td>
                                                <td className="px-8 py-6 text-right"><div className="h-8 bg-gray-100 rounded-lg w-24 ml-auto"></div></td>
                                            </tr>
                                        ))
                                    ) : adminsList.length > 0 ? (
                                        adminsList.map((adm) => {
                                            const isSuper = ['yashwanthkumar87657@gmail.com', 'dhanushsunny00@gmail.com'].includes(adm.email.toLowerCase()) || adm.role === 'superadmin';
                                            const isResetting = resettingEmail === adm.email;

                                            return (
                                                <tr key={adm._id} className="hover:bg-blue-50/10 transition-colors">
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-3.5">
                                                            <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${getAvatarColor(adm.email)} text-white flex items-center justify-center text-sm font-black shadow-md`}>
                                                                {adm.email.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="font-extrabold text-gray-900 text-sm">{adm.email}</div>
                                                                <div className="text-[11px] text-gray-400 font-medium">Added {adm.createdAt ? new Date(adm.createdAt).toLocaleDateString() : 'N/A'}</div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-8 py-6">
                                                        {isSuper ? (
                                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                                                                Super Admin
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                                                                Junior Admin
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="px-8 py-6">
                                                        {adm.isTotpEnabled ? (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                                                Enrolled (TOTP)
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                                                Setup Pending / QR
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="px-8 py-6 text-right">
                                                        {isSuper ? (
                                                            <span className="text-xs font-bold text-gray-400 italic">
                                                                Primary Account
                                                            </span>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                disabled={isResetting}
                                                                onClick={() => handleReset2FA(adm.email)}
                                                                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-sm ${
                                                                    isResetting 
                                                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                        : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white hover:shadow-md active:scale-95'
                                                                }`}
                                                            >
                                                                <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                                                                {isResetting ? 'Resetting...' : 'Reset 2FA'}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-12 text-center text-gray-400 font-medium">
                                                No admin accounts found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════ TAB 2: ACTIVITY TIMELINE & LOGS ════════════════ */}
            {activeTab === 'logs' && (
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
                    <div className="p-8 border-b border-gray-50 flex flex-wrap items-center justify-between gap-6 bg-gray-50/30">
                        <div className="relative flex-1 min-w-[280px] max-w-xl">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search logs by email, student, action, or IP address..."
                                className="w-full pl-12 pr-6 py-3.5 bg-white border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all outline-none text-gray-700 placeholder:text-gray-400 font-medium shadow-inner"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Quick filter tabs */}
                            <div className="flex bg-[#f5f5f7] p-1 rounded-2xl border border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setFilterType('all')}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        filterType === 'all'
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-900'
                                    }`}
                                >
                                    All Actions
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFilterType('deletions')}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                        filterType === 'deletions'
                                            ? 'bg-red-600 text-white shadow-sm'
                                            : 'text-red-600 hover:bg-red-50'
                                    }`}
                                >
                                    <Trash2 size={13} />
                                    Deletions Only (Who Deleted)
                                </button>
                            </div>

                            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-sm font-bold text-gray-600">
                                    {totalEvents} Events Logged
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest w-1/3">Admin Identity</th>
                                    <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest w-2/3">Activity Timeline</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-8 py-8 align-top"><div className="h-10 bg-gray-100 rounded-lg w-48"></div></td>
                                            <td className="px-8 py-8 align-top"><div className="h-32 bg-gray-100 rounded-lg w-full"></div></td>
                                        </tr>
                                    ))
                                ) : filteredDocs.length > 0 ? (
                                    filteredDocs.map((adminDoc) => {
                                        // Group logs by date
                                        const groupedLogs: Record<string, LogEntry[]> = {};
                                        adminDoc.logs?.forEach(log => {
                                            const dateKey = new Date(log.createdAt).toLocaleDateString(undefined, {
                                                weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                                            });
                                            if (!groupedLogs[dateKey]) groupedLogs[dateKey] = [];
                                            groupedLogs[dateKey].push(log);
                                        });

                                        return (
                                            <tr key={adminDoc._id} className="hover:bg-blue-50/10 transition-colors duration-300">
                                                <td className="px-8 py-8 align-top border-r border-gray-50/50">
                                                    <div className="flex items-start gap-4">
                                                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${getAvatarColor(adminDoc.adminEmail)} text-white flex items-center justify-center text-lg font-black shadow-lg shadow-indigo-500/20`}>
                                                            {adminDoc.adminEmail.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="pt-1">
                                                            <div className="font-extrabold text-gray-900 text-[15px] leading-tight mb-1 break-all pr-4">{adminDoc.adminEmail}</div>
                                                            {['yashwanthkumar87657@gmail.com', 'dhanushsunny00@gmail.com'].includes(adminDoc.adminEmail) ? (
                                                                <div className="text-[10px] font-black uppercase text-indigo-500 tracking-widest">Super Admin</div>
                                                            ) : (
                                                                <div className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Admin</div>
                                                            )}
                                                            <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-gray-400">
                                                                <Activity className="w-3.5 h-3.5" />
                                                                {adminDoc.logs?.length || 0} Total Actions
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-8 align-top">
                                                    {Object.keys(groupedLogs).length > 0 ? (
                                                        <div className="flex flex-col gap-8 max-h-[500px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                                                            {Object.entries(groupedLogs).map(([date, logsForDate]) => {
                                                                const isExpanded = expandedDates[`${adminDoc._id}-${date}`] ?? true;
                                                                return (
                                                                    <div key={date}>
                                                                        <div 
                                                                            className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 py-2 mb-4 flex items-center gap-2 cursor-pointer group"
                                                                            onClick={() => toggleDate(adminDoc._id, date)}
                                                                        >
                                                                            <Calendar className="w-4 h-4 text-blue-500" />
                                                                            <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest group-hover:text-blue-600 transition-colors">{date}</h3>
                                                                            <div className="flex-1 h-px bg-gray-100 ml-4"></div>
                                                                            <div className="p-1 rounded-full bg-gray-50 group-hover:bg-blue-50 transition-colors">
                                                                                {isExpanded ? (
                                                                                    <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                                                                                ) : (
                                                                                    <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        {isExpanded && (
                                                                            <div className="flex flex-col gap-6 relative before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-gray-100 animate-in fade-in slide-in-from-top-4 duration-300">
                                                                                {logsForDate.map((log, idx) => (
                                                                                    <div key={idx} className="relative flex gap-6 group">
                                                                                        <div className="w-6 h-6 rounded-full bg-white border-4 border-gray-100 flex-shrink-0 z-10 group-hover:border-blue-200 transition-colors"></div>
                                                                                        <div className="flex-1 -mt-1 bg-gray-50/50 p-5 rounded-2xl border border-gray-100 group-hover:bg-white group-hover:shadow-lg group-hover:shadow-gray-200/40 transition-all duration-300">
                                                                                            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                                                                                                <div className="flex items-center gap-3">
                                                                                                    <span className={`text-[11px] font-black tracking-widest uppercase px-3 py-1 rounded-lg shadow-sm flex items-center gap-1.5 ${
                                                                                                        (log.action || '').toUpperCase().includes('DELETE')
                                                                                                            ? 'bg-red-600 text-white shadow-red-500/25 border border-red-500'
                                                                                                            : 'text-white bg-gray-800'
                                                                                                    }`}>
                                                                                                        {(log.action || '').toUpperCase().includes('DELETE') && <Trash2 size={12} />}
                                                                                                        {log.action}
                                                                                                    </span>
                                                                                                    <span className="text-xs font-bold text-gray-400">{new Date(log.createdAt).toLocaleTimeString()}</span>
                                                                                                </div>
                                                                                                {log.ipAddress && (
                                                                                                    <div className="text-[10px] font-bold text-gray-400 bg-white px-2 py-1 rounded-md border border-gray-100 shadow-sm">
                                                                                                        IP: {log.ipAddress}
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                            {log.details && (
                                                                                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm overflow-hidden mt-2">
                                                                                                    <ul className="text-xs text-gray-600 font-medium space-y-1.5 list-disc list-inside">
                                                                                                        {Object.entries(log.details).map(([key, value]) => {
                                                                                                            const displayValue = typeof value === 'object' && value !== null 
                                                                                                                ? JSON.stringify(value) 
                                                                                                                : String(value);
                                                                                                            return (
                                                                                                                <li key={key} className="break-all">
                                                                                                                    <span className="text-gray-400 font-bold capitalize mr-1">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                                                                                                    <span className="text-gray-800">{displayValue}</span>
                                                                                                                </li>
                                                                                                            );
                                                                                                        })}
                                                                                                    </ul>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm text-gray-400 font-medium italic py-4">No actions logged yet.</div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={2} className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-4 bg-gray-50/50 w-fit mx-auto p-12 rounded-[3rem] border border-gray-100 border-dashed">
                                                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-md">
                                                    <Activity className="w-8 h-8 text-gray-300" />
                                                </div>
                                                <div>
                                                    <p className="text-lg font-bold text-gray-900 mb-1">No Logs Found</p>
                                                    <p className="text-sm text-gray-400 font-medium">No activity matches your search criteria.</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
