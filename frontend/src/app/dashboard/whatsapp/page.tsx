'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, CheckCircle2, XCircle, Loader2, Save, ExternalLink, Eye, EyeOff, Send, Unplug } from 'lucide-react'
import { useAuthStore, useStoreStore } from '@/lib/store'
import { whatsappApi } from '@/lib/api'

export default function WhatsAppSettingsPage() {
    const { token } = useAuthStore()
    const { currentStore, fetchStores } = useStoreStore()

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [testing, setTesting] = useState(false)
    const [showToken, setShowToken] = useState(false)
    const [testPhone, setTestPhone] = useState('')
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

    const [formData, setFormData] = useState({
        phoneNumberId: '',
        businessAccountId: '',
        accessToken: ''
    })

    const [status, setStatus] = useState({
        connected: false,
        phoneId: '',
        businessId: ''
    })

    useEffect(() => {
        fetchStores()
    }, [])

    useEffect(() => {
        if (currentStore?.id) {
            fetchStatus()
        }
    }, [currentStore])

    const fetchStatus = async () => {
        if (!currentStore?.id) return
        try {
            const data = await whatsappApi.getStatus(currentStore.id)
            setStatus(data)

            if (data.connected) {
                setFormData({
                    phoneNumberId: data.phoneId || '',
                    businessAccountId: data.businessId || '',
                    accessToken: '••••••••••••••••' // Don't show actual token
                })
            }
        } catch (error) {
            console.error('Failed to fetch status:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentStore?.id) return

        setSaving(true)
        setTestResult(null)

        try {
            await whatsappApi.connect(currentStore.id, formData)

            setTestResult({ success: true, message: 'تم ربط واتساب بنجاح!' })
            fetchStatus()
        } catch (error) {
            setTestResult({ success: false, message: 'حدث خطأ في الاتصال' })
        } finally {
            setSaving(false)
        }
    }

    const handleDisconnect = async () => {
        if (!confirm('هل تريد فصل واتساب؟ سيتوقف إرسال الإشعارات.')) return
        if (!currentStore?.id) return

        setSaving(true)
        try {
            await whatsappApi.disconnect(currentStore.id)
            setFormData({ phoneNumberId: '', businessAccountId: '', accessToken: '' })
            fetchStatus()
        } catch (error) {
            console.error('Failed to disconnect:', error)
        } finally {
            setSaving(false)
        }
    }

    const handleTestMessage = async () => {
        if (!testPhone) {
            setTestResult({ success: false, message: 'أدخل رقم الهاتف للاختبار' })
            return
        }
        if (!currentStore?.id) return

        setTesting(true)
        setTestResult(null)

        try {
            await whatsappApi.sendTest(currentStore.id, testPhone, 'hello_world')
            setTestResult({ success: true, message: 'تم إرسال رسالة الاختبار!' })
        } catch (error) {
            setTestResult({ success: false, message: 'حدث خطأ في الإرسال' })
        } finally {
            setTesting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
            </div>
        )
    }

    return (
        <div className="animate-fadeIn max-w-3xl">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">إعدادات واتساب</h1>
                <p className="text-gray-400">اربط حساب WhatsApp Business لإرسال الإشعارات للعملاء</p>
            </div>

            {/* Connection Status */}
            <div className="card mb-6">
                <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${status.connected ? 'bg-green-500/20' : 'bg-gray-500/20'
                        }`}>
                        <MessageCircle className={`w-8 h-8 ${status.connected ? 'text-green-400' : 'text-gray-400'
                            }`} />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            {status.connected ? (
                                <>
                                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                                    <span className="text-green-400 font-bold text-lg">متصل بواتساب</span>
                                </>
                            ) : (
                                <>
                                    <XCircle className="w-5 h-5 text-gray-400" />
                                    <span className="text-gray-400 font-bold text-lg">غير متصل</span>
                                </>
                            )}
                        </div>
                        <p className="text-gray-500 text-sm mt-1">
                            {status.connected
                                ? `Phone ID: ${status.phoneId}`
                                : 'اربط حسابك لبدء إرسال الإشعارات'
                            }
                        </p>
                    </div>
                    {status.connected && (
                        <button
                            onClick={handleDisconnect}
                            disabled={saving}
                            className="btn-secondary flex items-center gap-2 text-red-400 border-red-400/30 hover:bg-red-500/10"
                        >
                            <Unplug className="w-4 h-4" />
                            فصل
                        </button>
                    )}
                </div>
            </div>

            {/* Setup Guide */}
            {!status.connected && (
                <div className="card mb-6 bg-blue-500/10 border border-blue-500/30">
                    <h3 className="text-blue-400 font-semibold mb-3">📋 خطوات الربط:</h3>
                    <ol className="space-y-2 text-gray-300 text-sm">
                        <li>1. اذهب لـ <a href="https://developers.facebook.com" target="_blank" className="text-blue-400 hover:underline">Meta Developers</a></li>
                        <li>2. أنشئ تطبيق جديد واختر "Business"</li>
                        <li>3. أضف منتج "WhatsApp" للتطبيق</li>
                        <li>4. اربط رقم واتساب الخاص بك</li>
                        <li>5. انسخ البيانات المطلوبة أدناه</li>
                    </ol>
                    <a
                        href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                        target="_blank"
                        className="inline-flex items-center gap-2 text-blue-400 text-sm mt-4 hover:underline"
                    >
                        <ExternalLink className="w-4 h-4" />
                        دليل الإعداد الكامل
                    </a>
                </div>
            )}

            {/* Connection Form */}
            <form onSubmit={handleConnect} className="card mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">بيانات الاتصال</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-gray-300 text-sm mb-2">Phone Number ID</label>
                        <input
                            type="text"
                            value={formData.phoneNumberId}
                            onChange={(e) => setFormData({ ...formData, phoneNumberId: e.target.value })}
                            className="input w-full"
                            placeholder="مثال: 123456789012345"
                            required
                        />
                        <p className="text-gray-500 text-xs mt-1">
                            تجده في: WhatsApp → API Setup → Phone number ID
                        </p>
                    </div>

                    <div>
                        <label className="block text-gray-300 text-sm mb-2">WhatsApp Business Account ID</label>
                        <input
                            type="text"
                            value={formData.businessAccountId}
                            onChange={(e) => setFormData({ ...formData, businessAccountId: e.target.value })}
                            className="input w-full"
                            placeholder="مثال: 109876543210987"
                        />
                        <p className="text-gray-500 text-xs mt-1">
                            تجده في: WhatsApp → API Setup → WhatsApp Business Account ID
                        </p>
                    </div>

                    <div>
                        <label className="block text-gray-300 text-sm mb-2">Access Token</label>
                        <div className="relative">
                            <input
                                type={showToken ? 'text' : 'password'}
                                value={formData.accessToken}
                                onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                                className="input w-full pr-12"
                                placeholder="EAAG..."
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowToken(!showToken)}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                            >
                                {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                        <p className="text-gray-500 text-xs mt-1">
                            أنشئ Permanent Token من: Business Settings → System Users
                        </p>
                    </div>
                </div>

                {testResult && (
                    <div className={`mt-4 p-3 rounded-lg ${testResult.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                        {testResult.message}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
                >
                    {saving ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Save className="w-5 h-5" />
                    )}
                    {status.connected ? 'تحديث البيانات' : 'ربط واتساب'}
                </button>
            </form>

            {/* Test Message */}
            {status.connected && (
                <div className="card">
                    <h3 className="text-lg font-semibold text-white mb-4">🧪 اختبار الإرسال</h3>
                    <p className="text-gray-400 text-sm mb-4">
                        أرسل رسالة اختبار للتأكد من عمل الاتصال
                    </p>

                    <div className="flex gap-3">
                        <input
                            type="tel"
                            value={testPhone}
                            onChange={(e) => setTestPhone(e.target.value)}
                            className="input flex-1"
                            placeholder="رقم الهاتف (مع رمز الدولة: 966...)"
                            dir="ltr"
                        />
                        <button
                            onClick={handleTestMessage}
                            disabled={testing}
                            className="btn-secondary flex items-center gap-2"
                        >
                            {testing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                            إرسال
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
