"use client";
import { useEffect, useState } from 'react';
import KPICard from '@/components/KPICard';
import AnalyticsChart from '@/components/AnalyticsChart';
import { motion } from 'framer-motion';
import { socket } from '@/lib/socket';
import RefreshButton from '@/components/RefreshButton';
import LastFetched from '@/components/LastFetched';
import axios from 'axios';

import api from '@/lib/api';
import PremiumDropdown from '@/components/PremiumDropdown';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    approvedStudents: 0,
    totalIndividualStudents: 0,
    approvedIndividualStudents: 0,
    totalStudentsNotFillData: 0,
    totalRevenue: 0,
    studentSectionRevenue: 0,
    individualApprovedRevenue: 0,
    vendorRevenue: 0,
    vendorAmount: 0,
    vendorTeamAmount: 0,
    vendorIndividualAmount: 0,
    totalVendorStudents: 0,
    approvedVendorStudents: 0,
    pendingVendorPayments: 0,
    officerUploadedRevenue: 0,
    teamRevenue: 0,
    individualRevenue: 0,
    nodalRevenue: 0,
    selfRegisteredRevenue: 0,
    officerUploadedStudents: 0,
    officerUploadedAmount: 0,
    officerUploadedReceipts: 0,
    officerSubmissionsCount: 0,
    pendingPayments: 0,
    successRate: '0.00',
    registrationGrowth: '0%',
    registeredColleges: 0
  });

  const [registrationData, setRegistrationData] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revenueGranularity, setRevenueGranularity] = useState('day');
  const [revenueData, setRevenueData] = useState([]);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchData = async (granularity = revenueGranularity) => {
    try {
      const [statsRes, timelineRes, revenueRes, paymentsRes, collegesRes] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/analytics/timeline'),
        api.get(`/analytics/revenue-timeline?granularity=${granularity}`),
        api.get('/payments?limit=4'),
        api.get('/colleges').catch(() => ({ data: [] }))
      ]);

      setStats({
        ...statsRes.data,
        registeredColleges: Array.isArray(collegesRes.data) ? collegesRes.data.length : (statsRes.data?.registeredColleges || 0)
      });
      setRegistrationData(timelineRes.data);
      setRecentTransactions(paymentsRes.data.payments);
      setRevenueData(revenueRes.data);
      setLastFetched(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    let timeoutId: NodeJS.Timeout;
    const debouncedFetchData = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fetchData();
      }, 1000); // 1-second debounce
    };

    socket.on('vendorRegistrationUpdated', debouncedFetchData);
    socket.on('vendorRegistrationAdded', debouncedFetchData);
    socket.on('newPayment', debouncedFetchData);
    socket.on('registrationUpdated', debouncedFetchData);

    return () => {
      clearTimeout(timeoutId);
      socket.off('vendorRegistrationUpdated', debouncedFetchData);
      socket.off('vendorRegistrationAdded', debouncedFetchData);
      socket.off('newPayment', debouncedFetchData);
      socket.off('registrationUpdated', debouncedFetchData);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#007aff]"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="flex flex-col gap-10"
    >
      <header className="flex justify-between items-end relative">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-[#86868b] mt-1 font-medium">Dashboard for Vendor Admin</p>
        </div>

        <LastFetched timestamp={lastFetched} />

        <div className="flex gap-4">
          <button 
            onClick={() => {
              window.open('/api/vendor/export', '_blank');
            }}
            className="glass-card px-6 py-2.5 font-semibold text-sm hover:bg-white transition-all cursor-pointer"
          >
            Export Data
          </button>
          <RefreshButton
            onRefresh={fetchData}
            message="Dashboard statistics, activity charts, and recent transactions have been refreshed."
          />
        </div>
      </header>

      <div className="flex flex-col gap-6">
        {/* Row 1: Vendor Registrations & Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-fr">
          <KPICard 
            label="Total Students" 
            value={stats.totalVendorStudents || 0} 
            trend={`+${stats.registrationGrowth || 0}%`} 
            href="/vendor/pending" 
          />
          <KPICard 
            label="Complete Registration Students" 
            value={stats.approvedVendorStudents || 0} 
            color="#34c759" 
            href="/vendor/completed" 
          />
          <KPICard 
            label="Pending Students" 
            value={stats.pendingVendorPayments || (stats.totalVendorStudents - stats.approvedVendorStudents) || 0} 
            color="#ff9500"
            href="/vendor/pending" 
          />
          <KPICard 
            label="Total Revenue" 
            value={`₹${((stats.vendorRevenue ?? stats.vendorAmount ?? stats.totalRevenue) || 0).toLocaleString('en-IN')}`} 
            color="#1d1d1f" 
            subtitle={`Team: ₹${(stats.vendorTeamAmount || 0).toLocaleString('en-IN')} • Indv: ₹${(stats.vendorIndividualAmount || 0).toLocaleString('en-IN')}`}
            href="/payments" 
          />
        </div>

        {/* Row 2: Colleges, Operations & Revenue Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-fr">
          <KPICard 
            label="Registered Colleges" 
            value={stats.registeredColleges || 0} 
            color="#007aff" 
            href="/colleges" 
          />
          <KPICard 
            label="Vendor Team Revenue" 
            value={`₹${(stats.vendorTeamAmount || 0).toLocaleString('en-IN')}`} 
            color="#007aff" 
            subtitle="Completed team registrations"
            href="/vendor/completed" 
          />
          <KPICard 
            label="Vendor Individual Revenue" 
            value={`₹${(stats.vendorIndividualAmount || 0).toLocaleString('en-IN')}`} 
            color="#ff9500" 
            subtitle="Completed individual registrations"
            href="/vendor/completed" 
          />
          <KPICard 
            label="Completion Rate" 
            value={`${stats.totalVendorStudents ? Math.round((stats.approvedVendorStudents / stats.totalVendorStudents) * 100) : 100}%`} 
            color="#34c759"
            subtitle="Approved vs total vendor students"
          />
        </div>

        {/* Row 4: Dedicated Vendor Section */}
        <div className="glass-card p-6 md:p-8 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg shadow-sm">
                🏪
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight text-[#1d1d1f]">Vendor Registrations Overview</h3>
                <p className="text-xs text-[#86868b] font-medium mt-0.5">
                  Live synchronized metrics from Vendor Database (spheronix_db)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="/vendor/pending"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors border border-amber-200/60 shadow-sm flex items-center gap-1.5"
              >
                <span>🕒</span> View Pending ({stats.pendingVendorPayments || stats.totalVendorStudents || 0})
              </a>
              <a
                href="/vendor/completed"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200/60 shadow-sm flex items-center gap-1.5"
              >
                <span>✅</span> View Completed ({stats.approvedVendorStudents || 0})
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white/80 p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:border-blue-200 transition-all">
              <div className="text-xs font-bold uppercase tracking-wider text-[#86868b]">Total Vendor Students</div>
              <div className="text-3xl font-extrabold text-[#1d1d1f] my-2">{stats.totalVendorStudents || 0}</div>
              <a href="/vendor/pending" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
                View registrations &rarr;
              </a>
            </div>

            <div className="bg-white/80 p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:border-emerald-200 transition-all">
              <div className="text-xs font-bold uppercase tracking-wider text-[#86868b]">Approved / Completed</div>
              <div className="text-3xl font-extrabold text-emerald-600 my-2">{stats.approvedVendorStudents || 0}</div>
              <a href="/vendor/completed" className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1">
                View completed &rarr;
              </a>
            </div>

            <div className="bg-white/80 p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:border-amber-200 transition-all">
              <div className="text-xs font-bold uppercase tracking-wider text-[#86868b]">Pending Payments</div>
              <div className="text-3xl font-extrabold text-amber-500 my-2">{stats.pendingVendorPayments || stats.totalVendorStudents || 0}</div>
              <a href="/vendor/pending" className="text-xs font-semibold text-amber-600 hover:underline flex items-center gap-1">
                Awaiting payment &rarr;
              </a>
            </div>

            <div className="bg-white/80 p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:border-emerald-200 transition-all">
              <div className="text-xs font-bold uppercase tracking-wider text-[#86868b]">Vendor Amount (Revenue)</div>
              <div className="text-3xl font-extrabold text-emerald-600 my-2">₹{(stats.vendorRevenue ?? stats.vendorAmount ?? 0).toLocaleString('en-IN')}</div>
              <div className="text-xs text-[#86868b]">From completed registrations</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-6 md:p-10 min-h-[400px] aspect-[4/3] lg:aspect-auto lg:h-[clamp(350px,30vh,450px)]">
          <h3 className="text-xl font-semibold mb-8">Registration Activity</h3>
          <AnalyticsChart data={registrationData} title="" />
        </div>

        <div className="glass-card p-6 md:p-10 min-h-[400px] aspect-[4/3] lg:aspect-auto lg:h-[clamp(350px,30vh,450px)]">
          <div className="flex justify-between items-center mb-8 relative z-50">
            <h3 className="text-xl font-semibold">Revenue Analytics</h3>
            <PremiumDropdown
              value={revenueGranularity}
              onChange={(val) => {
                setRevenueGranularity(val);
                fetchData(val);
              }}
              options={[
                { label: 'Minute', value: 'minute' },
                { label: 'Hourly', value: 'hour' },
                { label: 'Daily', value: 'day' },
                { label: 'Weekly', value: 'week' },
                { label: 'Monthly', value: 'month' }
              ]}
              className="w-[140px]"
            />
          </div>
          <AnalyticsChart data={revenueData} title="" type="line" dataKey="amount" color="#34c759" />
        </div>
      </div>

      <div className="glass-card p-10">
        <h3 className="text-xl font-semibold mb-8">Recent Transactions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {recentTransactions.length > 0 ? recentTransactions.map((txn: any, idx: number) => (
            <div key={`${txn._id || txn.transaction_id || idx}-${idx}`} className="flex flex-col gap-4 p-5 rounded-2xl bg-[#f5f5f7]/50 border border-black/5 hover:bg-white hover:shadow-xl hover:shadow-black/5 transition-all group">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold uppercase text-lg group-hover:scale-110 transition-transform">
                  {txn.student_id?.name?.charAt(0) || 'U'}
                </div>
                <div className="text-right">
                  <p className="font-black text-lg">₹{txn.amount}</p>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${txn.payment_status === 'completed' ? 'text-[#34c759]' : 'text-[#ff3b30]'
                    }`}>
                    {txn.payment_status}
                  </p>
                </div>
              </div>
              <div>
                <p className="font-bold text-sm text-[#1d1d1f] truncate">{txn.student_id?.name || 'Unknown Student'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-1 h-1 rounded-full bg-[#86868b]"></span>
                  <p className="text-xs text-[#86868b] font-medium">
                    {txn.payment_method} • {new Date(txn.payment_date).toLocaleDateString('en-IN')} {new Date(txn.payment_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </p>
                </div>
              </div>
            </div>
          )) : (
            <p className="text-center text-[#86868b] py-10 col-span-full">No recent transactions found.</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
