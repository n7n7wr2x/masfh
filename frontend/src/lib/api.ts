import axios from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
const API_URL = `${BASE_URL.replace(/\/$/, '')}/api`

console.log('🔌 API Connected to:', API_URL);

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Add token to requests
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
    }
    return config
})

// Handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const message = error.response?.data?.error || 'حدث خطأ ما'

        // Redirect to login on 401
        if (error.response?.status === 401 && typeof window !== 'undefined') {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            window.location.href = '/login'
        }

        return Promise.reject(new Error(message))
    }
)

// Auth API
export const authApi = {
    login: async (email: string, password: string) => {
        const { data } = await api.post('/auth/login', { email, password })
        return data
    },

    register: async (name: string, email: string, password: string) => {
        const { data } = await api.post('/auth/register', { name, email, password })
        return data
    },

    getProfile: async () => {
        const { data } = await api.get('/auth/me')
        return data
    },

    updateProfile: async (name: string, email: string) => {
        const { data } = await api.put('/auth/profile', { name, email })
        return data
    },

    changePassword: async (currentPassword: string, newPassword: string) => {
        const { data } = await api.put('/auth/password', { currentPassword, newPassword })
        return data
    }
}

// Stores API
export const storesApi = {
    getAll: async () => {
        const { data } = await api.get('/stores')
        return data
    },

    getOne: async (storeId: string) => {
        const { data } = await api.get(`/stores/${storeId}`)
        return data
    },

    create: async (name: string) => {
        const { data } = await api.post('/stores', { name })
        return data
    },

    update: async (storeId: string, updates: any) => {
        const { data } = await api.put(`/stores/${storeId}`, updates)
        return data
    },

    delete: async (storeId: string) => {
        const { data } = await api.delete(`/stores/${storeId}`)
        return data
    },

    getStats: async (storeId: string, period = '7d') => {
        const { data } = await api.get(`/stores/${storeId}/stats?period=${period}`)
        return data
    }
}

// Salla API
export const sallaApi = {
    getConnectUrl: async (storeId: string) => {
        const { data } = await api.get(`/salla/connect/${storeId}`)
        return data
    },

    getStatus: async (storeId: string) => {
        const { data } = await api.get(`/salla/status/${storeId}`)
        return data
    },

    disconnect: async (storeId: string) => {
        const { data } = await api.post(`/salla/disconnect/${storeId}`)
        return data
    }
}

// WhatsApp API
export const whatsappApi = {
    connect: async (storeId: string, credentials: any) => {
        const { data } = await api.post(`/whatsapp/connect/${storeId}`, credentials)
        return data
    },

    getStatus: async (storeId: string) => {
        const { data } = await api.get(`/whatsapp/status/${storeId}`)
        return data
    },

    disconnect: async (storeId: string) => {
        const { data } = await api.post(`/whatsapp/disconnect/${storeId}`)
        return data
    },

    sendTest: async (storeId: string, phone: string, templateName: string, variables?: string[]) => {
        const { data } = await api.post(`/whatsapp/send/${storeId}`, { phone, templateName, variables })
        return data
    },

    getNotifications: async (storeId: string, page = 1, type?: string) => {
        const { data } = await api.get(`/whatsapp/notifications/${storeId}?page=${page}${type ? `&type=${type}` : ''}`)
        return data
    }
}

// Templates API
export const templatesApi = {
    getAll: async (storeId: string) => {
        const { data } = await api.get(`/templates/${storeId}`)
        return data
    },

    create: async (storeId: string, template: any) => {
        const { data } = await api.post(`/templates/${storeId}`, template)
        return data
    },

    update: async (storeId: string, templateId: string, updates: any) => {
        const { data } = await api.put(`/templates/${storeId}/${templateId}`, updates)
        return data
    },

    delete: async (storeId: string, templateId: string) => {
        const { data } = await api.delete(`/templates/${storeId}/${templateId}`)
        return data
    },

    createDefaults: async (storeId: string) => {
        const { data } = await api.post(`/templates/${storeId}/default`)
        return data
    }
}

// Campaigns API
export const campaignsApi = {
    getAll: async (storeId: string, page = 1, status?: string) => {
        const { data } = await api.get(`/campaigns/${storeId}?page=${page}${status ? `&status=${status}` : ''}`)
        return data
    },

    getOne: async (storeId: string, campaignId: string) => {
        const { data } = await api.get(`/campaigns/${storeId}/${campaignId}`)
        return data
    },

    create: async (storeId: string, campaign: any) => {
        const { data } = await api.post(`/campaigns/${storeId}`, campaign)
        return data
    },

    update: async (storeId: string, campaignId: string, updates: any) => {
        const { data } = await api.put(`/campaigns/${storeId}/${campaignId}`, updates)
        return data
    },

    send: async (storeId: string, campaignId: string) => {
        const { data } = await api.post(`/campaigns/${storeId}/${campaignId}/send`)
        return data
    },

    cancel: async (storeId: string, campaignId: string) => {
        const { data } = await api.post(`/campaigns/${storeId}/${campaignId}/cancel`)
        return data
    },

    delete: async (storeId: string, campaignId: string) => {
        const { data } = await api.delete(`/campaigns/${storeId}/${campaignId}`)
        return data
    }
}

