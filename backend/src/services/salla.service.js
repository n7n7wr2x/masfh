const axios = require('axios');
const prisma = require('../lib/prisma');

class SallaService {
    constructor() {
        this.baseUrl = 'https://api.salla.dev/admin/v2';
        this.oauthUrl = 'https://accounts.salla.sa/oauth2';
    }

    /**
     * Get OAuth authorization URL
     */
    getAuthorizationUrl(storeId) {
        const params = new URLSearchParams({
            client_id: process.env.SALLA_CLIENT_ID,
            redirect_uri: process.env.SALLA_REDIRECT_URI,
            response_type: 'code',
            scope: 'offline_access',
            state: storeId // Pass store ID in state
        });

        return `${this.oauthUrl}/authorize?${params.toString()}`;
    }

    /**
     * Exchange authorization code for tokens
     */
    async getTokens(code) {
        try {
            const response = await axios.post(`${this.oauthUrl}/token`, {
                client_id: process.env.SALLA_CLIENT_ID,
                client_secret: process.env.SALLA_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code,
                redirect_uri: process.env.SALLA_REDIRECT_URI
            });

            return response.data;
        } catch (error) {
            console.error('Salla OAuth Error:', error.response?.data);
            throw new Error('فشل في الحصول على التوكن من سلة');
        }
    }

    /**
     * Refresh access token
     */
    async refreshToken(refreshToken) {
        try {
            const response = await axios.post(`${this.oauthUrl}/token`, {
                client_id: process.env.SALLA_CLIENT_ID,
                client_secret: process.env.SALLA_CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            });

            return response.data;
        } catch (error) {
            console.error('Salla Refresh Token Error:', error.response?.data);
            throw new Error('فشل في تجديد التوكن');
        }
    }

    /**
     * Get store information from Salla
     */
    async getStoreInfo(accessToken) {
        try {
            const response = await axios.get(`${this.baseUrl}/store/info`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            return response.data.data;
        } catch (error) {
            console.error('Salla Store Info Error:', error.response?.data);
            throw new Error('فشل في الحصول على معلومات المتجر');
        }
    }

    /**
     * Connect store to Salla
     */
    async connectStore(storeId, code) {
        // Get tokens
        const tokens = await this.getTokens(code);

        // Get store info from Salla
        const sallaStore = await this.getStoreInfo(tokens.access_token);

        // Calculate token expiry
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in);

        // Update store with Salla credentials
        const store = await prisma.store.update({
            where: { id: storeId },
            data: {
                sallaStoreId: sallaStore.id.toString(),
                sallaAccessToken: tokens.access_token,
                sallaRefreshToken: tokens.refresh_token,
                sallaTokenExpiresAt: expiresAt,
                name: sallaStore.name || store.name
            }
        });

        return store;
    }

    /**
     * Disconnect store from Salla
     */
    async disconnectStore(storeId) {
        await prisma.store.update({
            where: { id: storeId },
            data: {
                sallaStoreId: null,
                sallaAccessToken: null,
                sallaRefreshToken: null,
                sallaTokenExpiresAt: null
            }
        });

        return { message: 'تم فصل المتجر من سلة بنجاح' };
    }

    /**
     * Get valid access token (refresh if needed)
     */
    async getValidToken(storeId) {
        const store = await prisma.store.findUnique({
            where: { id: storeId }
        });

        if (!store.sallaAccessToken) {
            throw new Error('المتجر غير مربوط بسلة');
        }

        // Check if token is expired
        if (store.sallaTokenExpiresAt && new Date() >= store.sallaTokenExpiresAt) {
            // Refresh token
            const tokens = await this.refreshToken(store.sallaRefreshToken);

            const expiresAt = new Date();
            expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in);

            // Update store with new tokens
            await prisma.store.update({
                where: { id: storeId },
                data: {
                    sallaAccessToken: tokens.access_token,
                    sallaRefreshToken: tokens.refresh_token,
                    sallaTokenExpiresAt: expiresAt
                }
            });

            return tokens.access_token;
        }

        return store.sallaAccessToken;
    }

    /**
     * Make authenticated request to Salla API
     */
    async makeRequest(storeId, method, endpoint, data = null) {
        const accessToken = await this.getValidToken(storeId);

        try {
            const response = await axios({
                method,
                url: `${this.baseUrl}${endpoint}`,
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                data
            });

            return response.data;
        } catch (error) {
            console.error('Salla API Error:', error.response?.data);
            throw new Error('فشل في الاتصال بسلة API');
        }
    }

    /**
     * Get orders from Salla
     */
    async getOrders(storeId, page = 1) {
        return this.makeRequest(storeId, 'GET', `/orders?page=${page}`);
    }

    /**
     * Get single order from Salla
     */
    async getOrder(storeId, orderId) {
        return this.makeRequest(storeId, 'GET', `/orders/${orderId}`);
    }

    /**
     * Get customers from Salla
     */
    async getCustomers(storeId, page = 1) {
        return this.makeRequest(storeId, 'GET', `/customers?page=${page}`);
    }
}

module.exports = new SallaService();
