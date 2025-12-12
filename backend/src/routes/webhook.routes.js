const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const whatsappService = require('../services/whatsapp.service');
const notificationService = require('../services/notification.service');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * @route   GET /api/webhooks/whatsapp
 * @desc    Verify WhatsApp webhook
 */
router.get('/whatsapp', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const result = whatsappService.verifyWebhook(mode, token, challenge);

    if (result) {
        res.send(result);
    } else {
        res.status(403).send('Failed verification');
    }
});

/**
 * @route   POST /api/webhooks/whatsapp
 * @desc    Handle WhatsApp webhook events
 */
router.post('/whatsapp', asyncHandler(async (req, res) => {
    // Verify signature in production
    if (process.env.NODE_ENV === 'production') {
        const signature = req.headers['x-hub-signature-256'];
        if (!verifyWhatsAppSignature(req.body, signature)) {
            return res.status(401).json({ error: 'Invalid signature' });
        }
    }

    const result = await whatsappService.processWebhook(req.body);
    res.json(result);
}));

/**
 * Verify Salla webhook signature
 */
function verifySallaSignature(req, signature) {
    const secret = process.env.SALLA_WEBHOOK_SECRET;
    // Fallback to stringify if rawBody is missing (e.g. testing) although rawBody is preferred
    const payload = req.rawBody || JSON.stringify(req.body);

    if (!secret || !signature || !payload) return false;

    const computed = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(computed)
    );
}

/**
 * Verify WhatsApp webhook signature
 */
function verifyWhatsAppSignature(payload, signature) {
    const secret = process.env.WHATSAPP_APP_SECRET;
    if (!secret || !signature) return false;

    // WhatsApp signature format: sha256=...
    const hash = signature.split('sha256=')[1];
    if (!hash) return false;

    const computed = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(hash),
        Buffer.from(computed)
    );
}

/**
 * @route   POST /api/webhooks/salla
 * @desc    Handle Salla webhook events
 */
router.post('/salla', asyncHandler(async (req, res) => {
    // Verify signature
    const signature = req.headers['x-salla-signature'];

    if (process.env.NODE_ENV === 'production') {
        if (!verifySallaSignature(req, signature)) {
            console.error('Invalid Salla Signature');
            return res.status(401).json({ error: 'Invalid signature' });
        }
    }

    const { event, merchant, data } = req.body;

    console.log(`Salla webhook: ${event}`, JSON.stringify({ merchant, data }, null, 2));

    // Log webhook to database
    let webhookLog;
    try {
        webhookLog = await prisma.webhookLog.create({
            data: {
                source: 'salla',
                event: event || 'unknown',
                merchantId: merchant?.id?.toString(),
                payload: req.body,
                processed: false
            }
        });
    } catch (logError) {
        console.error('Failed to log webhook:', logError);
    }

    // Handle app.store.authorize - Easy Mode authentication
    if (event === 'app.store.authorize') {
        await handleAppStoreAuthorize(merchant, data);
        return res.json({ received: true, processed: true });
    }

    // Find store by Salla merchant ID
    const store = await prisma.store.findFirst({
        where: { sallaStoreId: merchant?.id?.toString() }
    });

    if (!store) {
        console.log('Store not found for merchant:', merchant?.id);
        return res.json({ received: true, processed: false });
    }

    try {
        switch (event) {
            case 'app.installed':
                await handleAppInstalled(store, merchant, data);
                break;

            case 'app.uninstalled':
                await handleAppUninstalled(store, merchant);
                break;

            case 'order.created':
                await handleOrderCreated(store, data);
                break;

            case 'order.updated':
                await handleOrderUpdated(store, data);
                break;

            case 'order.status.updated':
                await handleOrderStatusUpdated(store, data);
                break;

            case 'order.cancelled':
                await handleOrderCancelled(store, data);
                break;

            case 'order.refunded':
                await handleOrderRefunded(store, data);
                break;

            case 'order.shipped':
                await handleOrderShipped(store, data);
                break;

            case 'abandoned.cart':
                await handleAbandonedCart(store, data);
                break;

            default:
                console.log('Unhandled event:', event);
        }
    } catch (error) {
        console.error('Error processing webhook:', error);
    }

    res.json({ received: true });
}));

/**
 * Handle app.store.authorize event - Easy Mode authentication
 * This is called when a merchant authorizes the app from Salla App Store
 */
