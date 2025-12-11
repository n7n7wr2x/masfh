'use client'

import { useEffect, useState } from 'react'
import {
    ShoppingCart,
    Bell,
    Megaphone,
    TrendingUp,
    ArrowUpRight,
    Package,
    CheckCircle,
    XCircle
} from 'lucide-react'
import { useStoreStore } from '@/lib/store'
import { storesApi, whatsappApi } from '@/lib/api'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts'

interface Stats {
    orders: number
    abandonedCarts: number
    notifications: number
    campaigns: number
}

interface NotificationStats {
    total: number
    sent: number
    delivered: number
    read: number
    failed: number
    deliveryRate: string
    readRate: string
}

export default function DashboardPage() {
    const { currentStore } = useStoreStore()
    const [stats, setStats] = useState<Stats | null>(null)
    const [notificationStats, setNotificationStats] = useState<NotificationStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (currentStore) {
            loadStats()
        }
    }, [currentStore])

    const loadStats = async () => {
        if (!currentStore) return

        setLoading(true)
        try {
            const [storeStats, notifStats] = await Promise.all([
                storesApi.getStats(currentStore.id, '7d'),
                whatsappApi.getNotifications(currentStore.id, 1).catch(() => null)
            ])

            setStats(storeStats)
            if (notifStats) {
                // Calculate stats from notifications
                const notifications = notifStats.notifications || []
                const total = notifStats.pagination?.total || 0
                const sent = notifications.filter((n: any) => n.status === 'SENT').length
                const delivered = notifications.filter((n: any) => n.status === 'DELIVERED').length
                const read = notifications.filter((n: any) => n.status === 'READ').length
                const failed = notifications.filter((n: any) => n.status === 'FAILED').length

                setNotificationStats({
                    total,
                    sent,
                    delivered,
                    read,
                    failed,
                    deliveryRate: total > 0 ? ((delivered / total) * 100).toFixed(1) : '0',
                    readRate: delivered > 0 ? ((read / delivered) * 100).toFixed(1) : '0'
                })
            }
        } catch (error) {
            console.error('Error loading stats:', error)
        } finally {
            setLoading(false)
        }
    }

    // Chart Data State
    const [chartData, setChartData] = useState([
        { name: 'السبت', notifications: 0, orders: 0 },
        { name: 'الأحد', notifications: 0, orders: 0 },
        { name: 'الاثنين', notifications: 0, orders: 0 },
        { name: 'الثلاثاء', notifications: 0, orders: 0 },
        { name: 'الأربعاء', notifications: 0, orders: 0 },
        { name: 'الخميس', notifications: 0, orders: 0 },
        { name: 'الجمعة', notifications: 0, orders: 0 },
    ])

    const statCards = [
        {
            title: 'الطلبات',
            value: stats?.orders || 0,
            icon: Package,
            color: 'primary',
            change: '+12%'
        },
        {
            title: 'السلات المتروكة',
            value: stats?.abandonedCarts || 0,
            icon: ShoppingCart,
            color: 'yellow',
            change: '-5%'
        },
        {
            title: 'الإشعارات المرسلة',
            value: stats?.notifications || 0,
            icon: Bell,
            color: 'blue',
            change: '+23%'
        },
        {
            title: 'الحملات النشطة',
            value: stats?.campaigns || 0,
            icon: Megaphone,
            color: 'purple',
            change: '+2'
        }
    ]

    const [isCreateStoreOpen, setIsCreateStoreOpen] = useState(false)
    const [newStoreName, setNewStoreName] = useState('')
    const [isCreating, setIsCreating] = useState(false)
    const { createStore } = useStoreStore()
    const { toast } = require('react-hot-toast')

    const handleCreateStore = async () => {
        if (!newStoreName.trim()) return

        try {
            setIsCreating(true)
            await createStore(newStoreName)
            setNewStoreName('')
            setIsCreateStoreOpen(false)
            toast.success('تم إنشاء المتجر بنجاح')
        } catch (error) {
            toast.error('فشل إنشاء المتجر')
        } finally {
            setIsCreating(false)
        }
    }

    if (!currentStore) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-white mb-4">مرحباً بك!</h2>
                <p className="text-gray-400 mb-8">يرجى إنشاء متجر للبدء</p>
                <button
                    onClick={() => setIsCreateStoreOpen(true)}
                    className="btn-primary"
                >
                    إنشاء متجر جديد
                </button>

                {/* Create Store Modal */}
                {isCreateStoreOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-md mx-4">
                            <h3 className="text-xl font-bold text-white mb-4">إنشاء متجر جديد</h3>
                            <input
                                type="text"
                                value={newStoreName}
                                onChange={(e) => setNewStoreName(e.target.value)}
                                placeholder="اسم المتجر (مثلاً: متجر الملابس)"
                                className="w-full bg-slate-800 border-slate-700 text-white rounded-lg px-4 py-2 mb-4 focus:ring-2 focus:ring-primary-500"
                            />
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setIsCreateStoreOpen(false)}
                                    className="px-4 py-2 text-gray-400 hover:text-white"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={handleCreateStore}
                                    disabled={!newStoreName.trim() || isCreating}
                                    className="btn-primary disabled:opacity-50"
                                >
                                    {isCreating ? 'جاري الإنشاء...' : 'إنشاء'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">مرحباً 👋</h1>
                <p className="text-gray-400">إليك نظرة عامة على أداء متجرك</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => (
                    <div key={index} className="card group">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-gray-400 text-sm mb-1">{stat.title}</p>
                                <p className="text-3xl font-bold text-white">
                                    {loading ? '-' : stat.value}
                                </p>
                            </div>
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${stat.color}-500/20`}>
                                <stat.icon className={`w-6 h-6 text-${stat.color}-400`} />
                            </div>
                        </div>
                        <div className="flex items-center gap-1 mt-4 text-sm">
                            <TrendingUp className="w-4 h-4 text-primary-400" />
                            <span className="text-primary-400">{stat.change}</span>
                            <span className="text-gray-500">من الأسبوع الماضي</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart */}
                <div className="lg:col-span-2 card">
                    <h3 className="text-lg font-bold text-white mb-6">نشاط الأسبوع</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorNotifications" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="name" stroke="#64748b" />
                                <YAxis stroke="#64748b" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1e293b',
                                        border: '1px solid #334155',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="notifications"
                                    stroke="#22c55e"
                                    fillOpacity={1}
                                    fill="url(#colorNotifications)"
                                    name="الإشعارات"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="orders"
                                    stroke="#3b82f6"
                                    fillOpacity={1}
                                    fill="url(#colorOrders)"
                                    name="الطلبات"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Delivery Stats */}
                <div className="card">
                    <h3 className="text-lg font-bold text-white mb-6">إحصائيات التوصيل</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 text-primary-400" />
                                <span className="text-gray-300">معدل التوصيل</span>
                            </div>
                            <span className="text-2xl font-bold text-primary-400">
                                {notificationStats?.deliveryRate || '0'}%
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                            <div className="flex items-center gap-3">
                                <Bell className="w-5 h-5 text-blue-400" />
                                <span className="text-gray-300">معدل القراءة</span>
                            </div>
                            <span className="text-2xl font-bold text-blue-400">
                                {notificationStats?.readRate || '0'}%
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                            <div className="flex items-center gap-3">
                                <XCircle className="w-5 h-5 text-red-400" />
                                <span className="text-gray-300">الفاشلة</span>
                            </div>
                            <span className="text-2xl font-bold text-red-400">
                                {notificationStats?.failed || 0}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="card">
                <h3 className="text-lg font-bold text-white mb-4">إجراءات سريعة</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button className="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-right group">
                        <Megaphone className="w-8 h-8 text-primary-400 mb-2 group-hover:scale-110 transition-transform" />
                        <p className="text-white font-medium">حملة جديدة</p>
                        <p className="text-gray-500 text-sm">إنشاء حملة تسويقية</p>
                    </button>
                    <button className="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-right group">
                        <Bell className="w-8 h-8 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                        <p className="text-white font-medium">إرسال إشعار</p>
                        <p className="text-gray-500 text-sm">رسالة فورية</p>
                    </button>
                    <button className="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-right group">
                        <ShoppingCart className="w-8 h-8 text-yellow-400 mb-2 group-hover:scale-110 transition-transform" />
                        <p className="text-white font-medium">السلات المتروكة</p>
                        <p className="text-gray-500 text-sm">إرسال تذكيرات</p>
                    </button>
                    <button className="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-right group">
                        <ArrowUpRight className="w-8 h-8 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                        <p className="text-white font-medium">التقارير</p>
                        <p className="text-gray-500 text-sm">عرض الإحصائيات</p>
                    </button>
                </div>
            </div>
        </div>
    )
}
