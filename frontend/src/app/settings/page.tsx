"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { 
    Settings, ShieldCheck, KeyRound, RotateCcw, Search, RefreshCcw, 
    Users, Clock, CheckCircle2, AlertTriangle, ShieldAlert, X, Check, Mail, Lock
} from 'lucide-react';

interface AdminUser {
    _id: string;
    email: string;
    role: string;
    isTotpEnabled: boolean;
    last2FAResetAt?: string | null;
    last2FAResetBy?: string | null;
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

const SUPER_ADMIN_WHITELIST = ['yashwanthkumar87657@gmail.com', 'dhanushsunny00@gmail.com'];

export default function SettingsPage() {
    const router = useRouter();

    const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [unauthorized, setUnauthorized] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending'>('all');

    // Reset Modal state
    const [selectedAdminForReset, setSelectedAdminForReset] = useState<AdminUser | null>(null);
    const [resetting, setResetting] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Fetch Super Admin profile & verify authorization
    useEffect(() => {
        const verifyAndLoad = async () => {
            setLoading(true);
            try {
                const meRes = await api.get('/auth/me');
                const user = meRes.data?.user;
                const email = (user?.email || '').toLowerCase().trim();
                const role = (user?.role || '').toLowerCase().trim();

                setCurrentUserEmail(email);

                const isSuper = SUPER_ADMIN_WHITELIST.includes(email) || role === 'superadmin' || role === 'super_admin';
                if (!isSuper) {
                    setUnauthorized(true);
                    setLoading(false);
                    return;
                }

                // Authorized: Fetch admins list
                await fetchAdmins();
            } catch (err: any) {
                console.error('Settings initialization error:', err);
                if (err.response?.status === 401 || err.response?.status === 403) {
                    setUnauthorized(true);
                }
            } finally {
                setLoading(false);
            }
        };

        verifyAndLoad();
    }, []);

    const fetchAdmins = async () => {
        try {
            const res = await api.get('/auth/admins');
            if (Array.isArray(res.data)) {
                setAdmins(res.data);
            }
        } catch (err: any) {
            console.error('Error fetching admins list:', err);
        }
    };

    // Execute 2FA Reset
    const handleConfirmReset = async () => {
        if (!selectedAdminForReset) return;

        setResetting(true);
        setToast(null);

        const targetEmail = selectedAdminForReset.email;
        try {
            const res = await api.post('/auth/admin/reset-2fa', { targetEmail });
            setToast({
                type: 'success',
                message: res.data?.message || `MFA reset successfully for ${targetEmail}. On next login, they will be prompted to scan a new QR code.`
            });

            // Update local admin state immediately
            setAdmins(prev => prev.map(a => 
                a.email.toLowerCase() === targetEmail.toLowerCase() 
                    ? { 
                        ...a, 
                        isTotpEnabled: false, 
                        last2FAResetAt: new Date().toISOString(),
                        last2FAResetBy: currentUserEmail || 'yashwanthkumar87657@gmail.com'
                    }
                    : a
            ));

            setSelectedAdminForReset(null);
        } catch (err: any) {
            setToast({
                type: 'error',
                message: err.response?.data?.message || `Failed to reset 2FA for ${targetEmail}.`
            });
        } finally {
            setResetting(false);
        }
    };

    // Filter admins by search term and status
    const filteredAdmins = admins.filter(admin => {
        const matchesSearch = admin.email.toLowerCase().includes(searchTerm.toLowerCase().trim());
        if (!matchesSearch) return false;

        if (statusFilter === 'active') return admin.isTotpEnabled;
        if (statusFilter === 'pending') return !admin.isTotpEnabled;
        return true;
    });

    const totalCount = admins.length;
    const activeCount = admins.filter(a => a.isTotpEnabled).length;
    const pendingCount = totalCount - activeCount;

    if (unauthorized) {
        return (
            <div className="p-8 h-full flex flex-col items-center justify-center min-h-[70vh]">
                <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center text-red-500 mb-6 shadow-sm">
                    <ShieldAlert className="w-10 h-10" />
                </div>
                <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Super Admin Access Required</h1>
                <p className="text-gray-500 max-w-md text-center leading-relaxed">
                    This settings portal is restricted exclusively to the primary Super Admin (<strong>yashwanthkumar87657@gmail.com</strong>).
                </p>
                <button 
                    onClick={() => router.push('/')}
                    className="mt-8 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="p-8 pb-24 max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-md shadow-blue-500/20">
                            <Settings className="w-6 h-6" />
                        </div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Super Admin Settings</h1>
                    </div>
                    <p className="text-gray-500 text-sm font-medium">
                        Manage junior admin access, multi-factor authentication (MFA/2FA) keys, and account security
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200/80 rounded-2xl text-xs font-bold shadow-sm">
                        <Lock className="w-3.5 h-3.5" />
                        Super Admin: {currentUserEmail || 'yashwanthkumar87657@gmail.com'}
                    </div>
                    <button 
                        onClick={() => { setLoading(true); fetchAdmins().finally(() => setLoading(false)); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all shadow-sm hover:shadow-md active:scale-95 cursor-pointer text-sm font-semibold text-gray-700"
                    >
                        <RefreshCcw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin text-blue-500' : ''}`} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Toast Notification */}
            {toast && (
                <div className={`p-4 rounded-2xl border mb-6 text-sm font-semibold flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-200 ${
                    toast.type === 'success' 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                        : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                    <div className="flex items-center gap-2.5">
                        {toast.type === 'success' ? <Check className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
                        <span>{toast.message}</span>
                    </div>
                    <button 
                        onClick={() => setToast(null)}
                        className="text-xs font-bold underline cursor-pointer ml-4"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Admins</div>
                        <div className="text-2xl font-black text-gray-900 mt-0.5">{totalCount}</div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">2FA Active (App)</div>
                        <div className="text-2xl font-black text-emerald-600 mt-0.5">{activeCount}</div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Reset / Pending QR</div>
                        <div className="text-2xl font-black text-amber-600 mt-0.5">{pendingCount}</div>
                    </div>
                </div>
            </div>

            {/* Main Section: Junior Admin MFA Management */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden mb-8">
                {/* Section Header & Search Controls */}
                <div className="p-8 border-b border-gray-100 bg-gray-50/40">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                                <KeyRound className="w-5 h-5 text-blue-600" />
                                Junior Admin MFA / 2FA Reset Control
                            </h2>
                            <p className="text-xs text-gray-500 font-medium mt-1">
                                Reset multi-factor authentication for any junior admin based on their email. Resets immediately start the enrollment cycle afresh.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4">
                        {/* Search Bar */}
                        <div className="relative flex-1 min-w-[280px] max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search admin by email (e.g. nvsbabu2002@gmail.com)..."
                                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/40 transition-all outline-none text-sm text-gray-800 placeholder:text-gray-400 font-medium"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Filter Tabs */}
                        <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200 text-xs font-bold">
                            <button
                                type="button"
                                onClick={() => setStatusFilter('all')}
                                className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                                    statusFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                All ({totalCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('active')}
                                className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                                    statusFilter === 'active' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                Active ({activeCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('pending')}
                                className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                                    statusFilter === 'pending' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                Pending / Reset ({pendingCount})
                            </button>
                        </div>
                    </div>
                </div>

                {/* Admins Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/60 border-b border-gray-100">
                                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Admin Email & Account</th>
                                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Role</th>
                                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">2FA / MFA Status</th>
                                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Last 2FA Reset</th>
                                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Reset Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-8 py-6"><div className="h-8 bg-gray-100 rounded-lg w-52"></div></td>
                                        <td className="px-8 py-6"><div className="h-6 bg-gray-100 rounded-lg w-24"></div></td>
                                        <td className="px-8 py-6"><div className="h-6 bg-gray-100 rounded-lg w-32"></div></td>
                                        <td className="px-8 py-6"><div className="h-6 bg-gray-100 rounded-lg w-36"></div></td>
                                        <td className="px-8 py-6 text-right"><div className="h-8 bg-gray-100 rounded-lg w-24 ml-auto"></div></td>
                                    </tr>
                                ))
                            ) : filteredAdmins.length > 0 ? (
                                filteredAdmins.map((adm) => {
                                    const isSuper = SUPER_ADMIN_WHITELIST.includes(adm.email.toLowerCase()) || adm.role === 'superadmin';

                                    return (
                                        <tr key={adm._id} className="hover:bg-blue-50/15 transition-colors">
                                            {/* Admin Email */}
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3.5">
                                                    <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${getAvatarColor(adm.email)} text-white flex items-center justify-center text-sm font-black shadow-md flex-shrink-0`}>
                                                        {adm.email.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-extrabold text-gray-900 text-sm">{adm.email}</div>
                                                        <div className="text-[11px] text-gray-400 font-medium">
                                                            Registered {adm.createdAt ? new Date(adm.createdAt).toLocaleDateString() : 'N/A'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Role */}
                                            <td className="px-8 py-5">
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

                                            {/* MFA Status */}
                                            <td className="px-8 py-5">
                                                {adm.isTotpEnabled ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                                                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                                        Active (Enrolled)
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
                                                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                                                        Pending New QR
                                                    </span>
                                                )}
                                            </td>

                                            {/* Last Reset Timestamp */}
                                            <td className="px-8 py-5">
                                                {adm.last2FAResetAt ? (
                                                    <div className="text-xs text-gray-600">
                                                        <div className="font-bold">{new Date(adm.last2FAResetAt).toLocaleDateString()} at {new Date(adm.last2FAResetAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                        <div className="text-[10px] text-gray-400 truncate max-w-[150px]">By {adm.last2FAResetBy || 'Super Admin'}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 font-medium italic">Never reset</span>
                                                )}
                                            </td>

                                            {/* Reset Action Button */}
                                            <td className="px-8 py-5 text-right">
                                                {isSuper ? (
                                                    <span className="text-xs font-bold text-gray-400 italic">
                                                        Primary Account
                                                    </span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedAdminForReset(adm)}
                                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white hover:shadow-md active:scale-95 shadow-sm"
                                                    >
                                                        <RotateCcw className="w-3.5 h-3.5" />
                                                        Reset MFA
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-8 py-14 text-center text-gray-400 font-medium">
                                        No admins match the search criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Educational Info Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-3xl p-7 shadow-sm">
                <h3 className="text-base font-extrabold text-blue-950 mb-3 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                    How the 2FA Reset & Re-Registration Cycle Works
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4 text-xs font-medium text-blue-900/80">
                    <div className="bg-white/80 p-4 rounded-2xl border border-blue-100/60 shadow-sm">
                        <div className="font-extrabold text-blue-900 text-sm mb-1">Step 1: Super Admin Resets</div>
                        <p className="leading-relaxed">
                            Clicking <strong>Reset MFA</strong> above immediately deletes the previous Authenticator secret key from the database.
                        </p>
                    </div>
                    <div className="bg-white/80 p-4 rounded-2xl border border-blue-100/60 shadow-sm">
                        <div className="font-extrabold text-blue-900 text-sm mb-1">Step 2: Junior Admin Logs In</div>
                        <p className="leading-relaxed">
                            The junior admin enters their normal email & password at the login screen. The system detects their 2FA requires fresh setup.
                        </p>
                    </div>
                    <div className="bg-white/80 p-4 rounded-2xl border border-blue-100/60 shadow-sm">
                        <div className="font-extrabold text-blue-900 text-sm mb-1">Step 3: New QR Code Presented</div>
                        <p className="leading-relaxed">
                            A fresh QR code is displayed on their screen. The junior admin scans it with Google Authenticator and enters the 6-digit code to re-enroll.
                        </p>
                    </div>
                </div>
            </div>

            {/* ════════════ CONFIRMATION MODAL ════════════ */}
            {selectedAdminForReset && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-gray-100 relative">
                        <button
                            type="button"
                            onClick={() => setSelectedAdminForReset(null)}
                            className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-5 shadow-sm">
                            <AlertTriangle className="w-7 h-7" />
                        </div>

                        <h3 className="text-xl font-extrabold text-gray-900 mb-2">
                            Reset Multi-Factor Authentication?
                        </h3>

                        <p className="text-sm text-gray-600 leading-relaxed mb-4">
                            You are about to reset MFA / 2FA for junior admin:
                        </p>

                        <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-mono text-sm font-bold text-gray-800 break-all mb-4 flex items-center gap-2">
                            <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                            {selectedAdminForReset.email}
                        </div>

                        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-900 font-medium mb-6 leading-relaxed">
                            ⚠️ <strong>Important consequence:</strong> Their existing Google/Microsoft Authenticator key will be revoked immediately. On their next login with email and password, they will be forced to scan a brand-new QR code to set up their device.
                        </div>

                        <div className="flex items-center justify-end gap-3">
                            <button
                                type="button"
                                disabled={resetting}
                                onClick={() => setSelectedAdminForReset(null)}
                                className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={resetting}
                                onClick={handleConfirmReset}
                                className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-md shadow-red-500/25 transition-all cursor-pointer flex items-center gap-2"
                            >
                                <RotateCcw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
                                {resetting ? 'Resetting MFA...' : 'Confirm Reset MFA'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
