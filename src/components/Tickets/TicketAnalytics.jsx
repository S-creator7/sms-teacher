import React, { useState, useEffect } from 'react';
import { getTeacherTicketAnalytics } from '../../Utility/ticketApi';
import { toast } from 'react-hot-toast';
import {
    FaTicketAlt,
    FaFolderOpen,
    FaExclamationTriangle,
    FaTags,
} from "react-icons/fa";
import {
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ title, value, color = 'text-[#f86730]', icon, bgColor = 'bg-orange-50' }) => (
    <div className="h-full bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all duration-200 hover:border-[#f86730]/20">
        <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {title}
            </p>
            <div className={`p-2 rounded-xl ${bgColor}`}>
                {icon && <span className={`text-sm ${color}`}>{icon}</span>}
            </div>
        </div>
        <p className={`text-2xl font-bold ${color}`}>
            {value}
        </p>
    </div>
);

const getCategoryColor = (index) => {
    const colors = [
        '#f86730',
        '#3b82f6',
        '#22c55e',
        '#8b5cf6',
        '#f59e0b',
        '#ec4899',
        '#06b6d4',
        '#f97316',
        '#6366f1',
        '#14b8a6'
    ];
    return colors[index % colors.length];
};

const getCategoryBgColor = (index) => {
    const bgColors = [
        'bg-orange-50',
        'bg-blue-50',
        'bg-green-50',
        'bg-purple-50',
        'bg-yellow-50',
        'bg-pink-50',
        'bg-cyan-50',
        'bg-orange-50',
        'bg-indigo-50',
        'bg-emerald-50'
    ];
    return bgColors[index % bgColors.length];
};

const AnalyticsChart = ({ title, data, type = 'bar', colors }) => {
    if (type === 'pie') {
        return (
            <div className="bg-white rounded-xl border border-gray-100 p-5 w-full min-w-0">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                    {title}
                </h3>
                <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                outerRadius={60}
                                innerRadius={20}
                                dataKey="count"
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                labelLine={false}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ 
                                    fontSize: '12px', 
                                    borderRadius: '10px', 
                                    border: '1px solid #f3f4f6',
                                    backgroundColor: 'white',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                    padding: '8px 12px'
                                }} 
                            />
                            <Legend
                                verticalAlign="bottom"
                                align="center"
                                iconType="circle"
                                wrapperStyle={{ 
                                    fontSize: '11px', 
                                    paddingTop: '12px',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-100 p-5 w-full min-w-0">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
                {title}
            </h3>
            <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} barSize={32}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f9fafb" vertical={false} />
                        <XAxis 
                            dataKey="status" 
                            tick={{ fontSize: 11, fill: '#9ca3af' }} 
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis 
                            tick={{ fontSize: 11, fill: '#9ca3af' }} 
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip 
                            contentStyle={{ 
                                fontSize: '12px', 
                                borderRadius: '10px', 
                                border: '1px solid #f3f4f6',
                                backgroundColor: 'white',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                padding: '8px 12px'
                            }} 
                        />
                        <Bar 
                            dataKey="count" 
                            fill="#FB923C" 
                            radius={[6, 6, 0, 0]} 
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const TicketAnalytics = () => {
    const navigate = useNavigate();
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                setLoading(true);
                const response = await getTeacherTicketAnalytics();

                if (response.status) {
                    setAnalytics(response.resources.data);
                } else {
                    setError(response.message || 'Failed to load analytics');
                    toast.error(response.message || 'Failed to load ticket analytics');
                }
            } catch (err) {
                console.error('Error fetching ticket analytics:', err);
                setError('Failed to fetch ticket analytics. Please try again later.');
                toast.error('Failed to fetch ticket analytics');
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    const COLORS = ['#f86730', '#3b82f6', '#22c55e', '#8b5cf6', '#f59e0b'];

    const handleBack = () => {
        navigate(-1);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[300px] bg-white rounded-xl">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-[#f86730] border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-3 text-sm text-gray-500">Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (error || !analytics) {
        return (
            <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-center">
                <div className="text-red-400 text-3xl mb-2">⚠️</div>
                <h3 className="text-base font-semibold text-red-700 mb-1.5">Error Loading Analytics</h3>
                <p className="text-sm text-red-600">
                    {error || 'No analytics data available'}
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-3 px-4 py-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors duration-200 text-sm font-medium"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4 p-3 md:p-4 bg-[#F8FAFC] min-h-screen">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <button
                    onClick={handleBack}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors duration-200 group"
                    title="Go Back"
                >
                    <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Ticket Analytics</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Overview of ticket statistics and trends</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                    title="Total Tickets"
                    value={analytics.total_tickets}
                    color="text-[#f86730]"
                    icon={<FaTicketAlt />}
                    bgColor="bg-orange-50"
                />

                <StatCard
                    title="Open Tickets"
                    value={analytics.by_status?.find(s => s.status === "Open")?.count || 0}
                    color="text-blue-500"
                    icon={<FaFolderOpen />}
                    bgColor="bg-blue-50"
                />

                <StatCard
                    title="High Priority"
                    value={analytics.by_priority?.find(p => p.priority === "High")?.count || 0}
                    color="text-red-500"
                    icon={<FaExclamationTriangle />}
                    bgColor="bg-red-50"
                />

                <StatCard
                    title="Categories"
                    value={analytics.by_category?.length || 0}
                    color="text-purple-500"
                    icon={<FaTags />}
                    bgColor="bg-purple-50"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {analytics.by_status?.length > 0 && (
                    <AnalyticsChart
                        title="Tickets by Status"
                        data={analytics.by_status.map(item => ({
                            ...item,
                            status: item.status
                        }))}
                        type="bar"
                    />
                )}

                {analytics.by_priority?.length > 0 && (
                    <AnalyticsChart
                        title="Tickets by Priority"
                        data={analytics.by_priority.map(item => ({
                            ...item,
                            name: item.priority
                        }))}
                        type="pie"
                        colors={COLORS}
                    />
                )}
            </div>

            {/* Categories Section */}
            {analytics.by_category?.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">
                        Tickets by Category
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {analytics.by_category.map((item, index) => {
                            const percentage = ((item.count / analytics.total_tickets) * 100);
                            const color = getCategoryColor(index);
                            const bgColor = getCategoryBgColor(index);

                            return (
                                <div
                                    key={index}
                                    className="border border-gray-100 rounded-xl p-3 hover:shadow-md hover:border-[#f86730]/20 transition-all duration-200"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center space-x-2">
                                            <div 
                                                className="w-2 h-2 rounded-full" 
                                                style={{ backgroundColor: color }}
                                            ></div>
                                            <span className="font-medium text-gray-700 text-sm truncate">
                                                {item.category_name}
                                            </span>
                                        </div>
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 ${bgColor} text-gray-600 rounded-full`}>
                                            {percentage.toFixed(0)}%
                                        </span>
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-400">Tickets</span>
                                            <span className="font-bold text-gray-700 text-sm">{item.count}</span>
                                        </div>

                                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{ 
                                                    backgroundColor: color,
                                                    width: `${Math.max(10, percentage)}%` 
                                                }}
                                            ></div>
                                        </div>

                                        <div className="text-[10px] text-gray-400">
                                            {item.count} of {analytics.total_tickets} total tickets
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TicketAnalytics;