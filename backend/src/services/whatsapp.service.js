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
        // Allow a default token if env var is not set, to ease setup
        const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'salla_whatsapp_default_token';

        if (mode === 'subscribe' && token === verifyToken) {
            console.log('✅ Webhook verified successfully');
            return challenge;
        }

        console.error('❌ Webhook verification failed. Token mismatch.');
        return null;
    }

    /**
     * Process incoming webhook
     */
    /**
     * Handle incoming message
     */
    async handleIncomingMessage(store, message, contactInfo) {
        try {
            const customerPhone = message.from; // e.g. 966512345678
            const customerName = contactInfo?.profile?.name || message.from;

            // 1. Find or create Contact
            // We use upsert to ensure we have the latest info
            const contact = await prisma.contact.upsert({
                where: {
                    storeId_phone: {
                        storeId: store.id,
                        phone: customerPhone
                    }
                },
                update: {
                    name: customerName, // Update name if improved
                    messagesCount: { increment: 1 },
                    lastContactAt: new Date()
                },
                create: {
                    storeId: store.id,
                    phone: customerPhone,
                    name: customerName,
                    source: 'whatsapp',
                    messagesCount: 1,
                    lastContactAt: new Date()
                }
            });

            // 2. Find or create Conversation
            let conversation = await prisma.conversation.findUnique({
                where: {
                    storeId_customerPhone: {
                        storeId: store.id,
                        customerPhone: customerPhone
                    }
                }
            });

            if (!conversation) {
                conversation = await prisma.conversation.create({
                    data: {
                        storeId: store.id,
                        customerPhone: customerPhone,
                        customerName: customerName,
                        unreadCount: 1,
                        lastMessage: this.getMessagePreview(message),
                        lastMessageAt: new Date()
                    }
                });
            } else {
                // Update existing conversation
                await prisma.conversation.update({
                    where: { id: conversation.id },
                    data: {
                        customerName: customerName, // Keep name updated
                        unreadCount: { increment: 1 },
                        lastMessage: this.getMessagePreview(message),
                        lastMessageAt: new Date(),
                        isArchived: false // Bring back to inbox if archived
                    }
                });
            }

            // 3. Create Message
            await prisma.message.create({
                data: {
                    conversationId: conversation.id,
                    direction: 'inbound',
                    type: message.type,
                    content: this.getMessageContent(message),
                    whatsappMsgId: message.id,
                    status: 'read', // Incoming are implicitly valid/read by system
                    sentAt: new Date(parseInt(message.timestamp) * 1000)
                }
            });

            console.log(`📩 New message processed from ${customerName} (${customerPhone})`);

        } catch (error) {
            console.error('Error handling incoming message:', error);
            throw error;
        }
    }

    /**
     * Helper to get text content from message object
     */
    getMessageContent(message) {
        try {
            switch (message.type) {
                case 'text':
                    return message.text.body;
                case 'button':
                    return message.button.text;
                case 'interactive':
                    return message.interactive.button_reply?.title || message.interactive.list_reply?.title;
                case 'image':
                    return '[صورة]'; // We can add better media handling later
                case 'document':
                    return '[ملف]';
                case 'audio':
                    return '[صوت]';
                case 'video':
                    return '[فيديو]';
                case 'sticker':
                    return '[ملصق]';
                case 'location':
                    return '[موقع]';
                default:
                    return '[رسالة غير مدعومة]';
            }
        } catch (e) {
            return '[خطأ في قراءة المحتوى]';
        }
    }

    /**
     * Helper to get preview string for conversation list
     */
    getMessagePreview(message) {
        const content = this.getMessageContent(message);
        return content.length > 50 ? content.substring(0, 50) + '...' : content;
    }

    /**
     * Process incoming webhook
     */
    async processWebhook(payload) {
        try {
            const value = payload.entry?.[0]?.changes?.[0]?.value;
            if (!value) return { received: true };

            // 1. Handle Messages (Incoming)
            if (value.messages && value.messages.length > 0) {
                const phoneNumberId = value.metadata?.phone_number_id;

                if (phoneNumberId) {
                    // Find store by Phone ID
                    const store = await prisma.store.findFirst({
                        where: { whatsappPhoneId: phoneNumberId }
                    });

                    if (store) {
                        for (const message of value.messages) {
                            // Find contact info (name) if available
                            const contactInfo = value.contacts?.find(c => c.wa_id === message.from);
                            await this.handleIncomingMessage(store, message, contactInfo);
                        }
                    } else {
                        console.log(`⚠️ Received message for unknown Phone ID: ${phoneNumberId}`);
                    }
                }
            }

            // 2. Handle Status Updates (Outgoing)
            if (value.statuses) {
                const statuses = value.statuses;

                for (const status of statuses) {
                    // Update Notification status
                    await prisma.notification.updateMany({
                        where: { whatsappMsgId: status.id },
                        data: {
                            status: status.status.toUpperCase(),
                            ...(status.status === 'delivered' && { deliveredAt: new Date() }),
                            ...(status.status === 'read' && { readAt: new Date() })
                        }
                    });

                    // Update Conversation Message status
                    const msgStatus = status.status; // sent, delivered, read
                    await prisma.message.updateMany({
                        where: { whatsappMsgId: status.id },
                        data: {
                            status: msgStatus,
                            ...(msgStatus === 'delivered' && { deliveredAt: new Date() }),
                            ...(msgStatus === 'read' && { readAt: new Date() })
                        }
                    });
                }
            }

        } catch (error) {
            console.error('Error processing webhook payload:', error);
        }

        return { received: true };
    }
}

module.exports = new WhatsAppService();
