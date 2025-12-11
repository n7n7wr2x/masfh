'use client'

import { useEffect, useState } from 'react'
import { Plus, FileText, Edit2, Trash2, Loader2, CheckCircle, Clock, XCircle } from 'lucide-react'
import { useStoreStore } from '@/lib/store'
import { templatesApi } from '@/lib/api'
import toast from 'react-hot-toast'

interface Template {
    id: string
    name: string
    type: string
    whatsappTemplateId?: string
    content: string
    status: string
    isActive: boolean
}

const templateTypes = [
    { value: 'ORDER_CONFIRMATION', label: 'تأكيد الطلب' },
    { value: 'ORDER_SHIPPED', label: 'تم الشحن' },
    { value: 'ORDER_DELIVERED', label: 'تم التوصيل' },
    { value: 'ORDER_CANCELLED', label: 'إلغاء الطلب' },
    { value: 'ABANDONED_CART', label: 'السلة المتروكة' },
    { value: 'PROMOTIONAL', label: 'ترويجي' },
    { value: 'CUSTOM', label: 'مخصص' }
]

export default function TemplatesPage() {
    const { currentStore } = useStoreStore()
    const [templates, setTemplates] = useState<Template[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
    const [saving, setSaving] = useState(false)

    const [formData, setFormData] = useState({
        name: '',
        type: 'CUSTOM',
        whatsappTemplateId: '',
        content: ''
    })

    useEffect(() => {
        if (currentStore) {
            loadTemplates()
        }
    }, [currentStore])

    const loadTemplates = async () => {
        if (!currentStore) return
        setLoading(true)
        try {
            const data = await templatesApi.getAll(currentStore.id)
            setTemplates(data || [])
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentStore) return

        setSaving(true)
        try {
            if (editingTemplate) {
                await templatesApi.update(currentStore.id, editingTemplate.id, formData)
                toast.success('تم تحديث القالب')
            } else {
                await templatesApi.create(currentStore.id, formData)
                toast.success('تم إنشاء القالب')
            }
            closeModal()
            loadTemplates()
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (templateId: string) => {
        if (!currentStore) return
        if (!confirm('هل تريد حذف هذا القالب؟')) return

        try {
            await templatesApi.delete(currentStore.id, templateId)
            toast.success('تم حذف القالب')
            loadTemplates()
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    const handleCreateDefaults = async () => {
        if (!currentStore) return
        try {
            await templatesApi.createDefaults(currentStore.id)
            toast.success('تم إنشاء القوالب الافتراضية')
            loadTemplates()
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    const openEditModal = (template: Template) => {
        setEditingTemplate(template)
        setFormData({
            name: template.name,
            type: template.type,
            whatsappTemplateId: template.whatsappTemplateId || '',
            content: template.content
        })
        setShowModal(true)
    }

    const closeModal = () => {
        setShowModal(false)
        setEditingTemplate(null)
        setFormData({ name: '', type: 'CUSTOM', whatsappTemplateId: '', content: '' })
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'APPROVED': return <CheckCircle className="w-4 h-4 text-green-400" />
            case 'PENDING': return <Clock className="w-4 h-4 text-yellow-400" />
            case 'REJECTED': return <XCircle className="w-4 h-4 text-red-400" />
            default: return null
        }
    }

    const getTypeLabel = (type: string) => {
        return templateTypes.find(t => t.value === type)?.label || type
    }

    if (!currentStore) {
        return <div className="text-center py-20 text-gray-400">يرجى اختيار متجر</div>
    }

    return (
        <div className="animate-fadeIn">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">قوالب الرسائل</h1>
                    <p className="text-gray-400">أنشئ وأدر قوالب رسائل واتساب</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleCreateDefaults} className="btn-secondary">
                        إنشاء قوالب افتراضية
                    </button>
                    <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        قالب جديد
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
                </div>
            ) : templates.length === 0 ? (
                <div className="card text-center py-16">
                    <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">لا توجد قوالب</h3>
                    <p className="text-gray-400 mb-6">أنشئ قوالب رسائل لإرسالها عبر واتساب</p>
                    <div className="flex gap-3 justify-center">
                        <button onClick={handleCreateDefaults} className="btn-secondary">
                            إنشاء قوالب افتراضية
                        </button>
                        <button onClick={() => setShowModal(true)} className="btn-primary">
                            إنشاء قالب
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid gap-4">
                    {templates.map((template) => (
                        <div key={template.id} className="card">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center">
                                        <FileText className="w-6 h-6 text-primary-400" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-white font-medium">{template.name}</h3>
                                            {getStatusIcon(template.status)}
                                        </div>
                                        <span className="badge badge-info mt-1">{getTypeLabel(template.type)}</span>
                                        <p className="text-gray-400 text-sm mt-2 max-w-xl line-clamp-2">
                                            {template.content}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => openEditModal(template)}
                                        className="p-2 text-gray-400 hover:bg-white/10 rounded-lg"
                                    >
                                        <Edit2 className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(template.id)}
                                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-white mb-6">
                            {editingTemplate ? 'تعديل القالب' : 'قالب جديد'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-gray-300 text-sm mb-2">اسم القالب</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="input"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-gray-300 text-sm mb-2">نوع القالب</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="input"
                                >
                                    {templateTypes.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-gray-300 text-sm mb-2">معرف القالب في واتساب</label>
                                <input
                                    type="text"
                                    value={formData.whatsappTemplateId}
                                    onChange={(e) => setFormData({ ...formData, whatsappTemplateId: e.target.value })}
                                    className="input"
                                    placeholder="hello_world"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-300 text-sm mb-2">محتوى الرسالة</label>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    className="input h-32 resize-none"
                                    placeholder="مرحباً {{1}}، تم استلام طلبك..."
                                    required
                                />
                                <p className="text-gray-500 text-xs mt-1">استخدم {'{{1}}'}, {'{{2}}'} للمتغيرات</p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="submit" disabled={saving} className="btn-primary flex-1">
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'حفظ'}
                                </button>
                                <button type="button" onClick={closeModal} className="btn-secondary flex-1">
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
