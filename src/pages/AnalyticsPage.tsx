// src/pages/AnalyticsPage.tsx

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, onSnapshot, orderBy, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { ArrowLeft, BarChart2, MessageSquare, AtSign, Sparkles } from 'lucide-react';
import { Account } from '../types';

ChartJS.register(ArcElement, Title, Tooltip, Legend);

interface MonthlyAnalytics {
    id: string;
    total_dms?: number;
    automated_dms?: number;
    total_comments?: number;
    automated_comments?: number;
    total_story_replies?: number;
    automated_story_replies?: number;
}

const AnalyticsChartCard: React.FC<{ title: string; icon: React.ReactNode; chartData: any; total: number; automated: number }> = ({ title, icon, chartData, total, automated }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
        <div className="flex items-center mb-4">
            {icon}
            <h2 className="text-xl font-bold text-slate-800 ml-3">{title}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="h-48 w-48 mx-auto">
                <Doughnut data={chartData} options={{ maintainAspectRatio: true, responsive: true }} />
            </div>
            <div className="text-center md:text-left">
                <p className="text-4xl font-extrabold text-slate-900">{automated.toLocaleString()}</p>
                <p className="text-slate-500">Automated Replies</p>
                <p className="text-lg font-semibold text-slate-700 mt-4">
                    out of {total.toLocaleString()} total interactions
                </p>
            </div>
        </div>
    </div>
);


const AnalyticsPage: React.FC = () => {
    const { accountId } = useParams<{ accountId: string }>();
    const [account, setAccount] = useState<Account | null>(null);
    const [analytics, setAnalytics] = useState<MonthlyAnalytics[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState<string>('');

    useEffect(() => {
        if (!accountId) return;

        const accountDocRef = doc(db, 'clients', accountId);
        const unsubscribeAccount = onSnapshot(accountDocRef, (doc) => {
            setAccount(doc.data() as Account);
        });

        const analyticsQuery = query(collection(db, `analytics/${accountId}/monthly`), orderBy('__name__', 'desc'));
        const unsubscribeAnalytics = onSnapshot(analyticsQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MonthlyAnalytics));
            setAnalytics(data);
            if (data.length > 0 && !selectedMonth) {
                setSelectedMonth(data[0].id);
            }
            setLoading(false);
        });

        return () => {
            unsubscribeAccount();
            unsubscribeAnalytics();
        };
    }, [accountId, selectedMonth]);

    // --- THIS IS THE CORRECTED LINE ---
    // Provide a default object that matches the MonthlyAnalytics type
    const selectedMonthData: MonthlyAnalytics = analytics.find(a => a.id === selectedMonth) || { id: selectedMonth };

    const dmData = {
        labels: ['Automated DMs', 'Manual DMs'],
        datasets: [{
            data: [selectedMonthData.automated_dms || 0, (selectedMonthData.total_dms || 0) - (selectedMonthData.automated_dms || 0)],
            backgroundColor: ['#3B82F6', '#BFDBFE'],
            borderColor: ['#FFFFFF'],
            borderWidth: 2,
        }]
    };

    const commentData = {
        labels: ['Automated Comments', 'Manual Comments'],
        datasets: [{
            data: [selectedMonthData.automated_comments || 0, (selectedMonthData.total_comments || 0) - (selectedMonthData.automated_comments || 0)],
            backgroundColor: ['#EF4444', '#FECACA'],
            borderColor: ['#FFFFFF'],
            borderWidth: 2,
        }]
    };

    const storyData = {
        labels: ['Automated Story Replies', 'Manual Story Replies'],
        datasets: [{
            data: [selectedMonthData.automated_story_replies || 0, (selectedMonthData.total_story_replies || 0) - (selectedMonthData.automated_story_replies || 0)],
            backgroundColor: ['#F59E0B', '#FDE68A'],
            borderColor: ['#FFFFFF'],
            borderWidth: 2,
        }]
    };


    if (loading) {
        return <div className="p-8 text-center">Loading analytics...</div>;
    }

    return (
        <div className="bg-slate-50 min-h-screen">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="mb-8">
                    <Link to={`/dashboard/${accountId}`} className="inline-flex items-center text-sm font-semibold text-brand hover:text-brand-700 transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Dashboard
                    </Link>
                </div>

                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div className="flex items-center">
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-brand-50 text-brand-600">
                            <BarChart2 className="w-6 h-6" />
                        </div>
                        <div className="ml-4">
                            <h1 className="text-3xl font-bold text-slate-900">Automation Analytics</h1>
                            <p className="text-slate-500">for {account?.clientName}</p>
                        </div>
                    </div>
                    <div>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-white border border-slate-300 rounded-lg px-4 py-2 text-slate-700 font-semibold focus:ring-2 focus:ring-brand"
                        >
                            {analytics.map(month => (
                                <option key={month.id} value={month.id}>{month.id}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <AnalyticsChartCard 
                        title="Direct Messages"
                        icon={<MessageSquare className="text-blue-500"/>}
                        chartData={dmData}
                        automated={selectedMonthData.automated_dms || 0}
                        total={selectedMonthData.total_dms || 0}
                    />
                    <AnalyticsChartCard 
                        title="Comments"
                        icon={<AtSign className="text-red-500"/>}
                        chartData={commentData}
                        automated={selectedMonthData.automated_comments || 0}
                        total={selectedMonthData.total_comments || 0}
                    />
                    <AnalyticsChartCard 
                        title="Story Replies"
                        icon={<Sparkles className="text-amber-500"/>}
                        chartData={storyData}
                        automated={selectedMonthData.automated_story_replies || 0}
                        total={selectedMonthData.total_story_replies || 0}
                    />
                </div>
            </div>
        </div>
    );
};

export default AnalyticsPage;