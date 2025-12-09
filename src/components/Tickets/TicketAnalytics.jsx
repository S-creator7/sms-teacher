import React, { useState, useEffect } from 'react';
import { getTeacherTicketAnalytics } from '../../Utility/ticketApi';
import { toast } from 'react-toastify';
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

const StatCard = ({ title, value, color = 'text-blue-600', icon }) => (
    <div className="h-full bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-shadow duration-200">
        <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-500">
                {title}
            </p>
            {icon && <span className="text-gray-400">{icon}</span>}
        </div>
        <p className={`text-3xl font-bold ${color}`}>
            {value}
        </p>
    </div>
);
const getCategoryColor = (index) => {
    const colors = [
        'bg-blue-500',
        'bg-green-500',
        'bg-purple-500',
        'bg-yellow-500',
        'bg-pink-500',
        'bg-indigo-500',
        'bg-teal-500',
        'bg-orange-500',
        'bg-cyan-500',
        'bg-rose-500'
    ];
    return colors[index % colors.length];
};

const AnalyticsChart = ({ title, data, type = 'bar', colors }) => {
    if (type === 'pie') {
        return (
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-6">
                    {title}
                </h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="count"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">
                {title}
            </h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="status" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const TicketAnalytics = () => {
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

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (error || !analytics) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <div className="text-red-500 text-4xl mb-3">⚠️</div>
                <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Analytics</h3>
                <p className="text-red-600">
                    {error || 'No analytics data available'}
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors duration-200"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                    Ticket Analytics
                </h2>
                <div className="text-sm text-gray-500 mt-2 md:mt-0">
                    Last updated: {new Date().toLocaleDateString()}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                    title="Total Tickets"
                    value={analytics.total_tickets}
                    color="text-blue-600"
                    icon="📊"
                />
                <StatCard
                    title="Open Tickets"
                    value={analytics.by_status?.find(s => s.status === 'Open')?.count || 0}
                    color="text-green-600"
                    icon="🔓"
                />
                <StatCard
                    title="High Priority"
                    value={analytics.by_priority?.find(p => p.priority === 'High')?.count || 0}
                    color="text-red-600"
                    icon="🚨"
                />
                <StatCard
                    title="Categories"
                    value={analytics.by_category?.length || 0}
                    color="text-purple-600"
                    icon="🏷️"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {analytics.by_status?.length > 0 && (
                    <AnalyticsChart
                        title="Tickets by Status"
                        data={analytics.by_status.map(item => ({
                            ...item,
                            name: item.status
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

            {analytics.by_category?.length > 0 && (
                <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">
                        Tickets by Category
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {analytics.by_category.map((item, index) => {
                            const percentage = ((item.count / analytics.total_tickets) * 100);

                            return (
                                <div
                                    key={index}
                                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center space-x-2">
                                            <div className={`w-2 h-2 rounded-full ${getCategoryColor(index)}`}></div>
                                            <span className="font-medium text-gray-800 truncate">
                                                {item.category_name}
                                            </span>
                                        </div>
                                        <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                            {percentage.toFixed(0)}%
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Tickets</span>
                                            <span className="font-bold text-gray-900">{item.count}</span>
                                        </div>

                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${getCategoryColor(index)}`}
                                                style={{ width: `${Math.max(10, percentage)}%` }}
                                            ></div>
                                        </div>

                                        <div className="text-xs text-gray-500">
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