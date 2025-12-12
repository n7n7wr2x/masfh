'use client'

import { useEffect, useState } from 'react'
import { Store, CheckCircle2, XCircle, RefreshCw, Calendar, Shield } from 'lucide-react'
import { useAuthStore, useStoreStore } from '@/lib/store'
import { storesApi } from '@/lib/api'

export default function SallaSettingsPage() {
    const { token } = useAuthStore()
    const { currentStore, fetchStores } = useStoreStore()
    const [loading, setLoading] = useState(true)
    const [storeInfo, setStoreInfo] = useState<any>(null)

    useEffect(() => {
        const loadStoreData = async () => {
            await fetchStores()
        }
        loadStoreData()
    }, [])

    useEffect(() => {
        const fetchStoreDetails = async () => {
            if (currentStore?.id && token) {
                try {
                    const data = await storesApi.getOne(currentStore.id)
                    console.log('Store details:', data)
                    setStoreInfo(data)
                } catch (error) {
                    console.error('Failed to fetch store details:', error)
                    setStoreInfo(currentStore)
                } finally {
                    setLoading(false)
                }
            } else {
                setLoading(false)
            }
        }
        fetchStoreDetails()
    }, [currentStore, token])

    // Debug log
    console.log('Current Store:', currentStore)
    console.log('Store Info:', storeInfo)

    // Check connection - just need sallaStoreId to be connected
    const isConnected = !!storeInfo?.sallaStoreId
    const hasToken = !!storeInfo?.sallaAccessToken
    const tokenExpiry = storeInfo?.sallaTokenExpiresAt ? new Date(storeInfo.sallaTokenExpiresAt) : null
    const isTokenExpired = tokenExpiry ? tokenExpiry < new Date() : false

    const formatDate = (date: Date) => {
        return date.toLocaleString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <RefreshCw className="w-8 h-8 animate-spin text-primary-400" />
            </div>
        )
    }

    return (
        <div className="animate-fadeIn max-w-2xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">إعدادات سلة</h1>
                <p className="text-gray-400">حالة الربط مع متجرك في سلة</p>
            </div>

            <div className="card">
                {/* Connection Status Header */}
                <div className="flex items-center gap-4 mb-6">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isConnected ? 'bg-green-500/20' : 'bg-red-500/20'
                        }`}>
                        <Store className={`w-8 h-8 ${isConnected ? 'text-green-400' : 'text-red-400'}`} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            {isConnected ? (
                                <>
                                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                                    <span className="text-green-400 font-bold text-lg">متصل بسلة</span>
                                </>
                            ) : (
                                <>
                                    <XCircle className="w-5 h-5 text-red-400" />
                                    <span className="text-red-400 font-bold text-lg">غير متصل</span>
                                </>
                            )}
                        </div>
                        <p className="text-gray-400 text-sm mt-1">
                            {isConnected ? 'متجرك مرتبط تلقائياً عبر سلة' : 'لم يتم ربط المتجر بعد'}
                        </p>
                    </div>
                </div>

                {/* Store Details */}
                {isConnected && (
                    <div className="space-y-4 pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between py-3 px-4 bg-white/5 rounded-lg">
                            <span className="text-gray-400">اسم المتجر</span>
                            <span className="text-white font-medium">{storeInfo?.name || 'غير محدد'}</span>
                        </div>

                        <div className="flex items-center justify-between py-3 px-4 bg-white/5 rounded-lg">
                            <span className="text-gray-400">معرف المتجر في سلة</span>
                            <span className="text-white font-mono text-sm">{storeInfo?.sallaStoreId}</span>
                        </div>

                        <div className="flex items-center justify-between py-3 px-4 bg-white/5 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <span className="text-gray-400">صلاحية التوكن</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {isTokenExpired ? (
                                    <span className="text-red-400 text-sm">منتهي</span>
                                ) : tokenExpiry ? (
                                    <span className="text-green-400 text-sm">{formatDate(tokenExpiry)}</span>
                                ) : (
                                    <span className="text-gray-500 text-sm">غير محدد</span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between py-3 px-4 bg-white/5 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-gray-500" />
                                <span className="text-gray-400">حالة التوكن</span>
                            </div>
                            {storeInfo?.sallaAccessToken ? (
                                <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-sm">نشط</span>
                            ) : (
                                <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-sm">غير نشط</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Not Connected Message */}
                {!isConnected && (
                    <div className="text-center py-8">
                        <p className="text-gray-400 mb-4">
                            للربط مع سلة، يجب الاشتراك في التطبيق من متجر تطبيقات سلة
                        </p>
                        <a
                            href="https://apps.salla.sa"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary inline-flex items-center gap-2"
                        >
                            <Store className="w-4 h-4" />
                            زيارة متجر تطبيقات سلة
                        </a>
                    </div>
                )}
            </div>
        </div>
    )
}