async function handleAppStoreAuthorize(merchant, data) {
    console.log('🔑 New merchant authorization');
    console.log('📦 Merchant raw:', merchant, '| Type:', typeof merchant);

    // Salla sends merchant as a number directly, not as an object
    // So we need to handle both cases
    const merchantId = typeof merchant === 'object' ? merchant?.id : merchant;
    console.log('🆔 Merchant ID:', merchantId);

    const accessToken = data?.access_token || data?.accessToken;
    const refreshToken = data?.refresh_token || data?.refreshToken;
    const expiresIn = data?.expires_in || data?.expires || 1209600; // 14 days default

    if (!accessToken) {
        console.error('No access token in app.store.authorize event');
        return;
    }

    // Fetch store info from Salla API to get email
    let merchantEmail = `merchant_${merchantId}@salla.store`;
    let merchantName = 'تاجر سلة';

    try {
        const axios = require('axios');
        const storeInfoResponse = await axios.get('https://api.salla.dev/admin/v2/store/info', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const storeInfo = storeInfoResponse.data?.data;
        console.log('📦 Store info from Salla:', JSON.stringify(storeInfo, null, 2));

        // Get email - for demo stores, extract from domain since they use support@salla.dev
        let email = storeInfo?.email;

        // If it's a demo store or email is the default salla email, extract from domain
        if (storeInfo?.type === 'demo' || email === 'support@salla.dev') {
            const domain = storeInfo?.domain || '';
            // Extract identifier from domain like: https://demostore.salla.sa/dev-vdtcna60bwpiqyem
            const match = domain.match(/dev-([a-zA-Z0-9]+)/);
            if (match && match[1]) {
                email = `${match[1]}@email.partners`;
                console.log('📧 Extracted email from domain for demo store:', email);
            }
        }

        merchantEmail = email || storeInfo?.user?.email || storeInfo?.merchant?.email || merchantEmail;
        merchantName = storeInfo?.name || storeInfo?.store_name || merchantName;

        console.log('📧 Final merchant email:', merchantEmail);
        console.log('📝 Fetched merchant name:', merchantName);
    } catch (apiError) {
        console.error('Failed to fetch store info from Salla:', apiError.response?.data || apiError.message);
        // Continue with fallback email
    }

    // Calculate token expiry
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

    // Generate random 8-character password
    const generatePassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        let password = '';
        for (let i = 0; i < 8; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    };

    // Find or create store
    let store = await prisma.store.findFirst({
        where: { sallaStoreId: merchantId?.toString() }
    });

    if (store) {
        // Update existing store with new tokens
        await prisma.store.update({
            where: { id: store.id },
            data: {
                sallaAccessToken: accessToken,
                sallaRefreshToken: refreshToken,
                sallaTokenExpiresAt: expiresAt,
                name: merchantName || store.name
            }
        });
        console.log('✅ Updated tokens for existing store:', store.id);
    } else {
        // Check if user with this email already exists
        let user = await prisma.user.findUnique({
            where: { email: merchantEmail }
        });

        let generatedPassword = null;

        if (!user) {
            // Create a new merchant user with the store email
            const bcrypt = require('bcryptjs');
            generatedPassword = generatePassword();
            const hashedPassword = await bcrypt.hash(generatedPassword, 10);

            user = await prisma.user.create({
                data: {
                    email: merchantEmail,
                    password: hashedPassword,
                    tempPassword: generatedPassword, // Store for admin to see
                    name: merchantName,
                    role: 'MERCHANT'
                }
            });

            console.log('👤 Created new merchant user:');
            console.log('   📧 Email:', merchantEmail);
            console.log('   🔐 Password:', generatedPassword);
            console.log('   📝 Name:', merchantName);
        }

        store = await prisma.store.create({
            data: {
                userId: user.id,
                name: merchantName,
                sallaStoreId: merchantId?.toString(),
                sallaAccessToken: accessToken,
                sallaRefreshToken: refreshToken,
                sallaTokenExpiresAt: expiresAt
            }
        });

        console.log('🏪 Created new store:', store.id);

        if (generatedPassword) {
            console.log('');
            console.log('='.repeat(50));
            console.log('🎉 NEW STORE REGISTERED!');
            console.log('='.repeat(50));
            console.log(`📧 Email: ${merchantEmail}`);
            console.log(`🔐 Password: ${generatedPassword}`);
            console.log(`🏪 Store: ${merchantName}`);
            console.log('='.repeat(50));
            console.log('');
        }
    }

    return store;
}

/**
 * Handle app.installed event
 */
async function handleAppInstalled(store, merchant, data) {
    console.log('📦 App installed for store:', store.id);
    // App is installed, we can update any store metadata if needed
}

/**
 * Handle app.uninstalled event
 */
async function handleAppUninstalled(store, merchant) {
    console.log('🗑️ App uninstalled for store:', store.id);

    // Clear tokens when app is uninstalled
    await prisma.store.update({
        where: { id: store.id },
        data: {
            sallaAccessToken: null,
            sallaRefreshToken: null,
            sallaTokenExpiresAt: null,
            isActive: false  // Deactivate the store
        }
    });

    // Deactivate the user account (don't delete it)
    if (store.userId) {
        await prisma.user.update({
            where: { id: store.userId },
            data: {
                isActive: false  // User can't login anymore
            }
        });
        console.log('🚫 User account deactivated:', store.userId);
    }

    console.log('✅ Store and user deactivated');
}

/**
 * Handle order.created event
 */
async function handleOrderCreated(store, data) {
    console.log('📦 Processing order.created for store:', store.id);

    // Extract customer info - Salla sends full_name and mobile with mobile_code
    const customerName = data.customer?.full_name || data.customer?.first_name || 'عميل';
    let customerPhone = '';

    // Phone can be number (569800090) or string (966569800090)
    if (data.customer?.mobile) {
        const mobile = data.customer.mobile.toString();
        const mobileCode = data.customer?.mobile_code?.replace('+', '') || '966';

        // If mobile doesn't start with country code, add it
        if (mobile.length <= 10 && !mobile.startsWith('966') && !mobile.startsWith('+')) {
            customerPhone = mobileCode + mobile;
        } else {
            customerPhone = mobile.replace('+', '');
        }
    }

    // Extract order total
    const total = data.amounts?.total?.amount || data.total?.amount || 0;
    const currency = data.currency || 'SAR';

    // Extract status
    const statusSlug = data.status?.slug || 'pending';
    const statusMap = {
        'pending': 'PENDING',
        'pending_review': 'PENDING',
        'new': 'PENDING',
        'in_progress': 'PROCESSING',
        'confirmed': 'CONFIRMED',
        'processing': 'PROCESSING',
        'shipped': 'SHIPPED',
        'delivered': 'DELIVERED',
        'cancelled': 'CANCELLED',
        'refunded': 'REFUNDED'
    };
    const status = statusMap[statusSlug] || 'PENDING';

    // Extract items with proper structure
    const items = (data.items || []).map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.amounts?.total?.amount || item.product?.price?.amount || 0,
        sku: item.sku,
        thumbnail: item.product_thumbnail || item.product?.thumbnail
    }));

    console.log('👤 Customer:', customerName, '| Phone:', customerPhone);
    console.log('💰 Total:', total, currency);
    console.log('📊 Status:', status, `(${statusSlug})`);
    console.log('🛒 Items:', items.length);

    const order = await prisma.order.upsert({
        where: {
            storeId_sallaOrderId: {
                storeId: store.id,
                sallaOrderId: data.id.toString()
            }
        },
        update: {
            customerName,
            customerPhone,
            status,
            total,
            items,
            updatedAt: new Date()
        },
        create: {
            storeId: store.id,
            sallaOrderId: data.id.toString(),
            customerName,
            customerPhone,
            customerEmail: data.customer?.email || '',
            status,
            total,
            currency,
            items,
            shippingAddress: data.shipping?.address || null
        }
    });

    console.log('✅ Order saved:', order.id);

    // Send confirmation notification
    if (order.customerPhone) {
        await notificationService.processOrderStatusChange(store.id, order, status);
    }

    return order;
}

