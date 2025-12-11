'use client'

import { useEffect, useState } from 'react'
import { Plus, Megaphone, Calendar, Users, Loader2, Play, Pause, Trash2 } from 'lucide-react'
import { useStoreStore } from '@/lib/store'
import { campaignsApi, templatesApi } from '@/lib/api'
import toast from 'react-hot-toast'

interface Campaign {
    id: string
    name: string
    type: string
    status: string
    totalRecipients: number
    sentCount: number
    scheduledAt: string | null
    createdAt: string
    template?: { name: string }
}

interface Template {
    id: string
    name: string
    type: string
}

export default function CampaignsPage() {
    const { currentStore } = useStoreStore()
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [templates, setTemplates] = useState<Template[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [saving, setSaving] = useState(false)

    const [formData, setFormData] = useState({
        name: '',
        type: 'PROMOTIONAL',
        templateId: '',
        scheduledAt: ''
    })

    useEffect(() => {
        if (currentStore) {
            loadData()
        }
    }, [currentStore])

    const loadData = async () => {
        if (!currentStore) return
        setLoading(true)
        try {
            const [campaignsData, templatesData] = await Promise.all([
                campaignsApi.getAll(currentStore.id),
                templatesApi.getAll(currentStore.id)
            ])
            setCampaigns(campaignsData.campaigns || [])
            setTemplates(templatesData || [])
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentStore) return

        setSaving(true)
        try {
            await campaignsApi.create(currentStore.id, formData)
            toast.success('تم إنشاء الحملة')
            setShowModal(false)
            setFormData({ name: '', type: 'PROMOTIONAL', templateId: '', scheduledAt: '' })
            loadData()
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setSaving(false)
        }
    }

    const handleSend = async (campaignId: string) => {
        if (!currentStore) return
        if (!confirm('هل تريد بدء إرسال الحملة؟')) return

        try {
            await campaignsApi.send(currentStore.id, campaignId)
            toast.success('تم بدء إرسال الحملة')
            loadData()
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    const handleCancel = async (campaignId: string) => {
        if (!currentStore) return
        if (!confirm('هل تريد إلغاء الحملة؟')) return

        try {
            await campaignsApi.cancel(currentStore.id, campaignId)
            toast.success('تم إلغاء الحملة')
            loadData()
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    const handleDelete = async (campaignId: string) => {
        if (!currentStore) return
        if (!confirm('هل تريد حذف الحملة؟')) return

        try {
            await campaignsApi.delete(currentStore.id, campaignId)
            toast.success('تم حذف الحملة')
            loadData()
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            DRAFT: 'badge-info',
            SCHEDULED: 'badge-warning',
            SENDING: 'badge-info',
            COMPLETED: 'badge-success',
            CANCELLED: 'badge-danger'
        }
        const labels: Record<string, string> = {
            DRAFT: 'مسودة',
            SCHEDULED: 'مجدولة',
            SENDING: 'قيد الإرسال',
            COMPLETED: 'مكتملة',
            CANCELLED: 'ملغاة'
        }
        return <span className={`badge ${styles[status] || ''}`}>{labels[status] || status}</span>
    }

    if (!currentStore) {
        return <div className="text-center py-20 text-gray-400">يرجى اختيار متجر</div>
    }

    return (
        <div className="animate-fadeIn">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">الحملات التسويقية</h1>
                    <p className="text-gray-400">أنشئ وأدر حملاتك الإعلانية عبر واتساب</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    حملة جديدة
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
                </div>
            ) : campaigns.length === 0 ? (
                <div className="card text-center py-16">
                    <Megaphone className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">لا توجد حملات</h3>
                    <p className="text-gray-400 mb-6">أنشئ أول حملة تسويقية لعملائك</p>
                    <button onClick={() => setShowModal(true)} className="btn-primary">
                        إنشاء حملة
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {campaigns.map((campaign) => (
                        <div key={campaign.id} className="card flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center">
                                    <Megaphone className="w-6 h-6 text-primary-400" />
                                </div>
                                <div>
                                    <h3 className="text-white font-medium">{campaign.name}</h3>
                                    <div className="flex items-center gap-3 text-sm text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <Users className="w-4 h-4" />
                                            {campaign.totalRecipients} مستلم
                                        </span>
                                        {campaign.scheduledAt && (
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-4 h-4" />
                                                {new Date(campaign.scheduledAt).toLocaleDateString('ar-SA')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                {getStatusBadge(campaign.status)}

                                <div className="flex items-center gap-2">
                                    {campaign.status === 'DRAFT' && (
                                        <button
                                            onClick={() => handleSend(campaign.id)}
                                            className="p-2 text-primary-400 hover:bg-primary-500/20 rounded-lg"
                                            title="إرسال"
                                        >
                                            <Play className="w-5 h-5" />
                                        </button>
                                    )}
                                    {campaign.status === 'SENDING' && (
                                        <button
                                            onClick={() => handleCancel(campaign.id)}
                                            className="p-2 text-yellow-400 hover:bg-yellow-500/20 rounded-lg"
                                            title="إيقاف"
                                        >
                                            <Pause className="w-5 h-5" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(campaign.id)}
                                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"
                                        title="حذف"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="card w-full max-w-md">
                        <h2 className="text-xl font-bold text-white mb-6">حملة جديدة</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-gray-300 text-sm mb-2">اسم الحملة</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="input"
                                    placeholder="حملة العروض الصيفية"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-gray-300 text-sm mb-2">القالب</label>
                                <select
                                    value={formData.templateId}
                                    onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                                    className="input"
                                    required
                                >
                                    <option value="">اختر قالب</option>
                                    {templates.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-gray-300 text-sm mb-2">جدولة (اختياري)</label>
                                <input
                                    type="datetime-local"
                                    value={formData.scheduledAt}
                                    onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                                    className="input"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="submit" disabled={saving} className="btn-primary flex-1">
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'إنشاء'}
                                </button>
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                                    إلغاء
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
