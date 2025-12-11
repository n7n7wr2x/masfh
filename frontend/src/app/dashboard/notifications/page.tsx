'use client'

import { useEffect, useState } from 'react'
import { Bell, CheckCircle, XCircle, Clock, Loader2, Filter } from 'lucide-react'
import { useStoreStore } from '@/lib/store'
import { whatsappApi } from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'

interface Notification {
    id: string
    phone: string
    type: string
    status: string
    createdAt: string
    sentAt: string | null
    template?: { name: string }
}

export default function NotificationsPage() {
    const { currentStore } = useStoreStore()
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 })
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('')

    useEffect(() => {
        if (currentStore) {
            loadNotifications()
        }
    }, [currentStore, pagination.page, filter])

    const loadNotifications = async () => {
        if (!currentStore) return
        setLoading(true)
        try {
            const data = await whatsappApi.getNotifications(currentStore.id, pagination.page, filter || undefined)
            setNotifications(data.notifications || [])
            setPagination(prev => ({ ...prev, ...data.pagination }))
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'SENT':
            case 'DELIVERED':
            case 'READ':
                return <CheckCircle className="w-5 h-5 text-green-400" />
            case 'FAILED':
                return <XCircle className="w-5 h-5 text-red-400" />
            default:
                return <Clock className="w-5 h-5 text-yellow-400" />
        }
    }

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            PENDING: 'قيد الانتظار',
            QUEUED: 'في الطابور',
            SENT: 'تم الإرسال',
            DELIVERED: 'تم التوصيل',
            READ: 'تمت القراءة',
            FAILED: 'فشل'
        }
        return labels[status] || status
    }

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            ORDER_UPDATE: 'تحديث طلب',
            ABANDONED_CART: 'سلة متروكة',
            CAMPAIGN: 'حملة',
            CUSTOM: 'مخصص'
        }
        return labels[type] || type
    }

    if (!currentStore) {
        return <div className="text-center py-20 text-gray-400">يرجى اختيار متجر</div>
    }

    return (
        <div className="animate-fadeIn">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">سجل الإشعارات</h1>
                    <p className="text-gray-400">عرض جميع الرسائل المرسلة عبر واتساب</p>
                </div>

                <div className="flex items-center gap-3">
                    <Filter className="w-5 h-5 text-gray-400" />
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="input w-48"
                    >
                        <option value="">جميع الأنواع</option>
                        <option value="ORDER_UPDATE">تحديثات الطلبات</option>
                        <option value="ABANDONED_CART">السلات المتروكة</option>
                        <option value="CAMPAIGN">الحملات</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
                </div>
            ) : notifications.length === 0 ? (
                <div className="card text-center py-16">
                    <Bell className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">لا توجد إشعارات</h3>
                    <p className="text-gray-400">لم يتم إرسال أي رسائل بعد</p>
                </div>
            ) : (
                <>
                    <div className="card overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="table-header text-right py-4 px-6">الهاتف</th>
                                    <th className="table-header text-right py-4 px-6">النوع</th>
                                    <th className="table-header text-right py-4 px-6">القالب</th>
                                    <th className="table-header text-right py-4 px-6">الحالة</th>
                                    <th className="table-header text-right py-4 px-6">التاريخ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {notifications.map((notification) => (
                                    <tr key={notification.id} className="table-row">
                                        <td className="table-cell font-mono text-sm">{notification.phone}</td>
                                        <td className="table-cell">
                                            <span className="badge badge-info">{getTypeLabel(notification.type)}</span>
                                        </td>
                                        <td className="table-cell">{notification.template?.name || '-'}</td>
                                        <td className="table-cell">
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(notification.status)}
                                                <span>{getStatusLabel(notification.status)}</span>
                                            </div>
                                        </td>
                                        <td className="table-cell text-sm">
                                            {formatDistanceToNow(new Date(notification.createdAt), {
                                                addSuffix: true,
                                                locale: ar
                                            })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-6">
                            <button
                                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                                disabled={pagination.page === 1}
                                className="btn-secondary px-4 py-2 disabled:opacity-50"
                            >
                                السابق
                            </button>
                            <span className="text-gray-400">
                                صفحة {pagination.page} من {pagination.pages}
                            </span>
                            <button
                                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                                disabled={pagination.page === pagination.pages}
                                className="btn-secondary px-4 py-2 disabled:opacity-50"
                            >
                                التالي
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
