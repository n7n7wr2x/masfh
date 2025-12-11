'use client'

import { useEffect, useState } from 'react'
import { Store, CheckCircle, XCircle, ExternalLink, Loader2 } from 'lucide-react'
import { useStoreStore } from '@/lib/store'
import { sallaApi } from '@/lib/api'
import toast from 'react-hot-toast'

export default function ConnectSallaPage() {
    const { currentStore } = useStoreStore()
    const [status, setStatus] = useState<{ connected: boolean; sallaStoreId?: string } | null>(null)
    const [loading, setLoading] = useState(true)
    const [connecting, setConnecting] = useState(false)

    useEffect(() => {
        if (currentStore) {
            loadStatus()
        }
    }, [currentStore])

    // Check URL for callback results
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        if (params.get('success') === 'true') {
            toast.success('تم ربط سلة بنجاح!')
            loadStatus()
            window.history.replaceState({}, '', '/dashboard/connect-salla')
        }
        if (params.get('error')) {
            toast.error(params.get('error') || 'فشل في ربط سلة')
            window.history.replaceState({}, '', '/dashboard/connect-salla')
        }
    }, [])

    const loadStatus = async () => {
        if (!currentStore) return
        setLoading(true)
        try {
            const data = await sallaApi.getStatus(currentStore.id)
            setStatus(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleConnect = async () => {
        if (!currentStore) return
        setConnecting(true)
        try {
            const { url } = await sallaApi.getConnectUrl(currentStore.id)
            window.location.href = url
        } catch (error: any) {
            toast.error(error.message || 'فشل في الاتصال')
            setConnecting(false)
        }
    }

    const handleDisconnect = async () => {
        if (!currentStore) return
        if (!confirm('هل أنت متأكد من فصل ربط سلة؟')) return

        try {
            await sallaApi.disconnect(currentStore.id)
            toast.success('تم فصل سلة بنجاح')
            setStatus({ connected: false })
        } catch (error: any) {
            toast.error(error.message || 'فشل في فصل الاتصال')
        }
    }

    if (!currentStore) {
        return (
            <div className="text-center py-20">
                <p className="text-gray-400">يرجى اختيار متجر أولاً</p>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto animate-fadeIn">
            <h1 className="text-3xl font-bold text-white mb-2">ربط متجر سلة</h1>
            <p className="text-gray-400 mb-8">اربط متجرك للحصول على إشعارات الطلبات تلقائياً</p>

            <div className="card">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
                    </div>
                ) : status?.connected ? (
                    <div className="text-center py-8">
                        <div className="w-20 h-20 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10 text-primary-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">متصل بسلة</h3>
                        <p className="text-gray-400 mb-6">معرف المتجر: {status.sallaStoreId}</p>

                        <div className="flex flex-col gap-3">
                            <a
                                href="https://s.salla.sa/apps"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-secondary inline-flex items-center justify-center gap-2"
                            >
                                إدارة التطبيقات في سلة
                                <ExternalLink className="w-4 h-4" />
                            </a>
                            <button
                                onClick={handleDisconnect}
                                className="text-red-400 hover:text-red-300 text-sm"
                            >
                                فصل الربط
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <div className="w-20 h-20 bg-gray-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Store className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">غير متصل</h3>
                        <p className="text-gray-400 mb-6">
                            اربط متجرك لاستقبال أحداث الطلبات والسلات المتروكة
                        </p>

                        <button
                            onClick={handleConnect}
                            disabled={connecting}
                            className="btn-primary inline-flex items-center gap-2"
                        >
                            {connecting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Store className="w-5 h-5" />
                                    ربط متجر سلة
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Instructions */}
            <div className="mt-8 space-y-4">
                <h3 className="text-lg font-bold text-white">خطوات الربط</h3>
                <div className="space-y-3">
                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-white text-sm font-bold">1</span>
                        </div>
                        <p className="text-gray-300">اضغط على زر "ربط متجر سلة"</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-white text-sm font-bold">2</span>
                        </div>
                        <p className="text-gray-300">سجل دخولك في سلة وأعط الصلاحيات المطلوبة</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-white text-sm font-bold">3</span>
                        </div>
                        <p className="text-gray-300">ستتم إعادتك تلقائياً بعد الربط الناجح</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