// Admin API
export const adminApi = {
    getDashboard: async () => {
        const { data } = await api.get('/admin/dashboard')
        return data
    },

    getUsers: async (page = 1, search?: string) => {
        const { data } = await api.get(`/admin/users?page=${page}${search ? `&search=${search}` : ''}`)
        return data
    },

    createUser: async (user: any) => {
        const { data } = await api.post('/admin/users', user)
        return data
    },

    updateUser: async (userId: string, updates: any) => {
        const { data } = await api.put(`/admin/users/${userId}`, updates)
        return data
    },

    deleteUser: async (userId: string) => {
        const { data } = await api.delete(`/admin/users/${userId}`)
        return data
    },

    getStores: async (page = 1, search?: string) => {
        const { data } = await api.get(`/admin/stores?page=${page}${search ? `&search=${search}` : ''}`)
        return data
    },

    getAnalytics: async (period = '7d') => {
        const { data } = await api.get(`/admin/analytics?period=${period}`)
        return data
    },

    getOrders: async (limit = 100) => {
        const { data } = await api.get(`/admin/orders?limit=${limit}`)
        return data
    },

    getWebhooks: async (page = 1, limit = 20, source?: string, event?: string) => {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            ...(source && { source }),
            ...(event && { event })
        })
        const { data } = await api.get(`/admin/webhooks?${params}`)
        return data
    },

    clearWebhooks: async () => {
        const { data } = await api.delete('/admin/webhooks')
        return data
    }
}

// Plans API (Admin)
export const plansApi = {
    getAll: async () => {
        const { data } = await api.get('/plans/all') // Corrected endpoint based on usage
        return data
    },

    getOne: async (planId: string) => {
        const { data } = await api.get(`/plans/${planId}`)
        return data
    },

    create: async (plan: any) => {
        const { data } = await api.post('/plans', plan)
        return data
    },

    update: async (planId: string, updates: any) => {
        const { data } = await api.put(`/plans/${planId}`, updates)
        return data
    },

    delete: async (planId: string) => {
        const { data } = await api.delete(`/plans/${planId}`)
        return data
    }
}

// Contacts API
export const contactsApi = {
    getAll: async (storeId: string, page = 1, search?: string) => {
        const query = search ? `&search=${encodeURIComponent(search)}` : ''
        const { data } = await api.get(`/contacts/${storeId}?page=${page}${query}`)
        return data
    },

    sync: async (storeId: string) => {
        const { data } = await api.post(`/contacts/${storeId}/sync`)
        return data
    },

    create: async (storeId: string, contact: any) => {
        const { data } = await api.post(`/contacts/${storeId}`, contact)
        return data
    },

    update: async (storeId: string, contactId: string, updates: any) => {
        const { data } = await api.put(`/contacts/${storeId}/${contactId}`, updates)
        return data
    },

    delete: async (storeId: string, contactId: string) => {
        const { data } = await api.delete(`/contacts/${storeId}/${contactId}`)
        return data
    },

    block: async (storeId: string, contactId: string, blocked: boolean) => {
        const { data } = await api.post(`/contacts/${storeId}/${contactId}/block`, { blocked })
        return data
    },

    import: async (storeId: string, contacts: any[]) => {
        const { data } = await api.post(`/contacts/${storeId}/import`, { contacts })
        return data
    }
}

// Conversations API
export const conversationsApi = {
    getAll: async (storeId: string, archived = false) => {
        const { data } = await api.get(`/conversations/${storeId}?archived=${archived}`)
        return data
    },

    getOne: async (storeId: string, conversationId: string) => {
        const { data } = await api.get(`/conversations/${storeId}/${conversationId}`)
        return data
    },

    sendMessage: async (storeId: string, conversationId: string, content: string, type = 'text') => {
        const { data } = await api.post(`/conversations/${storeId}/${conversationId}/send`, { content, type })
        return data
    },

    startLikely: async (storeId: string, payload: any) => {
        // payload: { customerPhone, customerName, templateName }
        const { data } = await api.post(`/conversations/${storeId}/new`, payload)
        return data
    },

    archive: async (storeId: string, conversationId: string, archived: boolean) => {
        const { data } = await api.post(`/conversations/${storeId}/${conversationId}/archive`, { archived })
        return data
    }
}

export default api
