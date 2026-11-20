"use client";
import React from 'react';
import {
    AreaChart, Area,
    LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface ChartProps {
    data: any[];
    title: string;
    type?: 'area' | 'line';
    dataKey?: string;
    color?: string;
    className?: string; // Allow parent styling
}

const AnalyticsChart: React.FC<ChartProps> = ({
    data,
    title,
    type = 'area',
    dataKey = 'count',
    color = '#007aff',
    className = ""
}) => {
    const isLine = type === 'line';
    const ChartComponent = isLine ? LineChart : AreaChart;

    return (
        <div className={`h-full w-full ${className}`}>
            {title && <h3 className="text-xl font-semibold mb-6">{title}</h3>}
            <ResponsiveContainer width="100%" height={title ? "85%" : "100%"}>
                <ChartComponent data={data}>
                    {!isLine && (
                        <defs>
                            <linearGradient id={`color-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.1} />
                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                    )}
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e7" />
                    <XAxis
                        dataKey="_id"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#86868b', fontSize: 10 }}
                        dy={10}
                        interval="preserveStartEnd"
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#86868b', fontSize: 12 }}
                        tickFormatter={(value) => dataKey === 'amount' ? `₹${value}` : value}
                    />
                    <Tooltip
                        contentStyle={{
                            borderRadius: '12px',
                            border: '1px solid rgba(0,0,0,0.1)',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                            backdropFilter: 'blur(10px)',
                            background: 'rgba(255,255,255,0.8)'
                        }}
                        formatter={(value) => dataKey === 'amount' ? [`₹${value}`, 'Revenue'] : [value, 'Count']}
                    />
                    {isLine ? (
                        <Line
                            type="monotone"
                            dataKey={dataKey}
                            stroke={color}
                            strokeWidth={3}
                            dot={{ r: 4, fill: color }}
                            activeDot={{ r: 6 }}
                            animationDuration={1500}
                        />
                    ) : (
                        <Area
                            type="monotone"
                            dataKey={dataKey}
                            stroke={color}
                            strokeWidth={3}
                            fillOpacity={1}
                            fill={`url(#color-${dataKey})`}
                            animationDuration={1500}
                        />
                    )}
                </ChartComponent>
            </ResponsiveContainer>
        </div>
    );
};

export default AnalyticsChart;
