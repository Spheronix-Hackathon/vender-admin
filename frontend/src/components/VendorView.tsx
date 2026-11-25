"use client";
import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  GraduationCap,
  UserCheck,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import IndividualStudentTable, { Student, StatusUpdate } from '@/components/IndividualStudentTable';
import PremiumDropdown from '@/components/PremiumDropdown';
import ExportPreviewModal from '@/components/ExportPreviewModal';
import LastFetched from '@/components/LastFetched';
import RefreshButton from '@/components/RefreshButton';
import { socket } from '@/lib/socket';
import api from '@/lib/api';
import * as XLSX from 'xlsx';

interface FilterOptions {
  colleges: string[];
  branches: string[];
  cities: string[];
  dates: string[];
}

interface VendorViewProps {
  initialSection?: 'pending' | 'completed';
}

function VendorMainContent({ initialSection }: VendorViewProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabQuery = searchParams.get('tab') || searchParams.get('section');
  const isCompletedSection = initialSection === 'completed' || pathname?.includes('/vendor/completed') || tabQuery === 'completed';

  const [students, setStudents] = useState<Student[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [isSuperAdmin] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem('admin_token');
    if (token && token.includes('.')) {
      try {
        const payload = JSON.parse(window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        const email = (payload.email || '').toLowerCase().trim();
        return ['yashwanthkumar87657@gmail.com', 'dhanushsunny00@gmail.com'].includes(email) ||
          payload.role === 'superadmin' || payload.role === 'super_admin';
      } catch (e) {}
    }
    return false;
  });

  // Search & Filter States (matching Image 1)
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState(''); // '' (All), 'individual', 'team'
  const [college, setCollege] = useState('');
  const [branch, setBranch] = useState('');
  const [city, setCity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '', 'reviewed', 'selected', 'pending'
  const [examStatusFilter, setExamStatusFilter] = useState(''); // '', 'submitted', 'not_submitted'
  const [githubLinkStatus, setGithubLinkStatus] = useState('');

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    colleges: [],
    branches: [],
    cities: [],
    dates: []
  });

  // Table selection & Modals
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [previewModalData, setPreviewModalData] = useState<any[] | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchFilterOptions = async () => {
    try {
      const paymentStatus = isCompletedSection ? 'completed' : 'pending';
      const res = await api.get(`/vendor/filters?payment_status=${paymentStatus}`);
      if (res.data) {
        setFilterOptions({
          colleges: res.data.colleges || [],
          branches: res.data.branches || [],
          cities: res.data.cities || [],
          dates: res.data.dates || []
        });
      }
    } catch (e) {
      console.warn('Failed to fetch filter options:', e);
    }
  };

  const fetchStudents = async (showLoadingSpinner = false) => {
    if (showLoadingSpinner) setLoading(true);
    try {
      const paymentStatus = isCompletedSection ? 'completed' : 'pending';
      const params = new URLSearchParams({
        search,
        mode,
        college,
        branch,
        city,
        startDate,
        endDate,
        status_filter: statusFilter,
        exam_status_filter: examStatusFilter,
        github_link_status: githubLinkStatus,
        payment_status: paymentStatus
      });

      const res = await api.get(`/vendor?${params.toString()}`);
      if (res.data?.students) {
        setStudents(res.data.students);
        setTotalStudents(res.data.total ?? res.data.students.length);
      }
      setLastFetched(new Date());
    } catch (err: any) {
      console.error('Error fetching vendor students:', err);
      showToast(err.response?.data?.message || 'Failed to load students', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
  }, [isCompletedSection]);

  // Debounced fetch for search and filters to prevent keystroke race conditions
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [isCompletedSection, search, mode, college, branch, city, startDate, endDate, statusFilter, examStatusFilter, githubLinkStatus]);

  // Real-time live synchronization with MongoDB change stream events
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;
    const debouncedRefresh = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchStudents(false);
        fetchFilterOptions();
      }, 500);
    };

    socket.on('vendorRegistrationAdded', debouncedRefresh);
    socket.on('vendorRegistrationUpdated', debouncedRefresh);
    socket.on('registrationUpdated', debouncedRefresh);
    socket.on('newPayment', debouncedRefresh);

    return () => {
      clearTimeout(debounceTimer);
      socket.off('vendorRegistrationAdded', debouncedRefresh);
      socket.off('vendorRegistrationUpdated', debouncedRefresh);
      socket.off('registrationUpdated', debouncedRefresh);
      socket.off('newPayment', debouncedRefresh);
    };
  }, [isCompletedSection]);

  // Financial KPI calculations
  const { teamStudentsCount, individualStudentsCount, totalCollegesCount } = useMemo(() => {
    let team = 0;
    let individual = 0;
    const cols = new Set<string>();

    students.forEach(s => {
      const teamSize = 1 + (Array.isArray(s.team_members) ? s.team_members.length : 0);
      if (s.participation_mode === 'team') team += teamSize;
      else individual += teamSize;

      if (s.college && s.college !== 'N/A') cols.add(s.college);
    });

    return {
      teamStudentsCount: team,
      individualStudentsCount: individual,
      totalCollegesCount: cols.size || filterOptions.colleges.length
    };
  }, [students, filterOptions.colleges]);

  const selectedStudents = useMemo(() => students.filter(s => selectedIds.includes(s._id)), [students, selectedIds]);
  const selectedStudentsCount = useMemo(() => {
    return selectedStudents.reduce((acc, s) => acc + 1 + (Array.isArray(s.team_members) ? s.team_members.length : 0), 0);
  }, [selectedStudents]);

  // Status update
  const handleStatusUpdate = async (updates: StatusUpdate[]) => {
    try {
      await api.post('/vendor/update-status', { updates });
      showToast('Student status updated successfully', 'success');
      fetchStudents(false);
    } catch (err: any) {
      console.error('Failed to update status:', err);
      showToast(err.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  // Delete single student
  const handleDeleteStudent = async (student: Student) => {
    try {
      await api.delete(`/vendor/${student._id}`);
      showToast(`Student "${student.name}" deleted successfully`, 'success');
      setStudents(prev => prev.filter(s => s._id !== student._id));
      setTotalStudents(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error('Failed to delete student:', err);
      showToast(err.response?.data?.message || 'Failed to delete student', 'error');
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to permanently delete ${selectedIds.length} selected student(s)?`)) return;
    try {
      await api.post('/vendor/bulk-delete', { ids: selectedIds });
      showToast(`Deleted ${selectedIds.length} student(s) successfully`, 'success');
      setSelectedIds([]);
      fetchStudents(false);
    } catch (err: any) {
      console.error('Bulk delete error:', err);
      showToast(err.response?.data?.message || 'Failed to bulk delete', 'error');
    }
  };

  // Move students between Pending and Complete
  const handleBulkMarkComplete = async (targetComplete: boolean) => {
    if (selectedIds.length === 0) return;
    try {
      for (const id of selectedIds) {
        if (targetComplete) {
          await api.put(`/vendor/${id}/complete`);
        } else {
          await api.put(`/vendor/${id}/pending`);
        }
      }
      showToast(
        targetComplete
          ? `Moved ${selectedIds.length} student(s) to Complete Registration`
          : `Moved ${selectedIds.length} student(s) back to Pending`,
        'success'
      );
      setSelectedIds([]);
      fetchStudents(false);
    } catch (err) {
      showToast('Error in bulk status update', 'error');
    }
  };

  const handleResetMFA = async (id: string) => {
    try {
      await api.post(`/vendor/${id}/reset-mfa`);
      showToast('MFA has been reset for the student', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to reset MFA', 'error');
    }
  };

  // Build rows for export and preview
  const buildExportRows = (list: Student[]) => {
    return list.map((s, index) => ({
      'S.No': index + 1,
      'Student ID': s.student_id,
      'Roll Number': s.rollNumber || 'N/A',
      'Year': s.currentYear || 'N/A',
      'Name': s.name,
      'Email': s.email,
      'Phone': s.phone,
      'College': s.college,
      'Branch': s.branch,
      'City': s.city || 'N/A',
      'Mode': s.participation_mode,
      'Track': s.hackathon_track || 'General',
      'Task': s.task || 'General',
      'Payment Status': (s.status === 'approved' ? 'COMPLETED' : 'PENDING'),
      'Registration Date': s.registration_date ? new Date(s.registration_date).toLocaleString('en-IN') : 'N/A',
      'Reviewed': s.is_reviewed ? 'Yes' : 'No',
      'Reviewed By': s.Reviewedby || '',
      'Review Feedback': s.review || '',
      'Selected': s.is_selected ? 'Yes' : 'No',
      'Exam Status': s.examStatus || 'Not Started',
      'GitHub Link': s.githubLink || 'N/A'
    }));
  };

  const handlePreview = () => {
    const listToPreview = selectedIds.length > 0 ? selectedStudents : students;
    const rows = buildExportRows(listToPreview);
    setPreviewModalData(rows);
  };

  const handleExport = () => {
    try {
      setIsExporting(true);
      const listToExport = selectedIds.length > 0 ? selectedStudents : students;
      const rows = buildExportRows(listToExport);

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      const sheetName = isCompletedSection
        ? 'Vendor_Complete_Students'
        : 'Vendor_Pending_Students';

      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      XLSX.writeFile(workbook, `${sheetName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      showToast(`Exported ${rows.length} record(s) to Excel`, 'success');
    } catch (err) {
      console.error('Export error:', err);
      showToast('Failed to export to Excel', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const tabs = [
    { label: 'All', value: '' },
    { label: 'Individual', value: 'individual' },
    { label: 'Team', value: 'team' }
  ];

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl border flex items-center gap-3 ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : toast.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-600" />
            ) : toast.type === 'error' ? (
              <AlertCircle size={18} className="text-red-600" />
            ) : (
              <Clock size={18} className="text-blue-600" />
            )}
            <span className="text-sm font-semibold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER ROW (Matching image) */}
      <header className="flex flex-wrap justify-between items-center relative gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <h2 className="text-3xl font-bold tracking-tight">
              {isCompletedSection
                ? 'Complete Registration Students'
                : 'Pending Students'}
            </h2>

            {/* Quick Section Switcher */}
            <div className="flex items-center gap-1.5 p-1 bg-[#f5f5f7] rounded-xl border border-black/5">
              <button
                type="button"
                onClick={() => router.push('/vendor/pending')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  !isCompletedSection
                    ? 'bg-white text-[#007aff] shadow-sm'
                    : 'text-[#86868b] hover:text-[#1d1d1f]'
                }`}
              >
                <Clock size={13} />
                <span>Pending Students</span>
              </button>
              <button
                type="button"
                onClick={() => router.push('/vendor/completed')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isCompletedSection
                    ? 'bg-white text-[#007aff] shadow-sm'
                    : 'text-[#86868b] hover:text-[#1d1d1f]'
                }`}
              >
                <CheckCircle2 size={13} />
                <span>Complete Registration Students</span>
              </button>
            </div>
          </div>

          <p className="text-[#86868b] font-medium">
            Manage and monitor all participants ({totalStudents})
          </p>
        </div>

        <LastFetched timestamp={lastFetched} />

        <div className="flex gap-4 items-center flex-wrap">
          <input
            type="text"
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="glass-card px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#007aff]/20 w-64"
          />

          <button
            onClick={handlePreview}
            className="glass-card px-5 py-2.5 font-semibold text-sm hover:bg-white transition-all cursor-pointer flex items-center gap-2 text-gray-700 hover:text-black"
            title="Check and preview all student records in table before exporting"
          >
            <Eye size={16} className="text-[#007aff]" />
            <span>Preview & Check</span>
          </button>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="glass-card px-6 py-2.5 font-semibold text-sm hover:bg-white transition-all cursor-pointer flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-[#007aff]/30 border-t-[#007aff] rounded-full animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Export to Excel</span>
              </>
            )}
          </button>

          <RefreshButton
            onRefresh={async () => {
              await fetchStudents(true);
              await fetchFilterOptions();
            }}
            message="Student list and filter options have been successfully updated from the database."
          />
        </div>
      </header>

      {/* KPI CARDS (Matching image rows) */}
      <div className="flex flex-col gap-6">
        {/* Row 1: Total Students & Total Colleges */}
        <div className="flex gap-4 relative z-50">
          <div className="flex-1 bg-[#f5f5f7]/30 p-5 rounded-2xl border border-black/5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#86868b]">Total Students</p>
              <h3 className="text-3xl font-bold text-[#1d1d1f] mt-1">{totalStudents}</h3>
            </div>
            <div className="p-3 bg-[#007aff]/10 text-[#007aff] rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="flex-1 bg-[#f5f5f7]/30 p-5 rounded-2xl border border-black/5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#86868b]">Total Colleges</p>
              <h3 className="text-3xl font-bold text-[#1d1d1f] mt-1">{totalCollegesCount}</h3>
            </div>
            <div className="p-3 bg-purple-500/10 text-purple-600 rounded-xl">
              <GraduationCap className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Row 2: Team Mode Students & Individual Mode Students */}
        <div className="flex gap-4 relative z-50">
          <div className="flex-1 bg-[#f5f5f7]/30 p-5 rounded-2xl border border-black/5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#86868b]">Team Mode Students</p>
              <h3 className="text-3xl font-bold text-[#1d1d1f] mt-1">{teamStudentsCount}</h3>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="flex-1 bg-[#f5f5f7]/30 p-5 rounded-2xl border border-black/5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#86868b]">Individual Mode Students</p>
              <h3 className="text-3xl font-bold text-[#1d1d1f] mt-1">{individualStudentsCount}</h3>
            </div>
            <div className="p-3 bg-orange-500/10 text-orange-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* PRESETS & DROPDOWNS (Matching image exactly) */}
        <div className="flex flex-col gap-4 bg-[#f5f5f7]/30 p-6 rounded-2xl border border-black/5 relative z-50">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-black/5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-[#86868b] uppercase tracking-wider">Presets:</span>
              <div className="flex items-center gap-1.5 bg-white/80 p-1 rounded-xl border border-black/5 shadow-xs flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    !startDate && !endDate ? 'bg-[#007aff] text-white shadow-sm' : 'text-[#86868b] hover:text-[#1d1d1f]'
                  }`}
                >
                  All Time
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('today');
                    setEndDate('today');
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    startDate === 'today' ? 'bg-[#007aff] text-white shadow-sm' : 'text-[#86868b] hover:text-[#1d1d1f]'
                  }`}
                >
                  ⚡ Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('week');
                    setEndDate('week');
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    startDate === 'week' ? 'bg-[#007aff] text-white shadow-sm' : 'text-[#86868b] hover:text-[#1d1d1f]'
                  }`}
                >
                  ⚡ Weekly
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('month');
                    setEndDate('month');
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    startDate === 'month' ? 'bg-[#007aff] text-white shadow-sm' : 'text-[#86868b] hover:text-[#1d1d1f]'
                  }`}
                >
                  🗓️ This Month
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('last_month');
                    setEndDate('last_month');
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    startDate === 'last_month' ? 'bg-[#007aff] text-white shadow-sm' : 'text-[#86868b] hover:text-[#1d1d1f]'
                  }`}
                >
                  ⏪ Last Month
                </button>
              </div>
            </div>

            {/* Custom Range */}
            <div className="flex items-center gap-2 bg-white/80 px-3 py-1.5 rounded-xl border border-black/5 shadow-xs flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#86868b]">Range:</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-[#86868b] font-semibold">Start:</span>
                <input
                  type="date"
                  value={/^\d{4}-\d{2}-\d{2}$/.test(startDate) ? startDate : ''}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-xs font-medium text-[#1d1d1f] focus:outline-none cursor-pointer border border-black/10 rounded-md px-1.5 py-0.5"
                  title="Start Date"
                />
              </div>
              <span className="text-xs text-[#86868b] font-bold">→</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-[#86868b] font-semibold">End:</span>
                <input
                  type="date"
                  value={/^\d{4}-\d{2}-\d{2}$/.test(endDate) ? endDate : ''}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-xs font-medium text-[#1d1d1f] focus:outline-none cursor-pointer border border-black/10 rounded-md px-1.5 py-0.5"
                  title="Ending Date"
                />
              </div>
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="text-[10px] font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                  title="Clear date filter"
                >
                  ✕ Reset
                </button>
              )}
            </div>
          </div>

          {/* Filter Dropdowns (College, Branch, City, Date, Status, Exam Status, GitHub Links) */}
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#86868b] ml-1">College</label>
              <PremiumDropdown
                value={college}
                onChange={setCollege}
                options={[
                  { label: 'All Colleges', value: '' },
                  ...filterOptions.colleges.map((c) => ({ label: c, value: c }))
                ]}
              />
            </div>

            <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#86868b] ml-1">Branch</label>
              <PremiumDropdown
                value={branch}
                onChange={setBranch}
                options={[
                  { label: 'All Branches', value: '' },
                  ...filterOptions.branches.map((b) => ({ label: b, value: b }))
                ]}
              />
            </div>

            <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#86868b] ml-1">City</label>
              <PremiumDropdown
                value={city}
                onChange={setCity}
                options={[
                  { label: 'All Cities', value: '' },
                  ...filterOptions.cities.map((ct) => ({ label: ct, value: ct }))
                ]}
              />
            </div>

            <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#86868b] ml-1">Date</label>
              <PremiumDropdown
                value={startDate}
                onChange={(val) => {
                  setStartDate(val);
                  setEndDate(val);
                }}
                options={[
                  { label: 'All Dates', value: '' },
                  { label: '⚡ Today', value: 'today' },
                  { label: '⚡ This Week (Weekly)', value: 'week' },
                  { label: '🗓️ This Month (Monthly)', value: 'month' },
                  { label: '⏪ Last Month', value: 'last_month' },
                  ...filterOptions.dates.map((d) => ({ label: d, value: d }))
                ]}
              />
            </div>

            <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#86868b] ml-1">Status</label>
              <PremiumDropdown
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { label: 'All Statuses', value: '' },
                  { label: 'Reviewed', value: 'reviewed' },
                  { label: 'Selected', value: 'selected' },
                  { label: 'Pending Review', value: 'pending' }
                ]}
              />
            </div>

            <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#86868b] ml-1">Exam Status</label>
              <PremiumDropdown
                value={examStatusFilter}
                onChange={setExamStatusFilter}
                options={[
                  { label: 'All', value: '' },
                  { label: 'Submitted', value: 'submitted' },
                  { label: 'Not Submitted', value: 'not_submitted' }
                ]}
              />
            </div>

            <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#86868b] ml-1">GitHub Links</label>
              <PremiumDropdown
                value={githubLinkStatus}
                onChange={setGithubLinkStatus}
                options={[
                  { label: 'All Links', value: '' },
                  { label: 'Genuine Links', value: 'genuine' },
                  { label: 'Not Genuine', value: 'not_genuine' }
                ]}
              />
            </div>
          </div>
        </div>

        {/* MODE TABS & SELECT ALL VISIBLE (Matching bottom row in image) */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2 p-1 bg-[#f5f5f7] rounded-2xl w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setMode(tab.value)}
                className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  mode === tab.value ? 'bg-white text-[#007aff] shadow-sm' : 'text-[#86868b] hover:text-[#1d1d1f]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {isSuperAdmin && selectedIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="px-5 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 active:bg-red-200 border border-red-200 rounded-2xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
                Delete Selected ({selectedIds.length})
              </button>
            )}

            <button
              onClick={() => setSelectedIds(students.map((s) => s._id))}
              className="glass-card px-6 py-2 text-sm font-bold text-[#007aff] hover:bg-white transition-all cursor-pointer"
            >
              Select All Visible
            </button>
          </div>
        </div>

        {/* TABLE (Exact match via IndividualStudentTable) */}
        {loading ? (
          <div className="flex items-center justify-center h-[50vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007aff]"></div>
          </div>
        ) : (
          <IndividualStudentTable
            data={students}
            onStatusUpdate={handleStatusUpdate}
            onReAdd={async (s) => {
              showToast(`Re-added ${s.name}`, 'info');
            }}
            onResetMFA={handleResetMFA}
            onDelete={handleDeleteStudent}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onMailSent={(id) => {
              setStudents((prev) =>
                prev.map((s) => (s._id === id ? { ...s, mail_sent: true, mail_sent_at: new Date() } : s))
              );
            }}
            onUpdate={() => {
              fetchStudents(false);
              fetchFilterOptions();
            }}
            showUpload={false}
            apiPath="/vendor"
          />
        )}

        {/* Bottom Floating Bar when items selected */}
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-10 right-10 z-40 flex items-center gap-3 bg-white/80 backdrop-blur-2xl p-3 px-5 rounded-[28px] border border-black/10 shadow-[0_20px_50px_rgba(0,0,0,0.15)]"
          >
            <button
              onClick={handlePreview}
              className="bg-white hover:bg-gray-100 text-gray-800 border border-gray-200 px-5 py-3.5 rounded-[20px] font-bold text-xs shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Eye size={16} className="text-[#007aff]" />
              Preview Selected ({selectedStudentsCount})
            </button>

            {!isCompletedSection ? (
              <button
                onClick={() => handleBulkMarkComplete(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3.5 rounded-[20px] font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 size={18} />
                Mark Complete ({selectedIds.length})
              </button>
            ) : (
              <button
                onClick={() => handleBulkMarkComplete(false)}
                className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3.5 rounded-[20px] font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Clock size={18} />
                Mark Pending ({selectedIds.length})
              </button>
            )}
          </motion.div>
        )}

        {/* Export Preview Modal */}
        <ExportPreviewModal
          isOpen={Boolean(previewModalData)}
          onClose={() => setPreviewModalData(null)}
          title="Student Registration Export Preview"
          data={previewModalData || []}
          fileNamePrefix={isCompletedSection ? 'vendor_completed_students' : 'vendor_pending_students'}
        />
      </div>
    </div>
  );
}

export default function VendorView({ initialSection }: VendorViewProps) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#007aff]"></div>
          <p className="text-sm font-medium text-[#86868b]">Loading...</p>
        </div>
      }
    >
      <VendorMainContent initialSection={initialSection} />
    </Suspense>
  );
}
