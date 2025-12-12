'use client'

import { useEffect, useState } from 'react'
import { CreditCard, Plus, Edit2, Trash2, Loader2, MessageSquare, FileText, Megaphone } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { plansApi } from '@/lib/api'
import { useRouter } from 'next/navigation'

interface Plan {
    id: string
    name: string
    nameAr: string
    description: string | null
    descriptionAr: string | null
    price: number
    currency: string
    billingPeriod: string
    messagesLimit: number
    templatesLimit: number
    campaignsLimit: number
    features: string[]
    isActive: boolean
    isDefault: boolean
    _count?: { subscriptions: number }
}

export default function AdminPlansPage() {
    const router = useRouter()
    const { user, token } = useAuthStore()
    const [plans, setPlans] = useState<Plan[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (user?.role !== 'SUPER_ADMIN') {
            router.push('/dashboard')
            return
        }
        fetchPlans()
    }, [user])

    const fetchPlans = async () => {
        try {
            const data = await plansApi.getAll()
            setPlans(data)
        } catch (error) {
            console.error('Failed to fetch plans:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('هل تريد حذف هذه الباقة؟')) return

        try {
            await plansApi.delete(id)
            fetchPlans()
        } catch (error) {
            console.error('Failed to delete plan:', error)
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
        <div className="animate-fadeIn">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">إدارة الباقات</h1>
                    <p className="text-gray-400">إنشاء وتعديل باقات الاشتراك</p>
                </div>
                <button
                    onClick={() => router.push('/dashboard/admin/plans/new')}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    إضافة باقة
                </button>
            </div>

            {/* Plans Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map((plan) => (
                    <div key={plan.id} className={`card relative ${!plan.isActive ? 'opacity-60' : ''}`}>
                        {plan.isDefault && (
                            <span className="absolute top-4 left-4 bg-primary-500 text-white text-xs px-2 py-1 rounded">
                                افتراضي
                            </span>
                        )}

                        <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center">
                                <CreditCard className="w-6 h-6 text-primary-400" />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => router.push(`/dashboard/admin/plans/new?edit=${plan.id}`)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <Edit2 className="w-4 h-4 text-gray-400" />
                                </button>
                                <button
                                    onClick={() => handleDelete(plan.id)}
                                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4 text-red-400" />
                                </button>
                            </div>
                        </div>

                        <h3 className="text-xl font-bold text-white mb-1">{plan.nameAr}</h3>
                        <p className="text-gray-400 text-sm mb-4">{plan.descriptionAr || plan.name}</p>

                        <div className="text-3xl font-bold text-white mb-4">
                            {plan.price} <span className="text-lg text-gray-400">{plan.currency}</span>
                            <span className="text-sm text-gray-500">/{plan.billingPeriod === 'monthly' ? 'شهر' : 'سنة'}</span>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-white/10">
                            <div className="flex items-center gap-3 text-gray-300">
                                <MessageSquare className="w-4 h-4 text-primary-400" />
                                <span>{plan.messagesLimit} رسالة/شهر</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-300">
                                <FileText className="w-4 h-4 text-primary-400" />
                                <span>{plan.templatesLimit} قوالب</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-300">
                                <Megaphone className="w-4 h-4 text-primary-400" />
                                <span>{plan.campaignsLimit} حملات</span>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-sm text-gray-500">
                            <span>{plan._count?.subscriptions || 0} مشترك</span>
                            <span className={plan.isActive ? 'text-green-400' : 'text-red-400'}>
                                {plan.isActive ? 'نشط' : 'غير نشط'}
                            </span>
                        </div>
                    </div>
                ))}

                {plans.length === 0 && (
                    <div className="col-span-full card text-center py-16">
                        <CreditCard className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl text-white mb-2">لا توجد باقات</h3>
                        <p className="text-gray-400 mb-4">أضف باقتك الأولى للبدء</p>
                        <button
                            onClick={() => router.push('/dashboard/admin/plans/new')}
                            className="btn-primary inline-flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            إضافة باقة
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
