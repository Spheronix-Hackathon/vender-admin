"use client";
import { useEffect, useState } from 'react';
import AnalyticsChart from '@/components/AnalyticsChart';
import { motion } from 'framer-motion';
import RefreshButton from '@/components/RefreshButton';
import LastFetched from '@/components/LastFetched';
import { socket } from '@/lib/socket';
import { Users, UserCheck, Layers, Clock, CheckCircle2, Coins } from 'lucide-react';
import api from '@/lib/api';

type SourceFilter = 'all' | 'students' | 'individual';

interface AnalyticsSummarySection {
    totalRegistrations: number;
    approvedStudents: number;
    pendingStudents: number;
    revenue: number;
}

interface AnalyticsSummary {
    all: AnalyticsSummarySection;
    students: AnalyticsSummarySection;
    individual: AnalyticsSummarySection;
}

const defaultSummary: AnalyticsSummary = {
    all: { totalRegistrations: 2113, approvedStudents: 387, pendingStudents: 1726, revenue: 192318 },
    students: { totalRegistrations: 95, approvedStudents: 95, pendingStudents: 0, revenue: 37905 },
    individual: { totalRegistrations: 2113, approvedStudents: 387, pendingStudents: 1726, revenue: 154413 }
};

export default function AnalyticsPage() {
    const [source, setSource] = useState<SourceFilter>('all');
    const [summary, setSummary] = useState<AnalyticsSummary>(defaultSummary);
    const [collegeData, setCollegeData] = useState([]);
    const [trackData, setTrackData] = useState([]);
    const [participationData, setParticipationData] = useState([]);
    const [regTimeline, setRegTimeline] = useState([]);
    const [revTimeline, setRevTimeline] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastFetched, setLastFetched] = useState<Date | null>(null);

    const fetchAnalytics = async (selectedSource: SourceFilter = source) => {
        try {
            const [collegeRes, trackRes, participationRes, regRes, revRes, summaryRes] = await Promise.all([
                api.get(`/analytics/colleges?source=${selectedSource}`),
                api.get(`/analytics/tracks?source=${selectedSource}`),
                api.get(`/analytics/participation-mode?source=${selectedSource}`),
                api.get(`/analytics/timeline?source=${selectedSource}`),
                api.get(`/analytics/revenue-timeline?source=${selectedSource}`),
                api.get('/analytics/summary').catch(() => null)
            ]);

            setCollegeData(collegeRes.data.map((item: any) => ({ _id: item._id || 'N/A', count: item.count })));
            setTrackData(trackRes.data.map((item: any) => ({ _id: item._id || 'N/A', count: item.value })));
            setParticipationData(participationRes.data.map((item: any) => ({ _id: item._id || 'N/A', count: item.count })));
            setRegTimeline(regRes.data);
            setRevTimeline(revRes.data);
            if (summaryRes?.data) {
                setSummary(summaryRes.data);
            }
            setLastFetched(new Date());
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSourceChange = (newSource: SourceFilter) => {
        setSource(newSource);
        fetchAnalytics(newSource);
    };

    useEffect(() => {
        fetchAnalytics();

        let debounceTimer: NodeJS.Timeout;
        const debouncedRefresh = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                fetchAnalytics();
            }, 600);
        };

        socket.on('newRegistration', debouncedRefresh);
        socket.on('registrationUpdated', debouncedRefresh);
        socket.on('newIndividualRegistration', debouncedRefresh);
        socket.on('individualRegistrationUpdated', debouncedRefresh);
        socket.on('registrationAdded', debouncedRefresh);
        socket.on('newPayment', debouncedRefresh);
        socket.on('paymentUpdated', debouncedRefresh);

        return () => {
            clearTimeout(debounceTimer);
            socket.off('newRegistration', debouncedRefresh);
            socket.off('registrationUpdated', debouncedRefresh);
            socket.off('newIndividualRegistration', debouncedRefresh);
            socket.off('individualRegistrationUpdated', debouncedRefresh);
            socket.off('registrationAdded', debouncedRefresh);
            socket.off('newPayment', debouncedRefresh);
            socket.off('paymentUpdated', debouncedRefresh);
        };
    }, [source]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[80vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#007aff]"></div>
            </div>
        );
    }

    const currentMetrics = summary[source] || summary.all;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-8"
        >
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 relative">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Advanced Analytics</h2>
                    <p className="text-[#86868b] mt-1 font-medium">
                        Comprehensive metrics from Students Section (95), Approved Students (387), and Pending Students (1,726)
                    </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <LastFetched timestamp={lastFetched} />
                    <RefreshButton
                        onRefresh={() => fetchAnalytics(source)}
                        message="Advanced analytics charts, trends, and distributions have been updated with the latest registration data."
                    />
                </div>
            </header>

            {/* Filter Tabs & Detailed Metric Badges */}
            <div className="flex flex-col gap-4 bg-white/70 backdrop-blur-md p-4 rounded-2xl border border-gray-200/80 shadow-sm">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    {/* Section Switcher Tabs */}
                    <div className="inline-flex items-center bg-gray-100/90 p-1 rounded-xl gap-1 flex-wrap">
                        <button
                            type="button"
                            onClick={() => handleSourceChange('all')}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                                source === 'all'
                                    ? 'bg-[#007aff] text-white shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                            }`}
                        >
                            <Layers className="w-3.5 h-3.5" />
                            All Registrations ({summary.all.totalRegistrations.toLocaleString()})
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSourceChange('students')}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                                source === 'students'
                                    ? 'bg-[#007aff] text-white shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                            }`}
                        >
                            <Users className="w-3.5 h-3.5" />
                            Students Section ({summary.students.totalRegistrations.toLocaleString()})
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSourceChange('individual')}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                                source === 'individual'
                                    ? 'bg-[#007aff] text-white shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                            }`}
                        >
                            <UserCheck className="w-3.5 h-3.5" />
                            Approved Students ({summary.individual.approvedStudents.toLocaleString()})
                        </button>
                    </div>

                    {/* Quick Metric Badges */}
                    <div className="flex items-center gap-2.5 flex-wrap text-xs font-semibold">
                        <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200/60 text-blue-700 px-3 py-1.5 rounded-xl shadow-xs">
                            <Layers className="w-3.5 h-3.5 text-blue-600" />
                            <span>Total Registrations: <strong className="font-bold">{currentMetrics.totalRegistrations.toLocaleString()}</strong></span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/60 text-emerald-700 px-3 py-1.5 rounded-xl shadow-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Approved: <strong className="font-bold">{currentMetrics.approvedStudents.toLocaleString()}</strong></span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200/60 text-amber-700 px-3 py-1.5 rounded-xl shadow-xs">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Pending Students: <strong className="font-bold">{currentMetrics.pendingStudents.toLocaleString()}</strong></span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 bg-purple-50 border border-purple-200/60 text-purple-700 px-3 py-1.5 rounded-xl shadow-xs">
                            <Coins className="w-3.5 h-3.5 text-purple-600" />
                            <span>Revenue: <strong className="font-bold">₹{currentMetrics.revenue.toLocaleString('en-IN')}</strong></span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 glass-card p-6 md:p-10 min-h-[400px] aspect-[4/3] lg:aspect-auto lg:h-[clamp(350px,30vh,450px)]">
                    <h3 className="text-xl font-semibold mb-8">Registration Velocity</h3>
                    <AnalyticsChart data={regTimeline} title="" type="line" />
                </div>
                
                <div className="glass-card p-6 md:p-10 min-h-[400px] aspect-[4/3] lg:aspect-auto lg:h-[clamp(350px,30vh,450px)]">
                    <h3 className="text-xl font-semibold mb-8">Revenue Growth</h3>
                    <AnalyticsChart data={revTimeline} title="" type="area" dataKey="amount" color="#34c759" />
                </div>

                <div className="glass-card p-6 md:p-10 min-h-[400px] aspect-[4/3] lg:aspect-auto lg:h-[clamp(350px,30vh,450px)]">
                    <h3 className="text-xl font-semibold mb-8">Top 10 Colleges</h3>
                    <AnalyticsChart data={collegeData} title="" />
                </div>

                <div className="glass-card p-6 md:p-10 min-h-[400px] aspect-[4/3] lg:aspect-auto lg:h-[clamp(350px,30vh,450px)]">
                    <h3 className="text-xl font-semibold mb-8">Project Distribution</h3>
                    <AnalyticsChart data={trackData} title="" color="#8a2be2" />
                </div>

                <div className="glass-card p-6 md:p-10 min-h-[400px] aspect-[4/3] lg:aspect-auto lg:h-[clamp(350px,30vh,450px)]">
                    <h3 className="text-xl font-semibold mb-8">Participation Mode</h3>
                    <AnalyticsChart data={participationData} title="" color="#ff9500" />
                </div>
            </div>
        </motion.div>
    );
}

