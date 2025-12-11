const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate, requireStoreAccess } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * @route   GET /api/campaigns/:storeId
 * @desc    Get all campaigns for a store
 */
router.get('/:storeId', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;

    const where = {
        storeId: req.params.storeId,
        ...(status && { status })
    };

    const [campaigns, total] = await Promise.all([
        prisma.campaign.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: parseInt(limit),
            include: {
                template: { select: { name: true } }
            }
        }),
        prisma.campaign.count({ where })
    ]);

    res.json({
        campaigns,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    });
}));

/**
 * @route   POST /api/campaigns/:storeId
 * @desc    Create a new campaign
 */
router.post('/:storeId', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const { name, type, templateId, audience, scheduledAt } = req.body;

    if (!name || !templateId) {
        return res.status(400).json({ error: 'اسم الحملة والقالب مطلوبان' });
    }

    const campaign = await prisma.campaign.create({
        data: {
            storeId: req.params.storeId,
            name,
            type: type || 'PROMOTIONAL',
            templateId,
            audience: audience || {},
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null
        }
    });

    res.status(201).json(campaign);
}));

/**
 * @route   GET /api/campaigns/:storeId/:campaignId
 * @desc    Get campaign details
 */
router.get('/:storeId/:campaignId', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const campaign = await prisma.campaign.findUnique({
        where: { id: req.params.campaignId },
        include: {
            template: true,
            messages: {
                take: 100,
                orderBy: { sentAt: 'desc' }
            }
        }
    });

    if (!campaign || campaign.storeId !== req.params.storeId) {
        return res.status(404).json({ error: 'الحملة غير موجودة' });
    }

    res.json(campaign);
}));

/**
 * @route   PUT /api/campaigns/:storeId/:campaignId
 * @desc    Update campaign
 */
router.put('/:storeId/:campaignId', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const { name, type, templateId, audience, scheduledAt } = req.body;

    const campaign = await prisma.campaign.findUnique({
        where: { id: req.params.campaignId }
    });

    if (!campaign || campaign.storeId !== req.params.storeId) {
        return res.status(404).json({ error: 'الحملة غير موجودة' });
    }

    if (campaign.status !== 'DRAFT') {
        return res.status(400).json({ error: 'لا يمكن تعديل حملة تم إرسالها' });
    }

    const updated = await prisma.campaign.update({
        where: { id: req.params.campaignId },
        data: {
            ...(name && { name }),
            ...(type && { type }),
            ...(templateId && { templateId }),
            ...(audience && { audience }),
            ...(scheduledAt && { scheduledAt: new Date(scheduledAt) })
        }
    });

    res.json(updated);
}));

/**
 * @route   POST /api/campaigns/:storeId/:campaignId/send
 * @desc    Start sending campaign
 */
router.post('/:storeId/:campaignId/send', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const campaign = await prisma.campaign.findUnique({
        where: { id: req.params.campaignId }
    });

    if (!campaign || campaign.storeId !== req.params.storeId) {
        return res.status(404).json({ error: 'الحملة غير موجودة' });
    }

    if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') {
        return res.status(400).json({ error: 'لا يمكن إرسال هذه الحملة' });
    }

    // Update status to sending
    await prisma.campaign.update({
        where: { id: req.params.campaignId },
        data: {
            status: 'SENDING',
            startedAt: new Date()
        }
    });

    // TODO: Add to queue for processing

    res.json({ message: 'تم بدء إرسال الحملة' });
}));

/**
 * @route   POST /api/campaigns/:storeId/:campaignId/cancel
 * @desc    Cancel campaign
 */
router.post('/:storeId/:campaignId/cancel', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const campaign = await prisma.campaign.findUnique({
        where: { id: req.params.campaignId }
    });

    if (!campaign || campaign.storeId !== req.params.storeId) {
        return res.status(404).json({ error: 'الحملة غير موجودة' });
    }

    if (campaign.status === 'COMPLETED' || campaign.status === 'CANCELLED') {
        return res.status(400).json({ error: 'لا يمكن إلغاء هذه الحملة' });
    }

    await prisma.campaign.update({
        where: { id: req.params.campaignId },
        data: { status: 'CANCELLED' }
    });

    res.json({ message: 'تم إلغاء الحملة' });
}));

/**
 * @route   DELETE /api/campaigns/:storeId/:campaignId
 * @desc    Delete campaign
 */
router.delete('/:storeId/:campaignId', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const campaign = await prisma.campaign.findUnique({
        where: { id: req.params.campaignId }
    });

    if (!campaign || campaign.storeId !== req.params.storeId) {
        return res.status(404).json({ error: 'الحملة غير موجودة' });
    }

    await prisma.campaign.delete({
        where: { id: req.params.campaignId }
    });

    res.json({ message: 'تم حذف الحملة' });
}));

module.exports = router;
