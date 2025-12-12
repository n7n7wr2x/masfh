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

        // Initialize Facebook SDK
        // @ts-ignore
        window.fbAsyncInit = function () {
            // @ts-ignore
            FB.init({
                appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID, // Use env var
                autoLogAppEvents: true,
                xfbml: true,
                version: 'v18.0'
            });
        };
    }, [])

    const launchFacebookLogin = () => {
        setSaving(true)
        // @ts-ignore
        FB.login(function (response) {
            if (response.authResponse) {
                console.log('FB Login Success:', response);
                const accessToken = response.authResponse.accessToken;
                handleFacebookConnect(accessToken);
            } else {
                console.log('User cancelled login or did not fully authorize.');
                setSaving(false)
            }
        }, {
            scope: 'whatsapp_business_management,whatsapp_business_messaging',
            extras: {
                feature: 'whatsapp_embedded_signup',
            }
        });
    }

    const handleFacebookConnect = async (accessToken: string) => {
        if (!currentStore?.id) return

        try {
            await whatsappApi.connect(currentStore.id, { accessToken })

            setTestResult({ success: true, message: 'تم ربط واتساب بنجاح!' })
            fetchStatus()
        } catch (error: any) {
            setTestResult({ success: false, message: error.message || 'حدث خطأ في الاتصال' })
        } finally {
            setSaving(false)
        }
    }

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
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${status.connected ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
                        <MessageCircle className={`w-8 h-8 ${status.connected ? 'text-green-400' : 'text-gray-400'}`} />
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

            {!status.connected && (
                <div className="card mb-6 text-center py-10">
                    <div className="mb-6">
                        <h3 className="text-xl font-bold text-white mb-2">ربط واتساب للأعمال</h3>
                        <p className="text-gray-400">
                            اضغط على الزر أدناه لتسجيل الدخول بحساب فيسبوك واختيار رقم الواتساب الخاص بك.
                        </p>
                    </div>

                    <button
                        onClick={launchFacebookLogin}
                        disabled={saving}
                        className="bg-[#1877F2] hover:bg-[#166fe5] text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-3 mx-auto transition-all transform hover:scale-105"
                    >
                        {saving ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.791-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                        )}
                        تسجيل الدخول بفيسبوك
                    </button>

                    <p className="text-gray-500 text-xs mt-4">
                        سيتم توجيهك إلى فيسبوك للموافقة على الأذونات المطلوبة.
                    </p>

                    {testResult && !testResult.success && (
                        <div className="mt-4 text-red-400 bg-red-500/10 p-2 rounded">
                            {testResult.message}
                        </div>
                    )}
                </div>
            )}

            <script async defer crossOrigin="anonymous" src="https://connect.facebook.net/en_US/sdk.js"></script>

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
