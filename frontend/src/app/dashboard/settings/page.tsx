'use client'

import { useState } from 'react'
import { Save } from 'lucide-react'
import { useStoreStore } from '@/lib/store'
import { storesApi } from '@/lib/api'
import { toast } from 'react-hot-toast'

export default function SettingsPage() {
    const { currentStore, setCurrentStore } = useStoreStore()
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState(currentStore?.name || '')

    const handleSave = async () => {
        if (!currentStore) return

        try {
            setLoading(true)
            const updatedStore = await storesApi.update(currentStore.id, { name })
            setCurrentStore(updatedStore)
            toast.success('تم حفظ الإعدادات بنجاح')
        } catch (error) {
            toast.error('فشل حفظ الإعدادات')
        } finally {
            setLoading(false)
        }
    }

    if (!currentStore) {
        return <div className="text-center py-20 text-gray-400">يرجى اختيار متجر أولاً</div>
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white mb-2">إعدادات المتجر</h1>
                <p className="text-gray-400">إدارة إعدادات متجرك</p>
            </div>

            <div className="card max-w-2xl">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            اسم المتجر
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="input-primary w-full"
                        />
                    </div>

                    <div className="pt-4 border-t border-slate-700">
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="card max-w-2xl bg-red-500/5 border-red-500/20">
                <h3 className="text-red-400 font-bold mb-2">منطقة الخطر</h3>
                <p className="text-gray-400 text-sm mb-4">
                    حذف المتجر سيؤدي إلى حذف جميع البيانات المرتبطة به. هذا الإجراء لا يمكن التراجع عنه.
                </p>
                <button className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors">
                    حذف المتجر
                </button>
            </div>
        </div>
    )
}
