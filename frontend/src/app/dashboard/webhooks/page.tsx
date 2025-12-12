'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { adminApi } from '@/lib/api';

interface WebhookLog {
    id: string;
    source: string;
    event: string;
    merchantId: string | null;
    payload: any;
    processed: boolean;
    error: string | null;
    createdAt: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    pages: number;
}

export default function WebhooksPage() {
    const { token } = useAuthStore();
    const [webhooks, setWebhooks] = useState<WebhookLog[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedWebhook, setSelectedWebhook] = useState<WebhookLog | null>(null);
    const [filter, setFilter] = useState({ source: '', event: '' });

    const fetchWebhooks = async (page = 1) => {
        try {
            setLoading(true);
            const data = await adminApi.getWebhooks(page, 20, filter.source, filter.event);
            setWebhooks(data.webhooks);
            setPagination(data.pagination);
        } catch (error) {
            console.error('Error fetching webhooks:', error);
        } finally {
            setLoading(false);
        }
    };

    const clearLogs = async () => {
        if (!confirm('هل أنت متأكد من حذف جميع السجلات؟')) return;

        try {
            await adminApi.clearWebhooks();
            fetchWebhooks();
        } catch (error) {
            console.error('Error clearing logs:', error);
        }
    };

    useEffect(() => {
        if (token) fetchWebhooks();
    }, [token, filter]);

    // Auto-refresh disabled - use manual refresh button instead
    // useEffect(() => {
    //     const interval = setInterval(() => {
    //         if (token) fetchWebhooks(pagination?.page || 1);
    //     }, 5000);
    //     return () => clearInterval(interval);
    // }, [token, pagination?.page]);

    const formatDate = (date: string) => {
        return new Date(date).toLocaleString('ar-SA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const getEventColor = (event: string) => {
        if (event.includes('authorize')) return 'bg-green-500/20 text-green-400 border-green-500/30';
        if (event.includes('order')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        if (event.includes('installed')) return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
        if (event.includes('uninstalled')) return 'bg-red-500/20 text-red-400 border-red-500/30';
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">سجل الـ Webhooks</h1>
                        <p className="text-gray-400">مراقبة الأحداث الواردة من سلة</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => fetchWebhooks(pagination?.page || 1)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            تحديث
                        </button>
                        <button
                            onClick={clearLogs}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                            مسح السجلات
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white/5 backdrop-blur-lg rounded-xl p-4 mb-6 border border-white/10">
                    <div className="flex gap-4">
                        <select
                            value={filter.source}
                            onChange={(e) => setFilter({ ...filter, source: e.target.value })}
                            className="bg-slate-800 text-white px-4 py-2 rounded-lg border border-white/10 focus:border-blue-500 focus:outline-none"
                        >
                            <option value="">جميع المصادر</option>
                            <option value="salla">سلة</option>
                            <option value="whatsapp">واتساب</option>
                        </select>
                        <input
                            type="text"
                            placeholder="فلترة حسب الحدث..."
                            value={filter.event}
                            onChange={(e) => setFilter({ ...filter, event: e.target.value })}
                            className="bg-slate-800 text-white px-4 py-2 rounded-lg border border-white/10 focus:border-blue-500 focus:outline-none flex-1"
                        />
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10">
                        <div className="text-3xl font-bold text-white">{pagination?.total || 0}</div>
                        <div className="text-gray-400 text-sm">إجمالي السجلات</div>
                    </div>
                    <div className="bg-green-500/10 backdrop-blur-lg rounded-xl p-4 border border-green-500/20">
                        <div className="text-3xl font-bold text-green-400">
                            {webhooks.filter(w => w.event.includes('authorize')).length}
                        </div>
                        <div className="text-gray-400 text-sm">تفويضات</div>
                    </div>
                    <div className="bg-blue-500/10 backdrop-blur-lg rounded-xl p-4 border border-blue-500/20">
                        <div className="text-3xl font-bold text-blue-400">
                            {webhooks.filter(w => w.event.includes('order')).length}
                        </div>
                        <div className="text-gray-400 text-sm">طلبات</div>
                    </div>
                    <div className="bg-purple-500/10 backdrop-blur-lg rounded-xl p-4 border border-purple-500/20">
                        <div className="text-3xl font-bold text-purple-400">
                            {webhooks.filter(w => w.processed).length}
                        </div>
                        <div className="text-gray-400 text-sm">تمت معالجتها</div>
                    </div>
                </div>

                {/* Webhooks List */}
                <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                            <p className="text-gray-400 mt-4">جاري التحميل...</p>
                        </div>
                    ) : webhooks.length === 0 ? (
                        <div className="p-12 text-center">
                            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <p className="text-gray-400 text-lg">لا توجد سجلات حتى الآن</p>
                            <p className="text-gray-500 text-sm mt-2">ستظهر الـ Webhooks هنا عند استلامها من سلة</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {webhooks.map((webhook) => (
                                <div
                                    key={webhook.id}
                                    onClick={() => setSelectedWebhook(webhook)}
                                    className="p-4 hover:bg-white/5 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getEventColor(webhook.event)}`}>
                                                {webhook.event}
                                            </span>
                                            <span className="text-gray-400 text-sm">
                                                {webhook.source}
                                            </span>
                                            {webhook.merchantId && (
                                                <span className="text-gray-500 text-sm">
                                                    Merchant: {webhook.merchantId}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {webhook.processed && (
                                                <span className="text-green-400 text-sm flex items-center gap-1">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                    تمت المعالجة
                                                </span>
                                            )}
                                            <span className="text-gray-500 text-sm">
                                                {formatDate(webhook.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                    {webhook.error && (
                                        <div className="mt-2 text-red-400 text-sm bg-red-500/10 p-2 rounded">
                                            {webhook.error}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {pagination && pagination.pages > 1 && (
                    <div className="flex justify-center gap-2 mt-6">
                        {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                            <button
                                key={page}
                                onClick={() => fetchWebhooks(page)}
                                className={`px-4 py-2 rounded-lg transition-colors ${page === pagination.page
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                    }`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                )}

                {/* Detail Modal */}
                {selectedWebhook && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-800 rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden border border-white/10">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold text-white">تفاصيل الـ Webhook</h2>
                                    <p className="text-gray-400 text-sm">{selectedWebhook.event}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedWebhook(null)}
                                    className="text-gray-400 hover:text-white p-2"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="p-6 overflow-auto max-h-[60vh]">
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <span className="text-gray-400 text-sm">المصدر</span>
                                        <p className="text-white">{selectedWebhook.source}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 text-sm">الحدث</span>
                                        <p className="text-white">{selectedWebhook.event}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 text-sm">Merchant ID</span>
                                        <p className="text-white">{selectedWebhook.merchantId || '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 text-sm">الوقت</span>
                                        <p className="text-white">{formatDate(selectedWebhook.createdAt)}</p>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-gray-400 text-sm block mb-2">Payload</span>
                                    <pre className="bg-slate-900 p-4 rounded-lg overflow-auto text-sm text-green-400 font-mono whitespace-pre-wrap">
                                        {JSON.stringify(selectedWebhook.payload, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
