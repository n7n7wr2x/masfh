'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
    LayoutDashboard,
    Store,
    MessageSquare,
    Bell,
    FileText,
    Megaphone,
    Settings,
    Users,
    BarChart3,
    LogOut,
    Menu,
    ChevronDown,
    Webhook,
    Package,
    Inbox
} from 'lucide-react'
import { useAuthStore, useStoreStore, useUIStore } from '@/lib/store'

const merchantLinks = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'الرئيسية' },
    { href: '/dashboard/inbox', icon: Inbox, label: 'صندوق الرسائل' },
    { href: '/dashboard/contacts', icon: Users, label: 'جهات الاتصال' },
    { href: '/dashboard/salla-settings', icon: Store, label: 'إعدادات سلة' },
    { href: '/dashboard/whatsapp', icon: MessageSquare, label: 'إعدادات واتساب' },
    { href: '/dashboard/templates', icon: FileText, label: 'القوالب' },
    { href: '/dashboard/campaigns', icon: Megaphone, label: 'الحملات' },
    { href: '/dashboard/notifications', icon: Bell, label: 'الإشعارات' },
    { href: '/dashboard/reports', icon: BarChart3, label: 'التقارير' },
    { href: '/dashboard/settings', icon: Settings, label: 'الإعدادات' },
]

const adminLinks = [
    { href: '/dashboard/admin', icon: LayoutDashboard, label: 'لوحة الأدمن' },
    { href: '/dashboard/admin/users', icon: Users, label: 'المستخدمين' },
    { href: '/dashboard/admin/stores', icon: Store, label: 'المتاجر' },
    { href: '/dashboard/admin/orders', icon: Package, label: 'الطلبات' },
    { href: '/dashboard/admin/plans', icon: BarChart3, label: 'الباقات' },
    { href: '/dashboard/admin/analytics', icon: BarChart3, label: 'الإحصائيات' },
    { href: '/dashboard/webhooks', icon: Webhook, label: 'سجل Webhooks' },
]

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const pathname = usePathname()
    const { user, isLoading, checkAuth, logout } = useAuthStore()
    const { stores, currentStore, fetchStores, setCurrentStore } = useStoreStore()
    const { sidebarOpen, toggleSidebar } = useUIStore()

    useEffect(() => {
        checkAuth()
    }, [checkAuth])

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login')
        }
    }, [user, isLoading, router])

    useEffect(() => {
        if (user) {
            fetchStores()
        }
    }, [user, fetchStores])

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        )
    }

    if (!user) {
        return null
    }

    const isSuperAdmin = user.role === 'SUPER_ADMIN'
    const links = isSuperAdmin ? [...adminLinks, ...merchantLinks] : merchantLinks

    const handleLogout = () => {
        logout()
        router.push('/login')
    }

    return (
        <div className="min-h-screen flex">
            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 right-0 z-50 w-64 glass transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'
                    } lg:translate-x-0 lg:static`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="p-6 border-b border-white/10">
                        <Link href="/dashboard" className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center">
                                <MessageSquare className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xl font-bold text-white">سلة واتساب</span>
                        </Link>
                    </div>

                    {/* Store Selector */}
                    {stores.length > 0 && (
                        <div className="p-4 border-b border-white/10">
                            <label className="text-gray-400 text-xs mb-2 block">المتجر الحالي</label>
                            <div className="relative">
                                <select
                                    value={currentStore?.id || ''}
                                    onChange={(e) => {
                                        const store = stores.find(s => s.id === e.target.value)
                                        setCurrentStore(store || null)
                                    }}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white appearance-none cursor-pointer focus:outline-none focus:border-primary-500"
                                >
                                    {stores.map(store => (
                                        <option key={store.id} value={store.id} className="bg-dark-200">
                                            {store.name}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                        {isSuperAdmin && (
                            <div className="text-gray-500 text-xs uppercase tracking-wider mb-2 px-4">
                                الأدمن
                            </div>
                        )}

                        {links.map((link) => {
                            const isActive = pathname === link.href
                            const isAdminLink = link.href.includes('/admin')

                            if (isSuperAdmin && !isAdminLink && links.indexOf(link) === adminLinks.length) {
                                return (
                                    <div key="divider">
                                        <div className="border-t border-white/10 my-4"></div>
                                        <div className="text-gray-500 text-xs uppercase tracking-wider mb-2 px-4">
                                            المتجر
                                        </div>
                                        <Link
                                            href={link.href}
                                            className={`sidebar-link ${isActive ? 'active' : ''}`}
                                        >
                                            <link.icon className="w-5 h-5" />
                                            {link.label}
                                        </Link>
                                    </div>
                                )
                            }

                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                                >
                                    <link.icon className="w-5 h-5" />
                                    {link.label}
                                </Link>
                            )
                        })}
                    </nav>

                    {/* User */}
                    <div className="p-4 border-t border-white/10">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center">
                                <span className="text-primary-400 font-bold">{user.name.charAt(0)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-medium truncate">{user.name}</p>
                                <p className="text-gray-400 text-sm truncate">{user.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-red-400 py-2 rounded-lg hover:bg-red-500/10 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            تسجيل الخروج
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 lg:mr-0">
                {/* Top Bar */}
                <header className="sticky top-0 z-40 glass px-6 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={toggleSidebar}
                            className="lg:hidden text-gray-400 hover:text-white"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="flex items-center gap-4">
                            <button className="relative p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10">
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full"></span>
                            </button>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-6">
                    {children}
                </div>
            </main>

            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={toggleSidebar}
                />
            )}
        </div>
    )
}
