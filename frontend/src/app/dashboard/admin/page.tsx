'use client'

import { useEffect, useState } from 'react'
import { Users, Store, Bell, Package, TrendingUp, Loader2 } from 'lucide-react'
import { adminApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'

interface DashboardStats {
    stats: {
        totalUsers: number
        totalStores: number
        totalOrders: number
        totalNotifications: number
    }
    recentStores: Array<{
        id: string
        name: string
        createdAt: string
        user: { name: string; email: string }
    }>
    recentUsers: Array<{
        id: string
        name: string
        email: string
        role: string
        createdAt: string
    }>
}

export default function AdminDashboardPage() {
    const router = useRouter()
    const { user } = useAuthStore()
    const [data, setData] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (user?.role !== 'SUPER_ADMIN') {
            router.push('/dashboard')
            return
        }
        loadData()
    }, [user])

    const loadData = async () => {
        try {
            const dashboardData = await adminApi.getDashboard()
            setData(dashboardData)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
            </div>
        )
    }

    const stats = [
        { label: 'إجمالي المستخدمين', value: data?.stats.totalUsers || 0, icon: Users, color: 'primary' },
        { label: 'إجمالي المتاجر', value: data?.stats.totalStores || 0, icon: Store, color: 'blue' },
        { label: 'إجمالي الطلبات', value: data?.stats.totalOrders || 0, icon: Package, color: 'yellow' },
        { label: 'إجمالي الإشعارات', value: data?.stats.totalNotifications || 0, icon: Bell, color: 'purple' },
    ]

    return (
        <div className="animate-fadeIn">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">لوحة تحكم الأدمن</h1>
                <p className="text-gray-400">نظرة عامة على النظام</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, index) => (
                    <div key={index} className="card">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
                                <p className="text-3xl font-bold text-white">{stat.value}</p>
                            </div>
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${stat.color}-500/20`}>
                                <stat.icon className={`w-6 h-6 text-${stat.color}-400`} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Recent Users */}
                <div className="card">
                    <h3 className="text-lg font-bold text-white mb-4">آخر المستخدمين</h3>
                    <div className="space-y-3">
                        {data?.recentUsers.map((user) => (
                            <div key={user.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary-500/20 rounded-full flex items-center justify-center">
                                        <span className="text-primary-400 font-bold">{user.name.charAt(0)}</span>
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">{user.name}</p>
                                        <p className="text-gray-400 text-sm">{user.email}</p>
                                    </div>
                                </div>
                                <span className="badge badge-info">{user.role}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Stores */}
                <div className="card">
                    <h3 className="text-lg font-bold text-white mb-4">آخر المتاجر</h3>
                    <div className="space-y-3">
                        {data?.recentStores.map((store) => (
                            <div key={store.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                                        <Store className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">{store.name}</p>
                                        <p className="text-gray-400 text-sm">{store.user.name}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
