const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsapp.service');
const prisma = require('../lib/prisma');
const { authenticate, requireStoreAccess } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * @route   POST /api/whatsapp/connect/:storeId
 * @desc    Connect WhatsApp Business to store
 */
router.post('/connect/:storeId', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const { accessToken } = req.body;

    if (!accessToken) {
        return res.status(400).json({ error: 'Access Token مطلوب' });
    }

    try {
        // 1. Exchange for Long-Lived Token
        const longToken = await whatsappService.exchangeLongLivedToken(accessToken);

        // 2. Get WABA Details
        const waba = await whatsappService.getWABA(longToken);
        const wabaId = waba.id;

        // 3. Get Phone Numbers
        const phones = await whatsappService.getPhoneNumbers(wabaId, longToken);
        if (!phones || phones.length === 0) {
            return res.status(400).json({ error: 'لا يوجد أرقام هاتف في هذا الحساب' });
        }

        // Use the first verified number, or just the first one
        const phoneNumber = phones[0];
        const phoneId = phoneNumber.id;

        // 4. Subscribe to Webhooks
        await whatsappService.subscribeWabaToWebhooks(wabaId, longToken);

        // 5. Save to Database
        await prisma.store.update({
            where: { id: req.params.storeId },
            data: {
                whatsappPhoneId: phoneId,
                whatsappBusinessId: wabaId,
                whatsappAccessToken: longToken
            }
        });

        res.json({
            message: 'تم ربط واتساب بنجاح',
            phone: phoneNumber.display_phone_number
        });

    } catch (error) {
        console.error('Connect Error:', error);
        res.status(500).json({ error: error.message || 'فشل في عملية الربط' });
    }
}));

/**
 * @route   POST /api/whatsapp/disconnect/:storeId
 * @desc    Disconnect WhatsApp from store
 */
router.post('/disconnect/:storeId', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    await prisma.store.update({
        where: { id: req.params.storeId },
        data: {
            whatsappPhoneId: null,
            whatsappBusinessId: null,
            whatsappAccessToken: null
        }
    });

    res.json({ message: 'تم فصل واتساب بنجاح' });
}));

/**
 * @route   GET /api/whatsapp/status/:storeId
 * @desc    Get WhatsApp connection status
 */
router.get('/status/:storeId', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const store = await prisma.store.findUnique({
        where: { id: req.params.storeId },
        select: {
            whatsappPhoneId: true,
            whatsappBusinessId: true
        }
    });

    res.json({
        connected: !!store.whatsappPhoneId,
        phoneId: store.whatsappPhoneId,
        businessId: store.whatsappBusinessId
    });
}));

/**
 * @route   POST /api/whatsapp/send/:storeId
 * @desc    Send a test message
 */
router.post('/send/:storeId', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const { phone, templateName, variables } = req.body;

    if (!phone || !templateName) {
        return res.status(400).json({ error: 'رقم الهاتف واسم القالب مطلوبان' });
    }

    const store = await prisma.store.findUnique({
        where: { id: req.params.storeId }
    });

    if (!store.whatsappPhoneId || !store.whatsappAccessToken) {
        return res.status(400).json({ error: 'المتجر غير مربوط بواتساب' });
    }

    const result = await whatsappService.sendTemplateMessage(
        store,
        phone,
        templateName,
        variables || []
    );

    res.json(result);
}));

/**
 * @route   GET /api/whatsapp/notifications/:storeId
 * @desc    Get notification history
 */
router.get('/notifications/:storeId', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, type } = req.query;

    const where = {
        storeId: req.params.storeId,
        ...(type && { type })
    };

    const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: parseInt(limit),
            include: {
                template: { select: { name: true } }
            }
        }),
        prisma.notification.count({ where })
    ]);

    res.json({
        notifications,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    });
}));

module.exports = router;
