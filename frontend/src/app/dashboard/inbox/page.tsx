'use client'

import { useEffect, useState, useRef } from 'react'
import { MessageSquare, Search, Send, User, Clock, Check, CheckCheck, AlertCircle, Plus, Archive, ArchiveRestore, FileText, Loader2 } from 'lucide-react'
import { useAuthStore, useStoreStore } from '@/lib/store'
import { conversationsApi } from '@/lib/api'

interface Message {
    id: string
    direction: 'inbound' | 'outbound'
    type: string
    content: string
    templateName?: string
    status: string
    sentAt: string
}

interface Conversation {
    id: string
    customerPhone: string
    customerName?: string
    lastMessage?: string
    lastMessageAt?: string
    unreadCount: number
    isArchived: boolean
    messages?: Message[]
}

export default function InboxPage() {
    const { token } = useAuthStore()
    const { currentStore, fetchStores } = useStoreStore()

    const [loading, setLoading] = useState(true)
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [sending, setSending] = useState(false)
    const [search, setSearch] = useState('')
    const [showArchived, setShowArchived] = useState(false)
    const [showNewChat, setShowNewChat] = useState(false)
    const [newChatPhone, setNewChatPhone] = useState('')
    const [newChatName, setNewChatName] = useState('')

    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        fetchStores()
    }, [])

    useEffect(() => {
        if (currentStore?.id) {
            fetchConversations()
        }
    }, [currentStore, showArchived])

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const fetchConversations = async () => {
        if (!currentStore?.id) return
        try {
            const data = await conversationsApi.getAll(currentStore.id, showArchived)
            // Ensure data is an array
            if (Array.isArray(data)) {
                setConversations(data)
            } else {
                setConversations([])
            }
        } catch (error) {
            console.error('Failed to fetch conversations:', error)
            setConversations([])
        } finally {
            setLoading(false)
        }
    }

    const fetchMessages = async (conversationId: string) => {
        if (!currentStore?.id) return
        try {
            const data = await conversationsApi.getOne(currentStore.id, conversationId)
            setMessages(data.messages || [])
            setSelectedConv(data)

            // Update unread count in list
            setConversations(prev => prev.map(c =>
                c.id === conversationId ? { ...c, unreadCount: 0 } : c
            ))
        } catch (error) {
            console.error('Failed to fetch messages:', error)
        }
    }

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedConv || !currentStore?.id) return

        setSending(true)
        try {
            const message = await conversationsApi.sendMessage(currentStore.id, selectedConv.id, newMessage)

            setMessages(prev => [...prev, message])
            setNewMessage('')
            fetchConversations() // Refresh list
        } catch (error) {
            console.error('Failed to send message:', error)
        } finally {
            setSending(false)
        }
    }

    const handleStartNewChat = async () => {
        if (!newChatPhone.trim() || !currentStore?.id) return

        setSending(true)
        try {
            const { conversation } = await conversationsApi.startLikely(currentStore.id, {
                customerPhone: newChatPhone,
                customerName: newChatName,
                templateName: 'hello_world'
            })

            setShowNewChat(false)
            setNewChatPhone('')
            setNewChatName('')
            fetchConversations()
            fetchMessages(conversation.id)
        } catch (error) {
            console.error('Failed to start conversation:', error)
        } finally {
            setSending(false)
        }
    }

    const handleArchive = async (conversationId: string, archive: boolean) => {
        if (!currentStore?.id) return
        try {
            await conversationsApi.archive(currentStore.id, conversationId, archive)
            fetchConversations()
            if (selectedConv?.id === conversationId) {
                setSelectedConv(null)
                setMessages([])
            }
        } catch (error) {
            console.error('Failed to archive:', error)
        }
    }

    const formatTime = (date: string) => {
        return new Date(date).toLocaleString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const formatDate = (date: string) => {
        const d = new Date(date)
        const today = new Date()

        if (d.toDateString() === today.toDateString()) {
            return 'اليوم'
        }

        return d.toLocaleDateString('ar-SA', {
            month: 'short',
            day: 'numeric'
        })
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'sent':
                return <Check className="w-3 h-3 text-gray-400" />
            case 'delivered':
                return <CheckCheck className="w-3 h-3 text-gray-400" />
            case 'read':
                return <CheckCheck className="w-3 h-3 text-blue-400" />
            case 'failed':
                return <AlertCircle className="w-3 h-3 text-red-400" />
            default:
                return null
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
        <div className="animate-fadeIn h-[calc(100vh-120px)]">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-white">صندوق الرسائل</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowArchived(!showArchived)}
                        className={`btn-secondary text-sm ${showArchived ? 'bg-primary-500/20' : ''}`}
                    >
                        {showArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                        {showArchived ? 'النشطة' : 'المؤرشفة'}
                    </button>
                    <button
                        onClick={() => setShowNewChat(true)}
                        className="btn-primary text-sm flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        محادثة جديدة
                    </button>
                </div>
            </div>

            <div className="flex gap-4 h-full">
                {/* Conversations List */}
                <div className="w-80 bg-gray-800/50 rounded-xl overflow-hidden flex flex-col">
                    <div className="p-3 border-b border-white/10">
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="بحث..."
                                className="input w-full pr-10 py-2 text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {conversations
                            .filter(c =>
                                !search ||
                                c.customerPhone.includes(search) ||
                                c.customerName?.toLowerCase().includes(search.toLowerCase())
                            )
                            .map((conv) => (
                                <div
                                    key={conv.id}
                                    onClick={() => fetchMessages(conv.id)}
                                    className={`p-3 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${selectedConv?.id === conv.id ? 'bg-white/10' : ''
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-primary-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                                            <User className="w-5 h-5 text-primary-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className="text-white font-medium truncate">
                                                    {conv.customerName || conv.customerPhone}
                                                </span>
                                                <span className="text-gray-500 text-xs">
                                                    {conv.lastMessageAt && formatDate(conv.lastMessageAt)}
                                                </span>
                                            </div>
                                            <p className="text-gray-400 text-sm truncate mt-1">
                                                {conv.lastMessage || 'لا توجد رسائل'}
                                            </p>
                                        </div>
                                        {conv.unreadCount > 0 && (
                                            <span className="bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full">
                                                {conv.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}

                        {conversations.length === 0 && (
                            <div className="text-center py-10 text-gray-500">
                                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>لا توجد محادثات</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 bg-gray-800/50 rounded-xl overflow-hidden flex flex-col">
                    {selectedConv ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary-500/20 rounded-full flex items-center justify-center">
                                        <User className="w-5 h-5 text-primary-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-medium">
                                            {selectedConv.customerName || selectedConv.customerPhone}
                                        </h3>
                                        <p className="text-gray-400 text-sm" dir="ltr">
                                            {selectedConv.customerPhone}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleArchive(selectedConv.id, !selectedConv.isArchived)}
                                    className="btn-secondary text-sm"
                                >
                                    {selectedConv.isArchived ? (
                                        <><ArchiveRestore className="w-4 h-4" /> استعادة</>
                                    ) : (
                                        <><Archive className="w-4 h-4" /> أرشفة</>
                                    )}
                                </button>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.direction === 'outbound' ? 'justify-start' : 'justify-end'}`}
                                    >
                                        <div
                                            className={`max-w-[70%] rounded-xl px-4 py-2 ${msg.direction === 'outbound'
                                                ? 'bg-primary-500 text-white'
                                                : 'bg-gray-700 text-white'
                                                }`}
                                        >
                                            {msg.type === 'template' && (
                                                <div className="flex items-center gap-1 text-xs opacity-70 mb-1">
                                                    <FileText className="w-3 h-3" />
                                                    قالب
                                                </div>
                                            )}
                                            <p>{msg.content}</p>
                                            <div className="flex items-center justify-end gap-1 mt-1">
                                                <span className="text-xs opacity-70">
                                                    {formatTime(msg.sentAt)}
                                                </span>
                                                {msg.direction === 'outbound' && getStatusIcon(msg.status)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="p-4 border-t border-white/10">
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                        placeholder="اكتب رسالتك..."
                                        className="input flex-1"
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={sending || !newMessage.trim()}
                                        className="btn-primary px-4"
                                    >
                                        {sending ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Send className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                                <p className="text-gray-500 text-xs mt-2">
                                    ⚠️ الرسائل النصية تعمل فقط خلال 24 ساعة من آخر رسالة من العميل
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500">
                            <div className="text-center">
                                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                <p>اختر محادثة للبدء</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* New Chat Modal */}
            {showNewChat && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold text-white mb-4">محادثة جديدة</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-300 text-sm mb-2">رقم الهاتف</label>
                                <input
                                    type="tel"
                                    value={newChatPhone}
                                    onChange={(e) => setNewChatPhone(e.target.value)}
                                    className="input w-full"
                                    placeholder="966512345678"
                                    dir="ltr"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-300 text-sm mb-2">اسم العميل (اختياري)</label>
                                <input
                                    type="text"
                                    value={newChatName}
                                    onChange={(e) => setNewChatName(e.target.value)}
                                    className="input w-full"
                                    placeholder="اسم العميل"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleStartNewChat}
                                disabled={sending || !newChatPhone}
                                className="btn-primary flex-1"
                            >
                                {sending ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'بدء المحادثة'}
                            </button>
                            <button
                                onClick={() => setShowNewChat(false)}
                                className="btn-secondary px-6"
                            >
                                إلغاء
                            </button>
                        </div>

                        <p className="text-gray-500 text-xs mt-4">
                            ℹ️ سيتم إرسال قالب ترحيب للعميل لبدء المحادثة
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
