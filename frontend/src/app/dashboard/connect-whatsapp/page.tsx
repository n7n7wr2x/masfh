'use client'

import { useEffect, useState } from 'react'
import { MessageSquare, CheckCircle, Loader2, Info, Send } from 'lucide-react'
import { useStoreStore } from '@/lib/store'
import { whatsappApi } from '@/lib/api'
import toast from 'react-hot-toast'

export default function ConnectWhatsAppPage() {
    const { currentStore } = useStoreStore()
    const [status, setStatus] = useState<{ connected: boolean; phoneId?: string } | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [testLoading, setTestLoading] = useState(false)

    const [formData, setFormData] = useState({
        phoneNumberId: '',
        businessAccountId: '',
        accessToken: ''
    })

    const [testPhone, setTestPhone] = useState('')

    useEffect(() => {
        if (currentStore) {
            loadStatus()
        }
    }, [currentStore])

    const loadStatus = async () => {
        if (!currentStore) return
        setLoading(true)
        try {
            const data = await whatsappApi.getStatus(currentStore.id)
            setStatus(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentStore) return

        setSaving(true)
        try {
            await whatsappApi.connect(currentStore.id, formData)
            toast.success('تم ربط واتساب بنجاح!')
            loadStatus()
            setFormData({ phoneNumberId: '', businessAccountId: '', accessToken: '' })
        } catch (error: any) {
            toast.error(error.message || 'فشل في الربط')
        } finally {
            setSaving(false)
        }
    }

    const handleDisconnect = async () => {
        if (!currentStore) return
        if (!confirm('هل أنت متأكد من فصل واتساب؟')) return

        try {
            await whatsappApi.disconnect(currentStore.id)
            toast.success('تم فصل واتساب')
            setStatus({ connected: false })
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    const handleTestMessage = async () => {
        if (!currentStore || !testPhone) return

        setTestLoading(true)
        try {
            await whatsappApi.sendTest(currentStore.id, testPhone, 'hello_world')
            toast.success('تم إرسال رسالة الاختبار!')
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setTestLoading(false)
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
            <h1 className="text-3xl font-bold text-white mb-2">ربط واتساب بزنس</h1>
            <p className="text-gray-400 mb-8">اربط حساب واتساب بزنس لإرسال الإشعارات</p>

            {loading ? (
                <div className="card flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
                </div>
            ) : status?.connected ? (
                <div className="space-y-6">
                    {/* Connected Status */}
                    <div className="card text-center py-8">
                        <div className="w-20 h-20 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10 text-primary-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">متصل بواتساب</h3>
                        <p className="text-gray-400 mb-4">Phone ID: {status.phoneId}</p>
                        <button
                            onClick={handleDisconnect}
                            className="text-red-400 hover:text-red-300 text-sm"
                        >
                            فصل الربط
                        </button>
                    </div>

                    {/* Test Message */}
                    <div className="card">
                        <h3 className="text-lg font-bold text-white mb-4">إرسال رسالة اختبار</h3>
                        <div className="flex gap-3">
                            <input
                                type="tel"
                                value={testPhone}
                                onChange={(e) => setTestPhone(e.target.value)}
                                className="input flex-1"
                                placeholder="رقم الهاتف (966xxxxxxxxx)"
                            />
                            <button
                                onClick={handleTestMessage}
                                disabled={testLoading || !testPhone}
                                className="btn-primary flex items-center gap-2"
                            >
                                {testLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                اختبار
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Info Box */}
                    <div className="card bg-blue-500/10 border-blue-500/20">
                        <div className="flex items-start gap-3">
                            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-white font-medium mb-1">كيفية الحصول على بيانات واتساب</h4>
                                <ol className="text-gray-400 text-sm space-y-1 list-decimal list-inside">
                                    <li>انتقل إلى <a href="https://business.facebook.com" target="_blank" className="text-primary-400">Meta Business Suite</a></li>
                                    <li>أنشئ تطبيق في <a href="https://developers.facebook.com" target="_blank" className="text-primary-400">Meta for Developers</a></li>
                                    <li>فعّل WhatsApp Business API</li>
                                    <li>احصل على Phone Number ID و Access Token</li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    {/* Connect Form */}
                    <div className="card">
                        <h3 className="text-lg font-bold text-white mb-6">بيانات الاتصال</h3>
                        <form onSubmit={handleConnect} className="space-y-4">
                            <div>
                                <label className="block text-gray-300 text-sm mb-2">Phone Number ID *</label>
                                <input
                                    type="text"
                                    value={formData.phoneNumberId}
                                    onChange={(e) => setFormData({ ...formData, phoneNumberId: e.target.value })}
                                    className="input"
                                    placeholder="xxxxxxxxxxxxxxxxx"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-gray-300 text-sm mb-2">Business Account ID (اختياري)</label>
                                <input
                                    type="text"
                                    value={formData.businessAccountId}
                                    onChange={(e) => setFormData({ ...formData, businessAccountId: e.target.value })}
                                    className="input"
                                    placeholder="xxxxxxxxxxxxxxxxx"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-300 text-sm mb-2">Access Token *</label>
                                <textarea
                                    value={formData.accessToken}
                                    onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                                    className="input h-24 resize-none"
                                    placeholder="EAAxxxxxxxxxx..."
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <MessageSquare className="w-5 h-5" />
                                        ربط واتساب
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
