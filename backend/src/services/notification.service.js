const prisma = require('../lib/prisma');
const whatsappService = require('./whatsapp.service');

class NotificationService {
    /**
     * Process order status change
     */
    async processOrderStatusChange(storeId, order, newStatus) {
        switch (newStatus) {
            case 'CONFIRMED':
                return whatsappService.sendOrderConfirmation(storeId, order);

            case 'SHIPPED':
                return whatsappService.sendOrderShipped(storeId, order);

            case 'DELIVERED':
                return this.sendOrderDelivered(storeId, order);

            case 'CANCELLED':
                return this.sendOrderCancelled(storeId, order);

            default:
                console.log(`No notification for status: ${newStatus}`);
                return null;
        }
    }

    /**
     * Send order delivered notification
     */
    async sendOrderDelivered(storeId, order) {
        const store = await prisma.store.findUnique({
            where: { id: storeId }
        });

        const template = await prisma.template.findFirst({
            where: {
                storeId,
                type: 'ORDER_DELIVERED',
                isActive: true
            }
        });

        if (!template || !template.whatsappTemplateId) {
            console.log('Order delivered template not found');
            return null;
        }

        const variables = [
            order.customerName,
            order.sallaOrderId
        ];

        return whatsappService.sendTemplateMessage(
            store,
            order.customerPhone,
            template.whatsappTemplateId,
            variables
        );
    }

    /**
     * Send order cancelled notification
     */
    async sendOrderCancelled(storeId, order) {
        const store = await prisma.store.findUnique({
            where: { id: storeId }
        });

        const template = await prisma.template.findFirst({
            where: {
                storeId,
                type: 'ORDER_CANCELLED',
                isActive: true
            }
        });

        if (!template || !template.whatsappTemplateId) {
            console.log('Order cancelled template not found');
            return null;
        }

        const variables = [
            order.customerName,
            order.sallaOrderId
        ];

        return whatsappService.sendTemplateMessage(
            store,
            order.customerPhone,
            template.whatsappTemplateId,
            variables
        );
    }

    /**
     * Check and send abandoned cart reminders
     */
    async processAbandonedCarts() {
        // Get carts that need reminders
        const carts = await prisma.abandonedCart.findMany({
            where: {
                recoveredAt: null,
                remindersSent: { lt: 3 }, // Max 3 reminders
                OR: [
                    { lastReminderAt: null },
                    {
                        lastReminderAt: {
                            lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
                        }
                    }
                ],
                abandonedAt: {
                    lt: new Date(Date.now() - 60 * 60 * 1000) // At least 1 hour old
                }
            },
            include: {
                store: true
            }
        });

        console.log(`Processing ${carts.length} abandoned carts`);

        const results = [];

        for (const cart of carts) {
            if (cart.store.whatsappPhoneId && cart.store.whatsappAccessToken) {
                try {
                    const result = await whatsappService.sendAbandonedCartReminder(
                        cart.storeId,
                        cart
                    );
                    results.push({ cartId: cart.id, ...result });
                } catch (error) {
                    console.error(`Failed to send reminder for cart ${cart.id}:`, error);
                    results.push({ cartId: cart.id, success: false, error: error.message });
                }
            }
        }

        return results;
    }

    /**
     * Get notification stats for a store
     */
    async getStats(storeId, period = '7d') {
        const periodMap = {
            '24h': 1,
            '7d': 7,
            '30d': 30
        };

        const days = periodMap[period] || 7;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const [total, sent, delivered, read, failed] = await Promise.all([
            prisma.notification.count({
                where: { storeId, createdAt: { gte: startDate } }
            }),
            prisma.notification.count({
                where: { storeId, status: 'SENT', createdAt: { gte: startDate } }
            }),
            prisma.notification.count({
                where: { storeId, status: 'DELIVERED', createdAt: { gte: startDate } }
            }),
            prisma.notification.count({
                where: { storeId, status: 'READ', createdAt: { gte: startDate } }
            }),
            prisma.notification.count({
                where: { storeId, status: 'FAILED', createdAt: { gte: startDate } }
            })
        ]);

        return {
            period,
            total,
            sent,
            delivered,
            read,
            failed,
            deliveryRate: total > 0 ? ((delivered / total) * 100).toFixed(2) : 0,
            readRate: delivered > 0 ? ((read / delivered) * 100).toFixed(2) : 0
        };
    }
}

module.exports = new NotificationService();
