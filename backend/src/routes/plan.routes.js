const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate, requireSuperAdmin } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * @route   GET /api/plans
 * @desc    Get all plans (public)
 */
router.get('/', asyncHandler(async (req, res) => {
    const plans = await prisma.plan.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' }
    });
    res.json(plans);
}));

/**
 * @route   GET /api/plans/all
 * @desc    Get all plans including inactive (admin only)
 */
router.get('/all', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
    const plans = await prisma.plan.findMany({
        orderBy: { sortOrder: 'asc' },
        include: {
            _count: { select: { subscriptions: true } }
        }
    });
    res.json(plans);
}));

/**
 * @route   POST /api/plans
 * @desc    Create a new plan
 */
router.post('/', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
    const {
        name,
        nameAr,
        description,
        descriptionAr,
        price,
        currency,
        billingPeriod,
        messagesLimit,
        templatesLimit,
        campaignsLimit,
        features,
        isActive,
        isDefault,
        sortOrder
    } = req.body;

    if (!name || !nameAr) {
        return res.status(400).json({ error: 'اسم الباقة مطلوب' });
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
        await prisma.plan.updateMany({
            where: { isDefault: true },
            data: { isDefault: false }
        });
    }

    const plan = await prisma.plan.create({
        data: {
            name,
            nameAr,
            description,
            descriptionAr,
            price: price || 0,
            currency: currency || 'SAR',
            billingPeriod: billingPeriod || 'monthly',
            messagesLimit: messagesLimit || 100,
            templatesLimit: templatesLimit || 5,
            campaignsLimit: campaignsLimit || 2,
            features: features || [],
            isActive: isActive !== false,
            isDefault: isDefault || false,
            sortOrder: sortOrder || 0
        }
    });

    res.status(201).json(plan);
}));

/**
 * @route   PUT /api/plans/:id
 * @desc    Update a plan
 */
router.put('/:id', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
        name,
        nameAr,
        description,
        descriptionAr,
        price,
        currency,
        billingPeriod,
        messagesLimit,
        templatesLimit,
        campaignsLimit,
        features,
        isActive,
        isDefault,
        sortOrder
    } = req.body;

    // If this is set as default, unset other defaults
    if (isDefault) {
        await prisma.plan.updateMany({
            where: { isDefault: true, id: { not: id } },
            data: { isDefault: false }
        });
    }

    const plan = await prisma.plan.update({
        where: { id },
        data: {
            ...(name && { name }),
            ...(nameAr && { nameAr }),
            ...(description !== undefined && { description }),
            ...(descriptionAr !== undefined && { descriptionAr }),
            ...(price !== undefined && { price }),
            ...(currency && { currency }),
            ...(billingPeriod && { billingPeriod }),
            ...(messagesLimit !== undefined && { messagesLimit }),
            ...(templatesLimit !== undefined && { templatesLimit }),
            ...(campaignsLimit !== undefined && { campaignsLimit }),
            ...(features !== undefined && { features }),
            ...(isActive !== undefined && { isActive }),
            ...(isDefault !== undefined && { isDefault }),
            ...(sortOrder !== undefined && { sortOrder })
        }
    });

    res.json(plan);
}));

/**
 * @route   DELETE /api/plans/:id
 * @desc    Delete a plan
 */
router.delete('/:id', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check if plan has active subscriptions
    const subscriptions = await prisma.subscription.count({
        where: { planId: id, status: 'active' }
    });

    if (subscriptions > 0) {
        return res.status(400).json({
            error: 'لا يمكن حذف الباقة لوجود اشتراكات نشطة'
        });
    }

    await prisma.plan.delete({ where: { id } });
    res.json({ message: 'تم حذف الباقة بنجاح' });
}));

module.exports = router;
