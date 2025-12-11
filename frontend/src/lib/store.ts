import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi, storesApi } from './api'

// Types
interface User {
    id: string
    email: string
    name: string
    role: 'SUPER_ADMIN' | 'MERCHANT' | 'STAFF'
}

interface Store {
    id: string
    name: string
    sallaStoreId?: string
    sallaAccessToken?: string
    sallaTokenExpiresAt?: string
    whatsappPhoneId?: string
    isActive: boolean
}

// Auth Store
interface AuthState {
    user: User | null
    token: string | null
    isLoading: boolean
    login: (email: string, password: string) => Promise<void>
    register: (name: string, email: string, password: string) => Promise<void>
    logout: () => void
    checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isLoading: true,

            login: async (email: string, password: string) => {
                const { user, token } = await authApi.login(email, password)
                localStorage.setItem('token', token)
                set({ user, token, isLoading: false })
            },

            register: async (name: string, email: string, password: string) => {
                const { user, token } = await authApi.register(name, email, password)
                localStorage.setItem('token', token)
                set({ user, token, isLoading: false })
            },

            logout: () => {
                localStorage.removeItem('token')
                set({ user: null, token: null })
            },

            checkAuth: async () => {
                try {
                    const token = localStorage.getItem('token')
                    if (!token) {
                        set({ isLoading: false })
                        return
                    }
                    const user = await authApi.getProfile()
                    set({ user, token, isLoading: false })
                } catch {
                    localStorage.removeItem('token')
                    set({ user: null, token: null, isLoading: false })
                }
            }
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ token: state.token })
        }
    )
)

// Store Store (for managing stores)
interface StoreState {
    stores: Store[]
    currentStore: Store | null
    isLoading: boolean
    fetchStores: () => Promise<void>
    setCurrentStore: (store: Store | null) => void
    createStore: (name: string) => Promise<Store>
}

export const useStoreStore = create<StoreState>((set, get) => ({
    stores: [],
    currentStore: null,
    isLoading: false,

    fetchStores: async () => {
        set({ isLoading: true })
        try {
            const stores = await storesApi.getAll()
            set({ stores, isLoading: false })

            // Set first store as current if none selected
            if (!get().currentStore && stores.length > 0) {
                set({ currentStore: stores[0] })
            }
        } catch {
            set({ isLoading: false })
        }
    },

    setCurrentStore: (store) => {
        set({ currentStore: store })
    },

    createStore: async (name: string) => {
        const store = await storesApi.create(name)
        set((state) => ({ stores: [...state.stores, store] }))
        return store
    }
}))

// UI Store
interface UIState {
    sidebarOpen: boolean
    toggleSidebar: () => void
    setSidebarOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
    sidebarOpen: true,
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    setSidebarOpen: (open) => set({ sidebarOpen: open })
}))
