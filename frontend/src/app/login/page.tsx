'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MessageSquare, Mail, Lock, ArrowLeft, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/lib/store'

export default function LoginPage() {
    const router = useRouter()
    const { login } = useAuthStore()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            await login(formData.email, formData.password)
            toast.success('تم تسجيل الدخول بنجاح')
            router.push('/dashboard')
        } catch (error: any) {
            toast.error(error.message || 'خطأ في تسجيل الدخول')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                {/* Logo */}
                <Link href="/" className="flex items-center justify-center gap-2 mb-8">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center">
                        <MessageSquare className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-2xl font-bold text-white">سلة واتساب</span>
                </Link>

                {/* Card */}
                <div className="card">
                    <h1 className="text-2xl font-bold text-white text-center mb-2">مرحباً بعودتك</h1>
                    <p className="text-gray-400 text-center mb-8">سجل دخولك للوصول إلى لوحة التحكم</p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div>
                            <label className="block text-gray-300 text-sm mb-2">البريد الإلكتروني</label>
                            <div className="relative">
                                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="input pr-12"
                                    placeholder="example@email.com"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-gray-300 text-sm mb-2">كلمة المرور</label>
                            <div className="relative">
                                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="input pr-12"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        {/* Forgot Password */}
                        <div className="flex justify-end">
                            <Link href="/forgot-password" className="text-primary-400 text-sm hover:underline">
                                نسيت كلمة المرور؟
                            </Link>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    تسجيل الدخول
                                    <ArrowLeft className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Register Link */}
                    <p className="text-center text-gray-400 mt-6">
                        ليس لديك حساب؟{' '}
                        <Link href="/register" className="text-primary-400 hover:underline">
                            سجل الآن
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
