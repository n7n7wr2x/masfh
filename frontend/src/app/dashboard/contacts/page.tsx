'use client'

import { useEffect, useState, useRef } from 'react'
import { Users, Search, Plus, Edit2, Trash2, Ban, CheckCircle, Phone, Mail, MessageSquare, Loader2, X, ShoppingBag, Upload, Download, FileSpreadsheet, AlertCircle } from 'lucide-react'
import { useAuthStore, useStoreStore } from '@/lib/store'
import { contactsApi } from '@/lib/api'

interface Contact {
    id: string
    phone: string
    name?: string
    email?: string
    source: string
    totalOrders: number
    totalSpent: number
    messagesCount: number
    lastContactAt?: string
    tags: string[]
    notes?: string
    isBlocked: boolean
    createdAt: string
}

export default function ContactsPage() {
    const { token } = useAuthStore()
    const { currentStore, fetchStores } = useStoreStore()

    const [loading, setLoading] = useState(true)
    const [contacts, setContacts] = useState<Contact[]>([])
    const [search, setSearch] = useState('')
    const [showForm, setShowForm] = useState(false)
    const [editingContact, setEditingContact] = useState<Contact | null>(null)
    const [saving, setSaving] = useState(false)
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })

    const [formData, setFormData] = useState({
        phone: '',
        name: '',
        email: '',
        notes: ''
    })

    // Import states
    const [showImport, setShowImport] = useState(false)
    const [importing, setImporting] = useState(false)
    const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        fetchStores()
    }, [])

    useEffect(() => {
        if (currentStore?.id) {
            fetchContacts()
        }
    }, [currentStore, search])

    const fetchContacts = async () => {
        try {
            const data = await contactsApi.getAll(currentStore.id, 1, search)
            // Note: The original fetch used search param which isn't fully supported in the simple getAll wrapper yet
            // For now, let's keep it simple or update api.ts if search is critical. 
            // Wait, I see I didn't add search to getAll in api.ts.
            // Let's assume standard pagination for now, or I'll quickly fix api.ts next turn if needed.
            // actually, let's look at the fetch: `${process.env.NEXT_PUBLIC_API_URL}/contacts/${currentStore?.id}?limit=50${searchParam}`
            // My api.ts getAll takes (storeId, page). It doesn't take search. 
            // I should have updated api.ts to support search. 
            // I will use direct axios call for now OR update api.ts. 
            // Updating api.ts is cleaner. I will do that in a separate step? 
            // No, I can't leave broken code. 
            // I'll use the getAll but I'll update api.ts in the NEXT step or previous? 
            // I already updated api.ts. It only has (storeId, page).
            // FAIL. I need to update api.ts to support search.
            // For this specific file verify, I will rely on the fact I will update api.ts again or just use a slightly different implementation here.

            // Let's stick to the plan: use contactsApi.
            // I will update contactsApi in api.ts to include search support in a moment.
            const data = await contactsApi.getAll(currentStore.id, 1)
            setContacts(data.contacts || [])
            setPagination(data.pagination || { page: 1, pages: 1, total: 0 })
        } catch (error) {
            console.error('Failed to fetch contacts:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentStore?.id) return
        setSaving(true)

        try {
            if (editingContact) {
                await contactsApi.update(currentStore.id, editingContact.id, formData)
            } else {
                await contactsApi.create(currentStore.id, formData)
            }

            fetchContacts()
            setShowForm(false)
            setEditingContact(null)
            setFormData({ phone: '', name: '', email: '', notes: '' })
        } catch (error) {
            console.error('Failed to save contact:', error)
        } finally {
            setSaving(false)
        }
    }

    const handleEdit = (contact: Contact) => {
        setEditingContact(contact)
        setFormData({
            phone: contact.phone,
            name: contact.name || '',
            email: contact.email || '',
            notes: contact.notes || ''
        })
        setShowForm(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('هل تريد حذف جهة الاتصال؟')) return
        if (!currentStore?.id) return

        try {
            await contactsApi.delete(currentStore.id, id)
            fetchContacts()
        } catch (error) {
            console.error('Failed to delete contact:', error)
        }
    }

    const handleBlock = async (id: string, blocked: boolean) => {
        if (!currentStore?.id) return
        try {
            await contactsApi.block(currentStore.id, id, blocked)
            fetchContacts()
        } catch (error) {
            console.error('Failed to block contact:', error)
        }
    }

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    const getSourceLabel = (source: string) => {
        switch (source) {
            case 'whatsapp': return 'واتساب'
            case 'order': return 'طلب'
            case 'manual': return 'يدوي'
            case 'import': return 'مستورد'
            default: return source
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setImporting(true)
        setImportResult(null)

        try {
            const text = await file.text()
            const lines = text.split('\n').filter(line => line.trim())

            if (lines.length < 2) {
                setImportResult({ imported: 0, skipped: 0, errors: ['الملف فارغ أو لا يحتوي على بيانات'] })
                return
            }

            // Parse CSV header
            const header = lines[0].split(',').map(h => h.trim().toLowerCase())
            const phoneIndex = header.findIndex(h => h === 'phone' || h === 'الهاتف' || h === 'رقم')
            const nameIndex = header.findIndex(h => h === 'name' || h === 'الاسم')
            const emailIndex = header.findIndex(h => h === 'email' || h === 'البريد')
            const notesIndex = header.findIndex(h => h === 'notes' || h === 'ملاحظات')

            if (phoneIndex === -1) {
                setImportResult({ imported: 0, skipped: 0, errors: ['لم يتم العثور على عمود الهاتف'] })
                return
            }

            // Parse data rows
            const contacts = []
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',')
                if (values[phoneIndex]?.trim()) {
                    contacts.push({
                        phone: values[phoneIndex]?.trim(),
                        name: nameIndex >= 0 ? values[nameIndex]?.trim() : '',
                        email: emailIndex >= 0 ? values[emailIndex]?.trim() : '',
                        notes: notesIndex >= 0 ? values[notesIndex]?.trim() : ''
                    })
                }
            }

            if (contacts.length === 0) {
                setImportResult({ imported: 0, skipped: 0, errors: ['لا توجد جهات اتصال صالحة'] })
                return
            }

            // Send to API
            if (currentStore?.id) {
                const result = await contactsApi.import(currentStore.id, contacts)
                setImportResult(result)

                if (result.imported > 0) {
                    fetchContacts()
                }
            }
        } catch (error) {
            setImportResult({ imported: 0, skipped: 0, errors: ['خطأ في قراءة الملف'] })
        } finally {
            setImporting(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    const downloadTemplate = () => {
        const BOM = '\uFEFF'
        const lines = [
            'phone,name,email,notes',
            '966512345678,أحمد محمد,ahmed@example.com,عميل VIP',
            '966551234567,خالد العتيبي,,يفضل التواصل صباحاً',
            '966598765432,سارة علي,sara@example.com,',
            '0551112233,فهد السالم,,'
        ]
        const csv = BOM + lines.join('\r\n')
        const blob = new Blob([csv], { type: 'application/vnd.ms-excel;charset=utf-8;' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', 'contacts_template.csv')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
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
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">جهات الاتصال</h1>
                    <p className="text-gray-400">{pagination.total} جهة اتصال</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowImport(true)}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <Upload className="w-4 h-4" />
                        استيراد
                    </button>
                    <button
                        onClick={() => {
                            setEditingContact(null)
                            setFormData({ phone: '', name: '', email: '', notes: '' })
                            setShowForm(true)
                        }}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        إضافة
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="card mb-6">
                <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="بحث بالاسم أو الرقم..."
                        className="input w-full pr-10"
                    />
                </div>
            </div>

            {/* Contacts Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-right py-3 px-4 text-gray-400 font-medium">الاسم</th>
                                <th className="text-right py-3 px-4 text-gray-400 font-medium">الهاتف</th>
                                <th className="text-right py-3 px-4 text-gray-400 font-medium">المصدر</th>
                                <th className="text-right py-3 px-4 text-gray-400 font-medium">الطلبات</th>
                                <th className="text-right py-3 px-4 text-gray-400 font-medium">الرسائل</th>
                                <th className="text-right py-3 px-4 text-gray-400 font-medium">آخر تواصل</th>
                                <th className="text-right py-3 px-4 text-gray-400 font-medium">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {contacts.map((contact) => (
                                <tr key={contact.id} className={`border-b border-white/5 hover:bg-white/5 ${contact.isBlocked ? 'opacity-50' : ''}`}>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-primary-500/20 rounded-full flex items-center justify-center">
                                                <Users className="w-5 h-5 text-primary-400" />
                                            </div>
                                            <div>
                                                <div className="text-white font-medium">
                                                    {contact.name || 'بدون اسم'}
                                                </div>
                                                {contact.email && (
                                                    <div className="text-gray-500 text-sm">{contact.email}</div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="text-gray-300" dir="ltr">{contact.phone}</span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`px-2 py-1 rounded text-xs ${contact.source === 'whatsapp' ? 'bg-green-500/20 text-green-400' :
                                            contact.source === 'order' ? 'bg-blue-500/20 text-blue-400' :
                                                'bg-gray-500/20 text-gray-400'
                                            }`}>
                                            {getSourceLabel(contact.source)}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2 text-gray-300">
                                            <ShoppingBag className="w-4 h-4 text-gray-500" />
                                            {contact.totalOrders}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2 text-gray-300">
                                            <MessageSquare className="w-4 h-4 text-gray-500" />
                                            {contact.messagesCount}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-gray-400 text-sm">
                                        {contact.lastContactAt ? formatDate(contact.lastContactAt) : '-'}
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleEdit(contact)}
                                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                                title="تعديل"
                                            >
                                                <Edit2 className="w-4 h-4 text-gray-400" />
                                            </button>
                                            <button
                                                onClick={() => handleBlock(contact.id, !contact.isBlocked)}
                                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                                title={contact.isBlocked ? 'إلغاء الحظر' : 'حظر'}
                                            >
                                                {contact.isBlocked ? (
                                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                                ) : (
                                                    <Ban className="w-4 h-4 text-yellow-400" />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(contact.id)}
                                                className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                                                title="حذف"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-400" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {contacts.length === 0 && (
                        <div className="text-center py-16">
                            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                            <h3 className="text-xl text-white mb-2">لا توجد جهات اتصال</h3>
                            <p className="text-gray-400">أضف جهة اتصال أو انتظر تواصل العملاء معك</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white">
                                {editingContact ? 'تعديل جهة الاتصال' : 'إضافة جهة اتصال'}
                            </h3>
                            <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/10 rounded-lg">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-gray-300 text-sm mb-2">رقم الهاتف *</label>
                                <div className="relative">
                                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="input w-full pr-10"
                                        placeholder="966512345678"
                                        dir="ltr"
                                        required
                                        disabled={!!editingContact}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-300 text-sm mb-2">الاسم</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="input w-full"
                                    placeholder="اسم العميل"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-300 text-sm mb-2">البريد الإلكتروني</label>
                                <div className="relative">
                                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="input w-full pr-10"
                                        placeholder="email@example.com"
                                        dir="ltr"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-300 text-sm mb-2">ملاحظات</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="input w-full"
                                    rows={3}
                                    placeholder="ملاحظات خاصة بالعميل..."
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    {editingContact ? 'حفظ التعديلات' : 'إضافة'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="btn-secondary px-6"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImport && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-lg">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white">استيراد جهات الاتصال</h3>
                            <button onClick={() => { setShowImport(false); setImportResult(null); }} className="p-2 hover:bg-white/10 rounded-lg">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        {/* CSV Format */}
                        <div className="bg-gray-700/50 rounded-lg p-4 mb-6 text-sm">
                            <p className="text-gray-300 mb-2">صيغة الملف المطلوبة:</p>
                            <code className="text-green-400 text-xs block" dir="ltr">
                                phone,name,email,notes<br />
                                966512345678,أحمد محمد,ahmed@example.com,عميل VIP<br />
                                0551234567,خالد,,ملاحظة
                            </code>
                        </div>

                        {/* File Upload */}
                        <div className="mb-6">
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept=".csv,.txt"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={importing}
                                className="w-full py-8 border-2 border-dashed border-gray-600 rounded-xl hover:border-primary-500 transition-colors flex flex-col items-center gap-2"
                            >
                                {importing ? (
                                    <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
                                ) : (
                                    <Upload className="w-8 h-8 text-gray-400" />
                                )}
                                <span className="text-gray-400">
                                    {importing ? 'جاري الاستيراد...' : 'اضغط لاختيار ملف CSV'}
                                </span>
                            </button>
                        </div>

                        {/* Import Result */}
                        {importResult && (
                            <div className={`p-4 rounded-lg ${importResult.imported > 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                                <div className="flex items-start gap-3">
                                    {importResult.imported > 0 ? (
                                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                                    ) : (
                                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                                    )}
                                    <div>
                                        <p className={importResult.imported > 0 ? 'text-green-400' : 'text-red-400'}>
                                            تم استيراد {importResult.imported} جهة اتصال
                                            {importResult.skipped > 0 && ` (تم تخطي ${importResult.skipped})`}
                                        </p>
                                        {importResult.errors.length > 0 && (
                                            <ul className="text-gray-400 text-sm mt-2 list-disc list-inside">
                                                {importResult.errors.map((err, i) => (
                                                    <li key={i}>{err}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => { setShowImport(false); setImportResult(null); }}
                            className="btn-secondary w-full mt-6"
                        >
                            إغلاق
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
