'use client'

import { useEffect, useState } from 'react'
import { Package, Loader2, RefreshCw, Store, Phone, Mail, Calendar, DollarSign } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { adminApi } from '@/lib/api'
import { useRouter } from 'next/navigation'

interface Order {
    id: string
    sallaOrderId: string
    customerName: string
    customerPhone: string
    customerEmail: string | null
    status: string
    total: number
    currency: string
    items: any[]
    createdAt: string
    store: {
        name: string
        sallaStoreId: string | null
    }
}

const statusColors: Record<string, string> = {
    'PENDING': 'bg-yellow-500/20 text-yellow-400',
    'CONFIRMED': 'bg-blue-500/20 text-blue-400',
    'PROCESSING': 'bg-purple-500/20 text-purple-400',
    'SHIPPED': 'bg-indigo-500/20 text-indigo-400',
    'DELIVERED': 'bg-green-500/20 text-green-400',
    'CANCELLED': 'bg-red-500/20 text-red-400',
    'REFUNDED': 'bg-gray-500/20 text-gray-400'
}

const statusLabels: Record<string, string> = {
    'PENDING': 'قيد الانتظار',
    'CONFIRMED': 'مؤكد',
    'PROCESSING': 'قيد المعالجة',
    'SHIPPED': 'تم الشحن',
    'DELIVERED': 'تم التوصيل',
    'CANCELLED': 'ملغي',
    'REFUNDED': 'مسترجع'
}

export default function AdminOrdersPage() {
    const router = useRouter()
    const { user, token } = useAuthStore()
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

    useEffect(() => {
        if (user?.role !== 'SUPER_ADMIN') {
            router.push('/dashboard')
            return
        }
        fetchOrders()
    }, [user])

    const fetchOrders = async () => {
        setLoading(true)
        try {
            const data = await adminApi.getOrders()
            setOrders(data.orders || [])
        } catch (error) {
            console.error('Failed to fetch orders:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (date: string) => {
        return new Date(date).toLocaleString('ar-SA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
            </div>
        )
    }

    return (
        <div className="animate-fadeIn">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">سجل الطلبات</h1>
                    <p className="text-gray-400">جميع الطلبات الواردة من سلة ({orders.length})</p>
                </div>
                <button
                    onClick={fetchOrders}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    تحديث
                </button>
            </div>

            {orders.length === 0 ? (
                <div className="card text-center py-16">
                    <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl text-white mb-2">لا توجد طلبات</h3>
                    <p className="text-gray-400">سيتم عرض الطلبات هنا عند وصولها من سلة</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {orders.map((order) => (
                        <div
                            key={order.id}
                            className="card hover:border-primary-500/50 cursor-pointer transition-all"
                            onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center">
                                        <Package className="w-6 h-6 text-primary-400" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-white font-bold">طلب #{order.sallaOrderId}</h3>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-gray-500/20 text-gray-400'}`}>
                                                {statusLabels[order.status] || order.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-gray-400 text-sm mt-1">
                                            <span className="flex items-center gap-1">
                                                <Store className="w-3 h-3" />
                                                {order.store.name}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {formatDate(order.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-left">
                                    <div className="text-white font-bold text-lg">
                                        {order.total} {order.currency}
                                    </div>
                                    <div className="text-gray-400 text-sm">{order.customerName}</div>
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {selectedOrder?.id === order.id && (
                                <div className="mt-4 pt-4 border-t border-white/10">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <h4 className="text-gray-400 text-sm mb-2">معلومات العميل</h4>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-white">
                                                    <Phone className="w-4 h-4 text-gray-500" />
                                                    {order.customerPhone || 'غير متوفر'}
                                                </div>
                                                {order.customerEmail && (
                                                    <div className="flex items-center gap-2 text-white">
                                                        <Mail className="w-4 h-4 text-gray-500" />
                                                        {order.customerEmail}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-gray-400 text-sm mb-2">المنتجات ({Array.isArray(order.items) ? order.items.length : 0})</h4>
                                            <div className="bg-white/5 rounded-lg p-3 max-h-32 overflow-y-auto">
                                                {Array.isArray(order.items) && order.items.length > 0 ? (
                                                    order.items.map((item: any, idx: number) => (
                                                        <div key={idx} className="text-gray-300 text-sm py-1 border-b border-white/5 last:border-0">
                                                            {item.name || item.product_name || 'منتج'} × {item.quantity || 1}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-gray-500 text-sm">لا توجد تفاصيل</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
