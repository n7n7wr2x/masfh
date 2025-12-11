const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate, requireMerchant, requireStoreAccess } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * @route   GET /api/stores
 * @desc    Get user's stores
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
    let stores;

    if (req.user.role === 'SUPER_ADMIN') {
        stores = await prisma.store.findMany({
            include: {
                user: { select: { name: true, email: true } },
                _count: { select: { orders: true, campaigns: true } }
            }
        });
    } else {
        stores = await prisma.store.findMany({
            where: {
                OR: [
                    { userId: req.user.id },
                    { staff: { some: { userId: req.user.id } } }
                ]
            },
            include: {
                _count: { select: { orders: true, campaigns: true } }
            }
        });
    }

    res.json(stores);
}));

/**
 * @route   POST /api/stores
 * @desc    Create a new store
 */
router.post('/', authenticate, requireMerchant, asyncHandler(async (req, res) => {
    console.log('Received create store request:', req.body);
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'اسم المتجر مطلوب' });
    }

    const store = await prisma.store.create({
        data: {
            name,
            userId: req.user.id
        }
    });

    res.status(201).json(store);
}));

/**
 * @route   GET /api/stores/:storeId
 * @desc    Get store details
 */
router.get('/:storeId', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const store = await prisma.store.findUnique({
        where: { id: req.params.storeId },
        include: {
            user: { select: { name: true, email: true } },
            staff: {
                include: {
                    user: { select: { id: true, name: true, email: true } }
                }
            },
            _count: {
                select: {
                    orders: true,
                    abandonedCarts: true,
                    campaigns: true,
                    templates: true,
                    notifications: true
                }
            }
        }
    });

    res.json(store);
}));

/**
 * @route   PUT /api/stores/:storeId
 * @desc    Update store
 */
router.put('/:storeId', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const { name, settings } = req.body;

    const store = await prisma.store.update({
        where: { id: req.params.storeId },
        data: {
            ...(name && { name }),
            ...(settings && { settings })
        }
    });

    res.json(store);
}));

/**
 * @route   DELETE /api/stores/:storeId
 * @desc    Delete store
 */
router.delete('/:storeId', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    // Only owner or super admin can delete
    const store = await prisma.store.findUnique({
        where: { id: req.params.storeId }
    });

    if (store.userId !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'لا يمكنك حذف هذا المتجر' });
    }

    await prisma.store.delete({
        where: { id: req.params.storeId }
    });

    res.json({ message: 'تم حذف المتجر بنجاح' });
}));

/**
 * @route   POST /api/stores/:storeId/staff
 * @desc    Add staff to store
 */
router.post('/:storeId/staff', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const { email } = req.body;

    // Only owner can add staff
    const store = await prisma.store.findUnique({
        where: { id: req.params.storeId }
    });

    if (store.userId !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'لا يمكنك إضافة موظفين لهذا المتجر' });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    // Add staff
    const staff = await prisma.storeStaff.create({
        data: {
            storeId: req.params.storeId,
            userId: user.id
        },
        include: {
            user: { select: { id: true, name: true, email: true } }
        }
    });

    res.status(201).json(staff);
}));

/**
 * @route   DELETE /api/stores/:storeId/staff/:userId
 * @desc    Remove staff from store
 */
router.delete('/:storeId/staff/:userId', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const store = await prisma.store.findUnique({
        where: { id: req.params.storeId }
    });

    if (store.userId !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'لا يمكنك إزالة موظفين من هذا المتجر' });
    }

    await prisma.storeStaff.deleteMany({
        where: {
            storeId: req.params.storeId,
            userId: req.params.userId
        }
    });

    res.json({ message: 'تم إزالة الموظف بنجاح' });
}));

/**
 * @route   GET /api/stores/:storeId/stats
 * @desc    Get store statistics
 */
router.get('/:storeId/stats', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const storeId = req.params.storeId;
    const { period = '7d' } = req.query;

    const periodDays = period === '24h' ? 1 : period === '30d' ? 30 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    const [
        ordersCount,
        abandonedCartsCount,
        notificationsCount,
        campaignsCount
    ] = await Promise.all([
        prisma.order.count({
            where: { storeId, createdAt: { gte: startDate } }
        }),
        prisma.abandonedCart.count({
            where: { storeId, createdAt: { gte: startDate } }
        }),
        prisma.notification.count({
            where: { storeId, createdAt: { gte: startDate } }
        }),
        prisma.campaign.count({
            where: { storeId, createdAt: { gte: startDate } }
        })
    ]);

    res.json({
        period,
        orders: ordersCount,
        abandonedCarts: abandonedCartsCount,
        notifications: notificationsCount,
        campaigns: campaignsCount
    });
}));

module.exports = router;
