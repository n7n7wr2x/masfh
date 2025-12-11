import Link from 'next/link'
import { MessageSquare, ShoppingCart, Bell, Zap, ArrowLeft, CheckCircle } from 'lucide-react'

export default function Home() {
    return (
        <main className="min-h-screen">
            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 glass">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center">
                            <MessageSquare className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-bold text-white">سلة واتساب</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/login" className="text-gray-300 hover:text-white transition-colors">
                            تسجيل الدخول
                        </Link>
                        <Link href="/register" className="btn-primary">
                            ابدأ مجاناً
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6">
                <div className="max-w-7xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/20 rounded-full px-4 py-2 mb-8">
                        <Zap className="w-4 h-4 text-primary-400" />
                        <span className="text-primary-400 text-sm">تكامل كامل مع واتساب بزنس API</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
                        اربط متجرك بـ
                        <span className="gradient-text"> واتساب </span>
                        بكل سهولة
                    </h1>

                    <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-10">
                        أرسل إشعارات تلقائية لعملائك عند تحديث حالة الطلب، واستعد السلات المتروكة،
                        وأطلق حملاتك التسويقية عبر واتساب
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/register" className="btn-primary text-lg px-8 py-4 flex items-center justify-center gap-2">
                            ابدأ الآن مجاناً
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <Link href="#features" className="btn-secondary text-lg px-8 py-4">
                            اكتشف المزايا
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-white mb-4">لماذا سلة واتساب؟</h2>
                        <p className="text-gray-400 text-lg">كل ما تحتاجه لتواصل فعال مع عملائك</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="card group hover:scale-105">
                            <div className="w-14 h-14 bg-primary-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:animate-pulse-glow">
                                <Bell className="w-7 h-7 text-primary-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">إشعارات الطلبات</h3>
                            <p className="text-gray-400">
                                أرسل تحديثات تلقائية لعملائك عند تأكيد الطلب، الشحن، والتوصيل
                            </p>
                            <ul className="mt-4 space-y-2">
                                <li className="flex items-center gap-2 text-gray-300 text-sm">
                                    <CheckCircle className="w-4 h-4 text-primary-400" />
                                    تأكيد الطلب
                                </li>
                                <li className="flex items-center gap-2 text-gray-300 text-sm">
                                    <CheckCircle className="w-4 h-4 text-primary-400" />
                                    تتبع الشحنة
                                </li>
                                <li className="flex items-center gap-2 text-gray-300 text-sm">
                                    <CheckCircle className="w-4 h-4 text-primary-400" />
                                    تأكيد التوصيل
                                </li>
                            </ul>
                        </div>

                        {/* Feature 2 */}
                        <div className="card group hover:scale-105">
                            <div className="w-14 h-14 bg-yellow-500/20 rounded-2xl flex items-center justify-center mb-6">
                                <ShoppingCart className="w-7 h-7 text-yellow-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">السلات المتروكة</h3>
                            <p className="text-gray-400">
                                استعد المبيعات الضائعة بإرسال تذكيرات ذكية للعملاء
                            </p>
                            <ul className="mt-4 space-y-2">
                                <li className="flex items-center gap-2 text-gray-300 text-sm">
                                    <CheckCircle className="w-4 h-4 text-yellow-400" />
                                    تذكير تلقائي
                                </li>
                                <li className="flex items-center gap-2 text-gray-300 text-sm">
                                    <CheckCircle className="w-4 h-4 text-yellow-400" />
                                    كوبونات خصم
                                </li>
                                <li className="flex items-center gap-2 text-gray-300 text-sm">
                                    <CheckCircle className="w-4 h-4 text-yellow-400" />
                                    رابط مباشر للسلة
                                </li>
                            </ul>
                        </div>

                        {/* Feature 3 */}
                        <div className="card group hover:scale-105">
                            <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6">
                                <MessageSquare className="w-7 h-7 text-blue-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">الحملات التسويقية</h3>
                            <p className="text-gray-400">
                                أطلق حملات واتساب جماعية لعملائك مع تقارير مفصلة
                            </p>
                            <ul className="mt-4 space-y-2">
                                <li className="flex items-center gap-2 text-gray-300 text-sm">
                                    <CheckCircle className="w-4 h-4 text-blue-400" />
                                    رسائل جماعية
                                </li>
                                <li className="flex items-center gap-2 text-gray-300 text-sm">
                                    <CheckCircle className="w-4 h-4 text-blue-400" />
                                    جدولة الحملات
                                </li>
                                <li className="flex items-center gap-2 text-gray-300 text-sm">
                                    <CheckCircle className="w-4 h-4 text-blue-400" />
                                    تقارير الأداء
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-6">
                <div className="max-w-4xl mx-auto text-center card">
                    <h2 className="text-3xl font-bold text-white mb-4">جاهز لتحسين تواصلك مع عملائك؟</h2>
                    <p className="text-gray-400 mb-8">ابدأ اليوم مجاناً وجرب قوة التكامل مع واتساب بزنس</p>
                    <Link href="/register" className="btn-primary text-lg px-8 py-4 inline-flex items-center gap-2">
                        ابدأ الآن
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-6 border-t border-white/5">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center">
                            <MessageSquare className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-white font-bold">سلة واتساب</span>
                    </div>
                    <p className="text-gray-500 text-sm">
                        © 2024 سلة واتساب. جميع الحقوق محفوظة
                    </p>
                </div>
            </footer>
        </main>
    )
}
