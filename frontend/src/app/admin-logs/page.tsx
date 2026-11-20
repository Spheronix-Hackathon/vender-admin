"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ScrollText, Search, RefreshCcw, Calendar, User, Activity, AlertCircle, Trash2 } from 'lucide-react';
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
    const [adminDocs, setAdminDocs] = useState<AdminLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'deletions'>('all');
    const [unauthorized, setUnauthorized] = useState(false);
    const router = useRouter();

    const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

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

    useEffect(() => {
        fetchLogs();

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

    return (
        <div className="p-8 pb-24">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">Admin Logs</h1>
                    <p className="text-gray-500 font-medium">Monitor all administrative actions & student deletions grouped by account</p>
                </div>
                <button 
                    onClick={fetchLogs}
                    className="group flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all shadow-sm hover:shadow-md active:scale-95 cursor-pointer"
                >
                    <RefreshCcw className={`w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors ${loading ? 'animate-spin' : ''}`} />
                    <span className="text-sm font-semibold text-gray-700">Refresh Data</span>
                </button>
            </div>

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
        </div>
    );
}
