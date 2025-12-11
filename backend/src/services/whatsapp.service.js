const axios = require('axios');
const prisma = require('../lib/prisma');

class WhatsAppService {
    constructor() {
        this.baseUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
    }

    /**
     * Get API URL for a phone number
     */
    getApiUrl(phoneNumberId) {
        return `${this.baseUrl}/${phoneNumberId}`;
    }

    /**
     * Send a template message
     */
    async sendTemplateMessage(store, phone, templateName, variables = []) {
        try {
            const response = await axios.post(
                `${this.getApiUrl(store.whatsappPhoneId)}/messages`,
                {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: this.formatPhoneNumber(phone),
                    type: 'template',
                    template: {
                        name: templateName,
                        language: {
                            code: 'ar'
                        },
                        components: variables.length > 0 ? [
                            {
                                type: 'body',
                                parameters: variables.map(v => ({
                                    type: 'text',
                                    text: v
                                }))
                            }
                        ] : undefined
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${store.whatsappAccessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                success: true,
                messageId: response.data.messages?.[0]?.id
            };
        } catch (error) {
            console.error('WhatsApp Send Error:', error.response?.data);
            return {
                success: false,
                error: error.response?.data?.error?.message || 'فشل في إرسال الرسالة'
            };
        }
    }

    /**
     * Send a text message (only for 24hr window)
     */
    async sendTextMessage(store, phone, text) {
        try {
            const response = await axios.post(
                `${this.getApiUrl(store.whatsappPhoneId)}/messages`,
                {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: this.formatPhoneNumber(phone),
                    type: 'text',
                    text: {
                        preview_url: true,
                        body: text
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${store.whatsappAccessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                success: true,
                messageId: response.data.messages?.[0]?.id
            };
        } catch (error) {
            console.error('WhatsApp Send Error:', error.response?.data);
            return {
                success: false,
                error: error.response?.data?.error?.message || 'فشل في إرسال الرسالة'
            };
        }
    }

    /**
     * Format phone number for WhatsApp
     */
    formatPhoneNumber(phone) {
        // Remove any non-digit characters
        let formatted = phone.replace(/\D/g, '');

        // If starts with 0, replace with 966 (Saudi Arabia)
        if (formatted.startsWith('0')) {
            formatted = '966' + formatted.substring(1);
        }

        // If doesn't start with country code, add 966
        if (!formatted.startsWith('966') && formatted.length === 9) {
            formatted = '966' + formatted;
        }

        return formatted;
    }

    /**
     * Send order confirmation notification
     */
    async sendOrderConfirmation(storeId, order) {
        const store = await prisma.store.findUnique({
            where: { id: storeId }
        });

        if (!store.whatsappPhoneId || !store.whatsappAccessToken) {
            throw new Error('المتجر غير مربوط بواتساب');
        }

        // Get template
        const template = await prisma.template.findFirst({
            where: {
                storeId,
                type: 'ORDER_CONFIRMATION',
                isActive: true
            }
        });

        if (!template || !template.whatsappTemplateId) {
            throw new Error('قالب تأكيد الطلب غير موجود');
        }

        const variables = [
            order.customerName,
            order.sallaOrderId,
            order.total.toString(),
            order.currency
        ];

        const result = await this.sendTemplateMessage(
            store,
            order.customerPhone,
            template.whatsappTemplateId,
            variables
        );

        // Log notification
        await prisma.notification.create({
            data: {
                storeId,
                phone: order.customerPhone,
                type: 'ORDER_UPDATE',
                templateId: template.id,
                orderId: order.id,
                variables: { variables },
                whatsappMsgId: result.messageId,
                status: result.success ? 'SENT' : 'FAILED',
                error: result.error,
                sentAt: result.success ? new Date() : null
            }
        });

        return result;
    }

    /**
     * Send order shipped notification
     */
    async sendOrderShipped(storeId, order) {
        const store = await prisma.store.findUnique({
            where: { id: storeId }
        });

        if (!store.whatsappPhoneId || !store.whatsappAccessToken) {
            throw new Error('المتجر غير مربوط بواتساب');
        }

        const template = await prisma.template.findFirst({
            where: {
                storeId,
                type: 'ORDER_SHIPPED',
                isActive: true
            }
        });

        if (!template || !template.whatsappTemplateId) {
            throw new Error('قالب الشحن غير موجود');
        }

        const variables = [
            order.customerName,
            order.sallaOrderId,
            order.trackingNumber || 'سيتم التحديث قريباً'
        ];

        const result = await this.sendTemplateMessage(
            store,
            order.customerPhone,
            template.whatsappTemplateId,
            variables
        );

        await prisma.notification.create({
            data: {
                storeId,
                phone: order.customerPhone,
                type: 'ORDER_UPDATE',
                templateId: template.id,
                orderId: order.id,
                variables: { variables },
                whatsappMsgId: result.messageId,
                status: result.success ? 'SENT' : 'FAILED',
                error: result.error,
                sentAt: result.success ? new Date() : null
            }
        });

        return result;
    }

    /**
     * Send abandoned cart reminder
     */
    async sendAbandonedCartReminder(storeId, cart) {
        const store = await prisma.store.findUnique({
            where: { id: storeId }
        });

        if (!store.whatsappPhoneId || !store.whatsappAccessToken) {
            throw new Error('المتجر غير مربوط بواتساب');
        }

        const template = await prisma.template.findFirst({
            where: {
                storeId,
                type: 'ABANDONED_CART',
                isActive: true
            }
        });

        if (!template || !template.whatsappTemplateId) {
            throw new Error('قالب السلة المتروكة غير موجود');
        }

        const variables = [
            cart.customerName || 'عميلنا العزيز',
            cart.cartValue.toString(),
            cart.currency
        ];

        const result = await this.sendTemplateMessage(
            store,
            cart.customerPhone,
            template.whatsappTemplateId,
            variables
        );

        // Update cart
        await prisma.abandonedCart.update({
            where: { id: cart.id },
            data: {
                remindersSent: { increment: 1 },
                lastReminderAt: new Date()
            }
        });

        // Log notification
        await prisma.notification.create({
            data: {
                storeId,
                phone: cart.customerPhone,
                type: 'ABANDONED_CART',
                templateId: template.id,
                abandonedCartId: cart.id,
                variables: { variables },
                whatsappMsgId: result.messageId,
                status: result.success ? 'SENT' : 'FAILED',
                error: result.error,
                sentAt: result.success ? new Date() : null
            }
        });

        return result;
    }

    /**
     * Verify webhook from Meta
     */
    verifyWebhook(mode, token, challenge) {
        if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
            return challenge;
        }
        return null;
    }

    /**
     * Process incoming webhook
     */
    async processWebhook(payload) {
        // Handle message status updates
        if (payload.entry?.[0]?.changes?.[0]?.value?.statuses) {
            const statuses = payload.entry[0].changes[0].value.statuses;

            for (const status of statuses) {
                await prisma.notification.updateMany({
                    where: { whatsappMsgId: status.id },
                    data: {
                        status: status.status.toUpperCase(),
                        ...(status.status === 'delivered' && { deliveredAt: new Date() }),
                        ...(status.status === 'read' && { readAt: new Date() })
                    }
                });
            }
        }

        return { received: true };
    }
}

module.exports = new WhatsAppService();
