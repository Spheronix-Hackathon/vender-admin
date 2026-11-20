"use client";
import React from 'react';
import Link from 'next/link';

interface KPICardProps {
    label: string;
    value: string | number;
    trend?: string;
    subtitle?: string;
    color?: string;
    href?: string;
}

const KPICard: React.FC<KPICardProps> = ({ label, value, trend, subtitle, color = "var(--apple-blue)", href }) => {
    const cardContent = (
        <div className={`glass-card kpi-card h-full flex flex-col justify-between ${href ? 'cursor-pointer hover:scale-[1.02] transition-transform duration-300 active:scale-95' : ''}`}>
            <div>
                <div className="kpi-label mb-2">{label}</div>
                <div className="kpi-value" style={{ color: color }}>{value}</div>
            </div>
            {trend && (
                <span className="text-xs font-semibold text-[#34c759] mt-2">
                    {trend} registration growth
                </span>
            )}
            {subtitle && (
                <span className="text-xs font-medium text-[#86868b] mt-2">
                    {subtitle}
                </span>
            )}
        </div>
    );

    if (href) {
        return (
            <Link href={href} className="block w-full h-full">
                {cardContent}
            </Link>
        );
    }

    return cardContent;
};

export default KPICard;
