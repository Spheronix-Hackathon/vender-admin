"use client";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import { LayoutDashboard, GraduationCap, Building2, CreditCard, BarChart3, LogOut, UserCheck, Pencil, X, Check, ScrollText, Clock } from 'lucide-react';


const Sidebar = () => {
    const pathname = usePathname();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [adminEmail, setAdminEmail] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [adminUsername, setAdminUsername] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editUsernameVal, setEditUsernameVal] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
        if (token && token.includes('.')) {
            try {
                const base64Payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
                const payload = JSON.parse(window.atob(base64Payload));
                if (payload?.email) {
                    setAdminEmail(payload.email);
                }
                if (payload?.role) {
                    setUserRole(payload.role);
                }
            } catch (e) {}
        }

        const fetchProfile = async () => {
            try {
                const res = await api.get('/auth/me');
                if (res.data?.user?.email) {
                    setAdminEmail(res.data.user.email);
                }
                if (res.data?.user?.username) {
                    setAdminUsername(res.data.user.username);
                }
                if (res.data?.user?.role) {
                    setUserRole(res.data.user.role);
                }
            } catch (err) {
                console.warn("Failed to fetch admin profile", err);
            }
        };
        if (typeof window !== 'undefined' && localStorage.getItem('admin_token')) {
            fetchProfile();
        }
    }, []);

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            const res = await api.put('/auth/profile', { username: editUsernameVal });
            setAdminUsername(res.data.user.username);
            setIsEditModalOpen(false);
        } catch (err) {
            console.error("Failed to save profile", err);
        } finally {
            setIsSaving(false);
        }
    };

    const baseMenuItems = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
        { name: 'Pending Students', icon: Clock, path: '/vendor/pending' },
        { name: 'Complete Registration Students', icon: UserCheck, path: '/vendor/completed' },
        { name: 'Colleges', icon: GraduationCap, path: '/colleges' },
        { name: 'Categories', icon: Building2, path: '/categories' },
        { name: 'Payments', icon: CreditCard, path: '/payments' },
        { name: 'Analytics', icon: BarChart3, path: '/analytics' },
    ];

    const superAdmins = ['yashwanthkumar87657@gmail.com', 'dhanushsunny00@gmail.com'];
    const isSuperAdmin = Boolean((adminEmail && superAdmins.includes(adminEmail.toLowerCase().trim())) || userRole === 'superadmin' || userRole === 'super_admin');
    
    const menuItems = [...baseMenuItems];
    if (isSuperAdmin) {
        // Position Admin Logs prominently right under Dashboard
        menuItems.splice(1, 0, { name: 'Admin Logs', icon: ScrollText, path: '/admin-logs' });
    }

    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        router.replace('/login');
    };

    return (
        <div
            className="h-screen fixed left-0 top-0 flex flex-col gap-8 bg-[#f5f5f7] border-r border-[#e5e5e7] transition-all duration-300 ease-in-out z-50"
            style={{
                width: 'var(--sidebar-width)',
                padding: 'clamp(1rem, 1.5vw, 1.5rem)'
            }}
        >
            <div className="flex flex-col gap-1 px-2 mb-2 mt-2">
                <div 
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-black/5 cursor-pointer transition-colors group relative"
                    onClick={() => {
                        setEditUsernameVal(adminUsername || "");
                        setIsEditModalOpen(true);
                    }}
                >
                    <div className="w-10 h-10 overflow-hidden bg-transparent rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-black/5 group-hover:shadow-md transition-shadow">
                        <img src="/s.jpeg" alt="Spheronix Logo" className="object-cover w-full h-full" />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <h1 className="text-[16px] font-bold tracking-tight leading-tight text-[#1d1d1f]">Hackathon Admin</h1>
                        {adminUsername || adminEmail ? (
                            <span className="text-[11px] text-[#007aff] font-medium truncate mt-0.5" title={adminUsername || adminEmail || ""}>
                                {adminUsername || adminEmail}
                            </span>
                        ) : null}
                    </div>
                    <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1.5 rounded-full shadow-sm border border-black/5">
                        <Pencil className="w-3.5 h-3.5 text-[#007aff]" />
                    </div>
                </div>
            </div>

            <nav className="flex flex-col gap-2 flex-1 overflow-y-auto min-h-0 pr-2 pb-2">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.path;
                    return (
                        <Link key={item.path} href={item.path} className={`sidebar-link ${isActive ? 'active' : ''}`}>
                            <Icon className="w-5 h-5 mr-3" />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            {/* Logout Button */}
            <button
                onClick={handleLogout}
                className="sidebar-link w-full text-left"
                style={{ color: '#ff3b30', marginBottom: '0.5rem' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,59,48,0.1)'; e.currentTarget.style.color = '#ff3b30'; }}
                onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = '#ff3b30'; }}
            >
                <LogOut className="w-5 h-5 mr-3" />
                Logout
            </button>

            {/* Profile Edit Modal */}
            {isEditModalOpen && mounted && createPortal(
                <div 
                    className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200"
                    onClick={() => setIsEditModalOpen(false)}
                >
                    <div 
                        className="bg-white rounded-3xl shadow-2xl p-7 w-full max-w-md relative border border-[#e5e5e7] animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => setIsEditModalOpen(false)}
                            className="absolute right-5 top-5 text-[#86868b] hover:text-[#1d1d1f] transition-colors bg-[#f5f5f7] hover:bg-[#e5e5e7] rounded-full p-2 cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-[#1d1d1f]">Edit Profile</h2>
                            <p className="text-sm text-[#86868b] mt-1">Set your admin display username</p>
                        </div>
                        
                        <div className="flex flex-col gap-4 mb-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-[#86868b] uppercase tracking-wider">Email Address</label>
                                <input 
                                    type="text" 
                                    value={adminEmail || ''}
                                    disabled
                                    className="w-full border border-[#e5e5e7] bg-[#f5f5f7] rounded-xl px-4 py-3 outline-none text-sm font-medium text-[#86868b] cursor-not-allowed select-all"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-[#1d1d1f] uppercase tracking-wider">Display Username</label>
                                <input 
                                    type="text" 
                                    value={editUsernameVal}
                                    onChange={(e) => setEditUsernameVal(e.target.value)}
                                    className="w-full border border-[#d2d2d7] focus:border-[#007aff] bg-white rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-[#007aff]/15 transition-all text-sm font-medium text-[#1d1d1f]"
                                    placeholder="Enter your username..."
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveProfile()}
                                />
                            </div>
                        </div>
                        
                        <div className="flex justify-end gap-3 pt-2 border-t border-[#f5f5f7]">
                            <button 
                                onClick={() => setIsEditModalOpen(false)}
                                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveProfile}
                                disabled={isSaving}
                                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-[#007aff] hover:bg-[#0071e3] active:bg-[#0055b3] transition-all flex items-center gap-2 shadow-lg shadow-blue-500/25 cursor-pointer disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" /> 
                                        <span>Save Changes</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Sidebar;