/**
 * Handle order.updated event
 */
async function handleOrderUpdated(store, data) {
    return prisma.order.updateMany({
        where: {
            storeId: store.id,
            sallaOrderId: data.id.toString()
        },
        data: {
            total: data.total?.amount,
            items: data.items || [],
            updatedAt: new Date()
        }
    });
}

/**
 * Handle order.status.updated event
 * Note: In this event, order data is nested under data.order
 */
async function handleOrderStatusUpdated(store, data) {
    console.log('📊 Processing order.status.updated for store:', store.id);

    // In order.status.updated, the order info is in data.order
    const orderData = data.order || data;
    const orderId = orderData.id?.toString();

    console.log('🆔 Order ID:', orderId);
    console.log('📝 New status:', data.status || data.customized?.name);

    const statusMap = {
        'pending': 'PENDING',
        'pending_review': 'PENDING',
        'new': 'PENDING',
        'in_progress': 'PROCESSING',
        'under_review': 'PENDING',
        'confirmed': 'CONFIRMED',
        'processing': 'PROCESSING',
        'shipped': 'SHIPPED',
        'delivered': 'DELIVERED',
        'cancelled': 'CANCELLED',
        'refunded': 'REFUNDED',
        'completed': 'DELIVERED'
    };

    // Get status from various possible locations
    const statusSlug = data.customized?.slug || orderData.status?.slug || 'pending';
    const newStatus = statusMap[statusSlug] || 'PENDING';
    const statusName = data.status || data.customized?.name || statusSlug;

    console.log('🔄 Status slug:', statusSlug, '→', newStatus);

    // First try to find existing order
    let existingOrder = await prisma.order.findFirst({
        where: {
            storeId: store.id,
            sallaOrderId: orderId
        }
    });

    // If order doesn't exist, create it from the nested order data
    if (!existingOrder && orderData.customer) {
        console.log('📦 Order not found, creating from status update data...');

        let customerPhone = '';
        if (orderData.customer?.mobile) {
            const mobile = orderData.customer.mobile.toString();
            if (mobile.length <= 10 && !mobile.startsWith('966')) {
                customerPhone = '966' + mobile;
            } else {
                customerPhone = mobile.replace('+', '');
            }
        }

        existingOrder = await prisma.order.create({
            data: {
                storeId: store.id,
                sallaOrderId: orderId,
                customerName: orderData.customer?.name || orderData.customer?.first_name || 'عميل',
                customerPhone,
                customerEmail: orderData.customer?.email || '',
                status: newStatus,
                total: orderData.total?.amount || orderData.amounts?.total?.amount || 0,
                currency: orderData.currency || 'SAR',
                items: orderData.items || [],
                shippingAddress: orderData.shipping?.address || null
            }
        });
        console.log('✅ Created new order:', existingOrder.id);
    } else if (existingOrder) {
        // Update existing order
        await prisma.order.update({
            where: { id: existingOrder.id },
            data: {
                status: newStatus,
                updatedAt: new Date()
            }
        });
        console.log('✅ Updated order status:', existingOrder.id, '→', newStatus);
    }

    // Send notification for status change
    if (existingOrder?.customerPhone) {
        await notificationService.processOrderStatusChange(store.id, existingOrder, newStatus);
    }

    return existingOrder;
}

