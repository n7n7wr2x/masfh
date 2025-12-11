'use client'

import { BarChart3 } from 'lucide-react'

export default function ReportsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white mb-2">التقارير</h1>
                <p className="text-gray-400">تحليلات مفصلة لأداء متجرك</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card flex flex-col items-center justify-center min-h-[300px] text-center">
                    <div className="w-16 h-16 bg-primary-500/10 rounded-full flex items-center justify-center mb-4">
                        <BarChart3 className="w-8 h-8 text-primary-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">قريباً</h3>
                    <p className="text-gray-400 max-w-sm">
                        نعمل على بناء لوحة تقارير متقدمة تساعدك على فهم أداء حملاتك وإشعاراتك بشكل أفضل.
                    </p>
                </div>

                <div className="card flex flex-col items-center justify-center min-h-[300px] text-center opacity-50">
                    <h3 className="text-xl font-bold text-white mb-2">تحليل الحملات</h3>
                    <p className="text-gray-400">ميزة قادمة</p>
                </div>
            </div>
        </div>
    )
}
