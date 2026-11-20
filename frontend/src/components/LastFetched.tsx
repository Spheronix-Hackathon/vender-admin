"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock } from 'lucide-react';

interface LastFetchedProps {
    timestamp: Date | null;
}

const LastFetched = ({ timestamp }: LastFetchedProps) => {
    if (!timestamp) return null;

    const timeString = timestamp.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={timestamp.getTime()}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="hidden xl:flex items-center gap-2 px-4 py-2 bg-[#f5f5f7] rounded-full border border-black/5"
            >
                <Clock className="w-3.5 h-3.5 text-[#86868b]" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#86868b]">
                    Last fetched at <span className="text-[#1d1d1f]">{timeString}</span>
                </span>
            </motion.div>
        </AnimatePresence>
    );
};

export default LastFetched;
