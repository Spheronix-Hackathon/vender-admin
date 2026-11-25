"use client";
import { useEffect, useState } from 'react';
import KPICard from '@/components/KPICard';
import AnalyticsChart from '@/components/AnalyticsChart';
import { motion } from 'framer-motion';
import { socket } from '@/lib/socket';
import RefreshButton from '@/components/RefreshButton';
import LastFetched from '@/components/LastFetched';
import api from '@/lib/api';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    approvedStudents: 0,
    totalVendorStudents: 0,
    approvedVendorStudents: 0,
    pendingVendorPayments: 0,
    vendorTeamStudents: 0,
    vendorIndividualStudents: 0,
    successRate: '100.00',
    registrationGrowth: '0%',
    registeredColleges: 0
  });

  const [registrationData, setRegistrationData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchData = async () => {
    try {
      const [statsRes, timelineRes, collegesRes] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/analytics/timeline'),
        api.get('/colleges').catch(() => ({ data: [] }))
      ]);

      const sData = statsRes.data || {};
      setStats({
        ...sData,
        registeredColleges: Array.isArray(collegesRes.data) ? collegesRes.data.length : (sData.registeredColleges || 0)
      });
      setRegistrationData(timelineRes.data || []);
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
    socket.on('registrationUpdated', debouncedFetchData);

    return () => {
      clearTimeout(timeoutId);
      socket.off('vendorRegistrationUpdated', debouncedFetchData);
      socket.off('vendorRegistrationAdded', debouncedFetchData);
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

  const totalStudentsCount = stats.totalVendorStudents || stats.totalStudents || 0;
  const totalRegistrationsCount = (stats as any).totalRegistrations || (stats as any).totalVendorRegistrations || 0;
  const approvedStudentsCount = stats.approvedVendorStudents || 0;
  const pendingStudentsCount = stats.pendingVendorPayments || Math.max(0, totalStudentsCount - approvedStudentsCount);
  const completionPercent = totalStudentsCount > 0 ? Math.min(100, Math.round((approvedStudentsCount / totalStudentsCount) * 100)) : 0;
  const pendingPercent = totalStudentsCount > 0 ? Math.min(100, Math.round((pendingStudentsCount / totalStudentsCount) * 100)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="flex flex-col gap-10"
    >
      {/* Header */}
      <header className="flex justify-between items-end relative">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-[#86868b] mt-1 font-medium">Live Vendor Student Registrations & Overview</p>
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
            message="Dashboard statistics and registration activity charts have been refreshed."
          />
        </div>
      </header>

      <div className="flex flex-col gap-6">
        {/* Row 1: Core Student Counts */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-fr">
          <KPICard 
            label="Total Students" 
            value={totalStudentsCount} 
            trend={totalRegistrationsCount > 0 ? `${totalRegistrationsCount} registrations` : undefined} 
            subtitle={totalRegistrationsCount > 0 ? `Across ${totalRegistrationsCount} registrations` : "Total registered participants"}
            href="/vendor/pending" 
          />
          <KPICard 
            label="Complete Registration Students" 
            value={approvedStudentsCount} 
            color="#34c759" 
            subtitle="Verified completed registrations"
            href="/vendor/completed" 
          />
          <KPICard 
            label="Pending Students" 
            value={pendingStudentsCount} 
            color="#ff9500"
            subtitle="Registrations in progress"
            href="/vendor/pending" 
          />
          <KPICard 
            label="Registered Colleges" 
            value={stats.registeredColleges || 0} 
            color="#007aff" 
            subtitle="Colleges represented"
            href="/colleges" 
          />
        </div>

        {/* Row 2: Participation Breakdown & Completion Rates */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-fr">
          <KPICard 
            label="Team Mode Students" 
            value={stats.vendorTeamStudents || 0} 
            color="#007aff" 
            subtitle="Students participating in teams"
            href="/vendor/completed" 
          />
          <KPICard 
            label="Individual Mode Students" 
            value={stats.vendorIndividualStudents || 0} 
            color="#ff9500" 
            subtitle="Students registered individually"
            href="/vendor/completed" 
          />
          <KPICard 
            label="Completion Rate" 
            value={`${completionPercent}%`} 
            color="#34c759"
            subtitle="Approved vs total students"
          />
          <KPICard 
            label="Pending Rate" 
            value={`${pendingPercent}%`} 
            color="#ff9500"
            subtitle="Pending students percentage"
          />
        </div>
      </div>

      {/* Registration Activity Timeline (Full-width clean chart) */}
      <div className="glass-card p-6 md:p-10 min-h-[420px]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-8">
          <div>
            <h3 className="text-xl font-bold text-[#1d1d1f]">Student Registration Activity</h3>
            <p className="text-xs text-[#86868b] font-medium mt-1">Live timeline of student registration volume</p>
          </div>
          <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
            <span className="w-2 h-2 rounded-full bg-[#007aff] animate-pulse"></span>
            <span className="text-xs font-bold text-[#007aff]">Real-Time Student Registrations</span>
          </div>
        </div>
        <AnalyticsChart data={registrationData} title="" />
      </div>
    </motion.div>
  );
}
