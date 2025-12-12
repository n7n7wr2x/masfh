'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, Loader2, Check } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { plansApi } from '@/lib/api'
import { useRouter, useSearchParams } from 'next/navigation'

interface PlanForm {
    name: string
    nameAr: string
    description: string
    descriptionAr: string
    price: number
    currency: string
    billingPeriod: string
    messagesLimit: number
    templatesLimit: number
    campaignsLimit: number
    features: string[]
    isActive: boolean
    isDefault: boolean
    sortOrder: number
}

const emptyPlan: PlanForm = {
    name: '',
    nameAr: '',
    description: '',
    descriptionAr: '',
    price: 0,
    currency: 'SAR',
    billingPeriod: 'monthly',
    messagesLimit: 100,
    templatesLimit: 5,
    campaignsLimit: 2,
    features: [],
    isActive: true,
    isDefault: false,
    sortOrder: 0
}

export default function NewPlanPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const editId = searchParams.get('edit')

    const { user, token } = useAuthStore()
    const [formData, setFormData] = useState<PlanForm>(emptyPlan)
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(!!editId)

    useEffect(() => {
        if (user?.role !== 'SUPER_ADMIN') {
            router.push('/dashboard')
            return
        }

        if (editId) {
            fetchPlan()
        }
    }, [user, editId])

    const fetchPlan = async () => {
        try {
            const plans = await plansApi.getAll()
            const plan = plans.find((p: any) => p.id === editId)

            if (plan) {
                setFormData({
                    name: plan.name,
                    nameAr: plan.nameAr,
                    description: plan.description || '',
                    descriptionAr: plan.descriptionAr || '',
                    price: plan.price,
                    currency: plan.currency,
                    billingPeriod: plan.billingPeriod,
                    messagesLimit: plan.messagesLimit,
                    templatesLimit: plan.templatesLimit,
                    campaignsLimit: plan.campaignsLimit,
                    features: plan.features,
                    isActive: plan.isActive,
                    isDefault: plan.isDefault,
                    sortOrder: plan.sortOrder
                })
            }
        } catch (error) {
            console.error('Failed to fetch plan:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            if (editId) {
                await plansApi.update(editId, formData)
            } else {
                await plansApi.create(formData)
            }
            router.push('/dashboard/admin/plans')
        } catch (error) {
            console.error('Failed to save plan:', error)
        } finally {
            setSaving(false)
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
        <div className="animate-fadeIn max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => router.push('/dashboard/admin/plans')}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-white">
                        {editId ? 'تعديل الباقة' : 'إضافة باقة جديدة'}
                    </h1>
                    <p className="text-gray-400">أدخل تفاصيل الباقة</p>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Names Section */}
                <div className="card">
                    <h3 className="text-lg font-semibold text-white mb-4">معلومات الباقة</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-300 text-sm mb-2">الاسم (إنجليزي)</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="input w-full"
                                placeholder="Basic"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-300 text-sm mb-2">الاسم (عربي)</label>
                            <input
                                type="text"
                                value={formData.nameAr}
                                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                                className="input w-full"
                                placeholder="أساسية"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-300 text-sm mb-2">الوصف (إنجليزي)</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="input w-full"
                                rows={2}
                                placeholder="Perfect for small businesses"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-300 text-sm mb-2">الوصف (عربي)</label>
                            <textarea
                                value={formData.descriptionAr}
                                onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                                className="input w-full"
                                rows={2}
                                placeholder="مثالية للمتاجر الصغيرة"
                            />
                        </div>
                    </div>
                </div>

                {/* Pricing Section */}
                <div className="card">
                    <h3 className="text-lg font-semibold text-white mb-4">التسعير</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-gray-300 text-sm mb-2">السعر</label>
                            <input
                                type="number"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                className="input w-full"
                                min="0"
                                step="0.01"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-300 text-sm mb-2">العملة</label>
                            <select
                                value={formData.currency}
                                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                className="input w-full"
                            >
                                <option value="SAR">ريال سعودي (SAR)</option>
                                <option value="USD">دولار (USD)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-300 text-sm mb-2">فترة الدفع</label>
                            <select
                                value={formData.billingPeriod}
                                onChange={(e) => setFormData({ ...formData, billingPeriod: e.target.value })}
                                className="input w-full"
                            >
                                <option value="monthly">شهري</option>
                                <option value="yearly">سنوي</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Limits Section */}
                <div className="card">
                    <h3 className="text-lg font-semibold text-white mb-4">الحدود</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-gray-300 text-sm mb-2">حد الرسائل / شهر</label>
                            <input
                                type="number"
                                value={formData.messagesLimit}
                                onChange={(e) => setFormData({ ...formData, messagesLimit: parseInt(e.target.value) || 0 })}
                                className="input w-full"
                                min="0"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-300 text-sm mb-2">حد القوالب</label>
                            <input
                                type="number"
                                value={formData.templatesLimit}
                                onChange={(e) => setFormData({ ...formData, templatesLimit: parseInt(e.target.value) || 0 })}
                                className="input w-full"
                                min="0"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-300 text-sm mb-2">حد الحملات</label>
                            <input
                                type="number"
                                value={formData.campaignsLimit}
                                onChange={(e) => setFormData({ ...formData, campaignsLimit: parseInt(e.target.value) || 0 })}
                                className="input w-full"
                                min="0"
                            />
                        </div>
                    </div>
                </div>

                {/* Status Section */}
                <div className="card">
                    <h3 className="text-lg font-semibold text-white mb-4">الحالة</h3>
                    <div className="flex flex-wrap gap-6">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-primary-500 focus:ring-primary-500"
                            />
                            <span className="text-gray-300">نشط</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isDefault}
                                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-primary-500 focus:ring-primary-500"
                            />
                            <span className="text-gray-300">الباقة الافتراضية للمستخدمين الجدد</span>
                        </label>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="btn-primary flex-1 flex items-center justify-center gap-2 py-3"
                    >
                        {saving ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Check className="w-5 h-5" />
                        )}
                        {editId ? 'حفظ التعديلات' : 'إنشاء الباقة'}
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push('/dashboard/admin/plans')}
                        className="btn-secondary px-8 py-3"
                    >
                        إلغاء
                    </button>
                </div>
            </form>
        </div>
    )
}
