import type { Metadata } from 'next'
import { Tajawal } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const tajawal = Tajawal({
    weight: ['300', '400', '500', '700', '800'],
    subsets: ['arabic'],
    variable: '--font-tajawal',
})

export const metadata: Metadata = {
    title: 'سلة واتساب - ربط متجرك بواتساب بزنس',
    description: 'نظام متكامل لربط متجر سلة مع واتساب بزنس لإرسال إشعارات الطلبات والسلات المتروكة والحملات التسويقية',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="ar" dir="rtl" className="dark">
            <body className={`${tajawal.variable} font-sans antialiased`}>
                {children}
                <Toaster
                    position="top-center"
                    toastOptions={{
                        style: {
                            background: '#1e293b',
                            color: '#fff',
                            border: '1px solid rgba(255,255,255,0.1)',
                        },
                    }}
                />
            </body>
        </html>
    )
}
