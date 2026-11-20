"use client";
import React, { useEffect, useState } from 'react';
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { motion } from 'framer-motion';
import { FileDown } from 'lucide-react';
import RefreshButton from '@/components/RefreshButton';
import LastFetched from '@/components/LastFetched';
import { socket } from '@/lib/socket';
import axios from 'axios';

import api from '@/lib/api';
import PremiumDropdown from '@/components/PremiumDropdown';

interface Payment {
    _id: string;
    transaction_id?: string;
    student_id: { name: string };
    amount: number;
    payment_method: string;
    payment_status: string;
    payment_date: string;
}

const columnHelper = createColumnHelper<Payment>();

const columns = [
    columnHelper.accessor(row => row.transaction_id || row._id, { id: 'transaction_id', header: 'Transaction ID' }),
    columnHelper.accessor('student_id.name', { header: 'Student' }),
    columnHelper.accessor('amount', {
        header: 'Amount',
        cell: info => <span className="font-bold">₹{info.getValue()}</span>
    }),
    columnHelper.accessor('payment_method', { header: 'Method' }),
    columnHelper.accessor('payment_status', {
        header: 'Status',
        cell: info => (
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${info.getValue() === 'completed' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}>
                {info.getValue()}
            </span>
        )
    }),
    columnHelper.accessor('payment_date', {
        header: 'Date',
        cell: info => {
            const date = new Date(info.getValue());
            return (
                <div className="flex flex-col">
                    <span className="text-nowrap">{date.toLocaleDateString('en-IN')}</span>
                    <span className="text-[10px] text-[#86868b] font-bold uppercase tracking-widest mt-0.5">
                        {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                </div>
            );
        }
    }),
];

export default function PaymentsPage() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastFetched, setLastFetched] = useState<Date | null>(null);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [timeRange, setTimeRange] = useState('all');
    const [date, setDate] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [availableDates, setAvailableDates] = useState<string[]>([]);

    const fetchPayments = async () => {
        try {
            const params = new URLSearchParams({
                timeRange,
                date,
                startDate,
                endDate,
                limit: 'all'
            });
            const { data } = await api.get(`/payments?${params.toString()}`);
            setPayments(data.payments);
            setTotalRevenue(data.totalRevenue || 0);
            setLastFetched(new Date());
        } catch (error) {
            console.error('Error fetching payments:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFilterOptions = async () => {
        try {
            const { data } = await api.get('/vendor/filters');
            setAvailableDates(data.dates || []);
        } catch (error) {
            console.error('Error fetching filter options:', error);
        }
    };

    const handleExport = async () => {
        try {
            const response = await api.get('/vendor/export', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'vendor_payments_report.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export CSV. Please try again.');
        }
    };

    useEffect(() => {
        fetchFilterOptions();
    }, []);

    useEffect(() => {
        fetchPayments();

        let debounceTimer: NodeJS.Timeout;
        const debouncedRefresh = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                fetchPayments();
            }, 600);
        };

        socket.on('newPayment', debouncedRefresh);
        socket.on('newRegistration', debouncedRefresh);

        return () => {
            clearTimeout(debounceTimer);
            socket.off('newPayment', debouncedRefresh);
            socket.off('newRegistration', debouncedRefresh);
        };
    }, [timeRange, date, startDate, endDate]);

    const table = useReactTable({
        data: payments,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col gap-8"
        >
            <header className="flex justify-between items-end relative">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Payments</h2>
                    <p className="text-[#86868b] mt-1 font-medium">Track and analyze revenue transactions</p>
                </div>

                <LastFetched timestamp={lastFetched} />

                <div className="flex gap-4">
                    <button
                        onClick={handleExport}
                        className="bg-[#007aff] text-white px-6 py-2.5 rounded-[18px] font-semibold text-sm hover:opacity-90 shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
                    >
                        <FileDown className="w-4 h-4" />
                        Export CSV
                    </button>
                    <RefreshButton
                        onRefresh={fetchPayments}
                        message="The transaction list has been successfully synchronized with the latest payment records."
                    />
                </div>
            </header>

            <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="glass-card p-6 flex flex-col justify-center min-h-[140px] lg:col-span-1">
                        <label className="text-xs font-bold uppercase tracking-widest text-[#86868b] mb-2">Total Revenue</label>
                        <span className="text-4xl font-black tracking-tight text-[#1d1d1f]">
                            ₹{totalRevenue.toLocaleString('en-IN')}
                        </span>
                    </div>
                    <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#f5f5f7]/30 p-6 rounded-2xl border border-black/5 relative z-50">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[#86868b] ml-1">Time Range</label>
                            <PremiumDropdown
                                value={timeRange}
                                onChange={setTimeRange}
                                options={[
                                    { label: 'All Time', value: 'all' },
                                    { label: 'Last 30 Days', value: 'monthly' },
                                    { label: 'Last 7 Days', value: 'weekly' },
                                    { label: 'Today', value: 'daily' },
                                    { label: 'Last Hour', value: 'hours' },
                                    { label: 'Last Minute', value: 'minute' }
                                ]}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[#86868b] ml-1">Date</label>
                            <PremiumDropdown
                                value={date}
                                onChange={setDate}
                                options={[
                                    { label: 'All Dates', value: 'all' },
                                    ...availableDates.map(d => ({ label: d, value: d }))
                                ]}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[#86868b] ml-1">From Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-white border-none rounded-xl px-4 py-2.5 text-sm font-medium shadow-sm focus:ring-2 focus:ring-[#007aff]/20 outline-none cursor-pointer"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[#86868b] ml-1">To Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-white border-none rounded-xl px-4 py-2.5 text-sm font-medium shadow-sm focus:ring-2 focus:ring-[#007aff]/20 outline-none cursor-pointer"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-[50vh]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007aff]"></div>
                </div>
            ) : (
                <div className="glass-card overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-[#fbfbfd] border-b border-[#e5e5e7]">
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map(header => (
                                        <th key={header.id} className="p-5 text-xs font-semibold text-[#86868b] tracking-wider uppercase text-nowrap">
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody className="divide-y divide-[#e5e5e7]">
                            {table.getRowModel().rows.length > 0 ? table.getRowModel().rows.map((row, idx) => (
                                <tr key={`${row.id}-${idx}`} className="hover:bg-[#f5f5f7] transition-colors">
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id} className="p-5 text-sm font-medium">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={columns.length} className="p-10 text-center text-[#86868b]">
                                        No transactions found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </motion.div>
    );
}