/**
 * Handle order.shipped event
 */
async function handleOrderShipped(store, data) {
    const order = await prisma.order.updateMany({
        where: {
            storeId: store.id,
            sallaOrderId: data.id.toString()
        },
        data: {
            status: 'SHIPPED',
            trackingNumber: data.shipment?.tracking_number,
            updatedAt: new Date()
        }
    });

    const updatedOrder = await prisma.order.findFirst({
        where: {
            storeId: store.id,
            sallaOrderId: data.id.toString()
        }
    });

    if (updatedOrder && updatedOrder.customerPhone) {
        await notificationService.processOrderStatusChange(store.id, updatedOrder, 'SHIPPED');
    }

    return order;
}

/**
 * Handle order.cancelled event
 */
async function handleOrderCancelled(store, data) {
    const order = await prisma.order.updateMany({
        where: {
            storeId: store.id,
            sallaOrderId: data.id.toString()
        },
        data: {
            status: 'CANCELLED',
            updatedAt: new Date()
        }
    });

    const updatedOrder = await prisma.order.findFirst({
        where: {
            storeId: store.id,
            sallaOrderId: data.id.toString()
        }
    });

    if (updatedOrder && updatedOrder.customerPhone) {
        await notificationService.processOrderStatusChange(store.id, updatedOrder, 'CANCELLED');
    }

    return order;
}

/**
 * Handle order.refunded event
 */
async function handleOrderRefunded(store, data) {
    return prisma.order.updateMany({
        where: {
            storeId: store.id,
            sallaOrderId: data.id.toString()
        },
        data: {
            status: 'REFUNDED',
            updatedAt: new Date()
        }
    });
}

/**
 * Handle abandoned.cart event
 */
async function handleAbandonedCart(store, data) {
    const cart = await prisma.abandonedCart.upsert({
        where: {
            id: data.id?.toString() || 'temp'
        },
        update: {
            cartValue: data.total?.amount || 0,
            items: data.items || []
        },
        create: {
            storeId: store.id,
            sallaCartId: data.id?.toString(),
            customerName: data.customer?.first_name,
            customerPhone: data.customer?.mobile || '',
            customerEmail: data.customer?.email,
            cartValue: data.total?.amount || 0,
            currency: data.total?.currency || 'SAR',
            items: data.items || [],
            abandonedAt: new Date()
        }
    });

    return cart;
}

module.exports = router;
