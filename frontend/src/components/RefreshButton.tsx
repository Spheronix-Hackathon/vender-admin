"use client";
import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RefreshButtonProps {
    onRefresh: () => Promise<void>;
    message?: string;
}

const RefreshButton = ({ onRefresh, message = "Data has been successfully updated with the latest entries." }: RefreshButtonProps) => {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showPopup, setShowPopup] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await onRefresh();
            setShowPopup(true);
            setTimeout(() => setShowPopup(false), 3000);
        } catch (error) {
            console.error('Refresh failed:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="bg-[#007aff] text-white px-6 py-2.5 rounded-[18px] font-semibold text-sm hover:opacity-90 shadow-lg shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-70"
            >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>

            <AnimatePresence>
                {showPopup && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className="absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-[#e5e5e7] p-5 z-[100]"
                    >
                        <div className="flex flex-col items-center text-center space-y-3">
                            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-500">
                                <CheckCircle2 className="w-7 h-7" />
                            </div>
                            <h4 className="font-bold text-[#1d1d1f]">Update Complete</h4>
                            <p className="text-xs text-[#86868b] leading-relaxed">
                                {message}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RefreshButton;
