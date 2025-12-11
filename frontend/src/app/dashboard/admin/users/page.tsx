'use client'

import { useEffect, useState } from 'react'
import { Users, Loader2, Copy, Check, Key, Mail, Calendar } from 'lucide-react'
import { adminApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'

interface User {
    id: string
    name: string
    email: string
    role: string
    isActive: boolean
    tempPassword: string | null
    createdAt: string
    _count: { stores: number }
}

export default function AdminUsersPage() {
    const router = useRouter()
    const { user } = useAuthStore()
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [copiedId, setCopiedId] = useState<string | null>(null)

    useEffect(() => {
        if (user?.role !== 'SUPER_ADMIN') {
            router.push('/dashboard')
            return
        }
        loadUsers()
    }, [user])

    const loadUsers = async () => {
        try {
            const data = await adminApi.getUsers()
            setUsers(data.users)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const formatDate = (date: string) => {
        return new Date(date).toLocaleString('ar-SA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
            </div>
        )
    }

    // Separate users with passwords (new signups) from others
    const usersWithPassword = users.filter(u => u.tempPassword)
    const otherUsers = users.filter(u => !u.tempPassword)

    return (
        <div className="animate-fadeIn">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">إدارة المستخدمين</h1>
                <p className="text-gray-400">عرض وإدارة جميع المستخدمين</p>
            </div>

            {/* New Signups with Passwords */}
            {usersWithPassword.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
                        <Key className="w-5 h-5" />
                        تسجيلات جديدة (مع كلمات المرور)
                    </h2>
                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
                        <p className="text-green-400 text-sm">
                            ⚠️ هذه كلمات المرور المؤقتة للمستخدمين الجدد. انسخها وأرسلها للتجار.
                        </p>
                    </div>
                    <div className="grid gap-4">
                        {usersWithPassword.map((u) => (
                            <div key={u.id} className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-xl p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center">
                                            <span className="text-green-400 text-xl font-bold">{u.name.charAt(0)}</span>
                                        </div>
                                        <div>
                                            <p className="text-white text-lg font-bold">{u.name}</p>
                                            <div className="flex items-center gap-2 text-gray-400">
                                                <Mail className="w-4 h-4" />
                                                <span>{u.email}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
                                                <Calendar className="w-3 h-3" />
                                                <span>{formatDate(u.createdAt)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="bg-slate-800 rounded-lg px-4 py-3 border border-green-500/50">
                                            <p className="text-gray-400 text-xs mb-1">كلمة المرور</p>
                                            <div className="flex items-center gap-3">
                                                <span className="text-green-400 font-mono text-lg font-bold tracking-wider">
                                                    {u.tempPassword}
                                                </span>
                                                <button
                                                    onClick={() => copyToClipboard(u.tempPassword!, u.id)}
                                                    className="p-2 hover:bg-green-500/20 rounded-lg transition-colors"
                                                    title="نسخ"
                                                >
                                                    {copiedId === u.id ? (
                                                        <Check className="w-5 h-5 text-green-400" />
                                                    ) : (
                                                        <Copy className="w-5 h-5 text-gray-400" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => copyToClipboard(`البريد: ${u.email}\nكلمة المرور: ${u.tempPassword}`, `full-${u.id}`)}
                                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                                        >
                                            {copiedId === `full-${u.id}` ? 'تم النسخ!' : 'نسخ الكل'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* All Users */}
            <div>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    جميع المستخدمين ({users.length})
                </h2>
                <div className="card overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-right text-gray-400 font-medium p-4">المستخدم</th>
                                <th className="text-right text-gray-400 font-medium p-4">البريد</th>
                                <th className="text-right text-gray-400 font-medium p-4">الدور</th>
                                <th className="text-right text-gray-400 font-medium p-4">المتاجر</th>
                                <th className="text-right text-gray-400 font-medium p-4">الحالة</th>
                                <th className="text-right text-gray-400 font-medium p-4">تاريخ التسجيل</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-primary-500/20 rounded-full flex items-center justify-center">
                                                <span className="text-primary-400 font-bold">{u.name.charAt(0)}</span>
                                            </div>
                                            <span className="text-white font-medium">{u.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-gray-300">{u.email}</td>
                                    <td className="p-4">
                                        <span className={`badge ${u.role === 'SUPER_ADMIN' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                            {u.role === 'SUPER_ADMIN' ? 'سوبر أدمن' : 'تاجر'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-300">{u._count.stores}</td>
                                    <td className="p-4">
                                        <span className={`badge ${u.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                            {u.isActive ? 'نشط' : 'معطل'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-400 text-sm">{formatDate(u.createdAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
