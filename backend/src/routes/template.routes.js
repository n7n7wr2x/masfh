const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate, requireStoreAccess } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * @route   GET /api/templates/:storeId
 * @desc    Get all templates for a store
 */
router.get('/:storeId', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const { type, status } = req.query;

    const templates = await prisma.template.findMany({
        where: {
            storeId: req.params.storeId,
            ...(type && { type }),
            ...(status && { status })
        },
        orderBy: { createdAt: 'desc' }
    });

    res.json(templates);
}));

/**
 * @route   POST /api/templates/:storeId
 * @desc    Create a new template
 */
router.post('/:storeId', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const { name, type, whatsappTemplateId, content, variables } = req.body;

    if (!name || !type || !content) {
        return res.status(400).json({ error: 'الاسم والنوع والمحتوى مطلوبون' });
    }

    const template = await prisma.template.create({
        data: {
            storeId: req.params.storeId,
            name,
            type,
            whatsappTemplateId,
            content,
            variables: variables || []
        }
    });

    res.status(201).json(template);
}));

/**
 * @route   GET /api/templates/:storeId/:templateId
 * @desc    Get template details
 */
router.get('/:storeId/:templateId', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const template = await prisma.template.findUnique({
        where: { id: req.params.templateId }
    });

    if (!template || template.storeId !== req.params.storeId) {
        return res.status(404).json({ error: 'القالب غير موجود' });
    }

    res.json(template);
}));

/**
 * @route   PUT /api/templates/:storeId/:templateId
 * @desc    Update template
 */
router.put('/:storeId/:templateId', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const { name, whatsappTemplateId, content, variables, isActive } = req.body;

    const template = await prisma.template.findUnique({
        where: { id: req.params.templateId }
    });

    if (!template || template.storeId !== req.params.storeId) {
        return res.status(404).json({ error: 'القالب غير موجود' });
    }

    const updated = await prisma.template.update({
        where: { id: req.params.templateId },
        data: {
            ...(name && { name }),
            ...(whatsappTemplateId && { whatsappTemplateId }),
            ...(content && { content }),
            ...(variables && { variables }),
            ...(typeof isActive === 'boolean' && { isActive })
        }
    });

    res.json(updated);
}));

/**
 * @route   DELETE /api/templates/:storeId/:templateId
 * @desc    Delete template
 */
router.delete('/:storeId/:templateId', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const template = await prisma.template.findUnique({
        where: { id: req.params.templateId }
    });

    if (!template || template.storeId !== req.params.storeId) {
        return res.status(404).json({ error: 'القالب غير موجود' });
    }

    await prisma.template.delete({
        where: { id: req.params.templateId }
    });

    res.json({ message: 'تم حذف القالب' });
}));

/**
 * @route   POST /api/templates/:storeId/default
 * @desc    Create default templates for a store
 */
router.post('/:storeId/default', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const storeId = req.params.storeId;

    const defaultTemplates = [
        {
            name: 'تأكيد الطلب',
            type: 'ORDER_CONFIRMATION',
            content: 'مرحباً {{1}} 👋\n\nتم استلام طلبك رقم #{{2}} بنجاح ✅\n\n💰 المبلغ: {{3}} {{4}}\n\nسنقوم بتحديثك عند شحن الطلب.\n\nشكراً لتسوقك معنا! 🛍️',
            variables: ['customerName', 'orderId', 'total', 'currency']
        },
        {
            name: 'تم شحن الطلب',
            type: 'ORDER_SHIPPED',
            content: 'مرحباً {{1}} 📦\n\nتم شحن طلبك رقم #{{2}}\n\n🚚 رقم التتبع: {{3}}\n\nيمكنك تتبع شحنتك من خلال الرابط أعلاه.',
            variables: ['customerName', 'orderId', 'trackingNumber']
        },
        {
            name: 'تم التوصيل',
            type: 'ORDER_DELIVERED',
            content: 'مرحباً {{1}} 🎉\n\nتم توصيل طلبك رقم #{{2}} بنجاح!\n\nنتمنى أن تنال المنتجات إعجابك.\n\n⭐ نسعد بتقييمك للمنتجات.',
            variables: ['customerName', 'orderId']
        },
        {
            name: 'إلغاء الطلب',
            type: 'ORDER_CANCELLED',
            content: 'مرحباً {{1}}\n\nنأسف لإبلاغك بأن طلبك رقم #{{2}} تم إلغاؤه.\n\nإذا كان لديك أي استفسار، يرجى التواصل معنا.',
            variables: ['customerName', 'orderId']
        },
        {
            name: 'سلة متروكة',
            type: 'ABANDONED_CART',
            content: 'مرحباً {{1}} 👋\n\nلاحظنا أنك تركت منتجات في سلتك 🛒\n\n💰 قيمة السلة: {{2}} {{3}}\n\n🎁 أكمل طلبك الآن!',
            variables: ['customerName', 'cartValue', 'currency']
        }
    ];

    const created = await prisma.template.createMany({
        data: defaultTemplates.map(t => ({
            ...t,
            storeId,
            status: 'PENDING'
        })),
        skipDuplicates: true
    });

    res.json({ message: `تم إنشاء ${created.count} قوالب افتراضية` });
}));

module.exports = router;
