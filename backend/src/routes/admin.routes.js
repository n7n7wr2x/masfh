const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const { authenticate, requireSuperAdmin } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard stats
 */
router.get('/dashboard', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
    const [
        totalUsers,
        totalStores,
        totalOrders,
        totalNotifications,
        recentStores,
        recentUsers
    ] = await Promise.all([
        prisma.user.count(),
        prisma.store.count(),
        prisma.order.count(),
        prisma.notification.count(),
        prisma.store.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { name: true, email: true } } }
        }),
        prisma.user.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: { id: true, name: true, email: true, role: true, createdAt: true }
        })
    ]);

    res.json({
        stats: {
            totalUsers,
            totalStores,
            totalOrders,
            totalNotifications
        },
        recentStores,
        recentUsers
    });
}));

/**
 * @route   GET /api/admin/users
 * @desc    Get all users
 */
router.get('/users', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, role, search } = req.query;

    const where = {
        ...(role && { role }),
        ...(search && {
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
            ]
        })
    };

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: parseInt(limit),
            select: {
                id: true,
                name: true,
                email: true,
                tempPassword: true, // Show generated password to admin
                role: true,
                isActive: true,
                createdAt: true,
                _count: { select: { stores: true } }
            }
        }),
        prisma.user.count({ where })
    ]);

    res.json({
        users,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    });
}));

/**
 * @route   POST /api/admin/users
 * @desc    Create a new user (admin only)
 */
router.post('/users', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
        return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            name,
            role: role || 'MERCHANT'
        },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true
        }
    });

    res.status(201).json(user);
}));

/**
 * @route   PUT /api/admin/users/:userId
 * @desc    Update user
 */
router.put('/users/:userId', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
    const { name, email, role, isActive } = req.body;

    const user = await prisma.user.update({
        where: { id: req.params.userId },
        data: {
            ...(name && { name }),
            ...(email && { email }),
            ...(role && { role }),
            ...(typeof isActive === 'boolean' && { isActive })
        },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true
        }
    });

    res.json(user);
}));

/**
 * @route   DELETE /api/admin/users/:userId
 * @desc    Delete user
 */
router.delete('/users/:userId', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
    // Prevent deleting yourself
    if (req.params.userId === req.user.id) {
        return res.status(400).json({ error: 'لا يمكنك حذف حسابك' });
    }

    await prisma.user.delete({
        where: { id: req.params.userId }
    });

    res.json({ message: 'تم حذف المستخدم' });
}));

/**
 * @route   GET /api/admin/stores
 * @desc    Get all stores
 */
router.get('/stores', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, search } = req.query;

    const where = search ? {
        OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sallaStoreId: { contains: search } }
        ]
    } : {};

    const [stores, total] = await Promise.all([
        prisma.store.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: parseInt(limit),
            include: {
                user: { select: { name: true, email: true } },
                _count: {
                    select: { orders: true, notifications: true, campaigns: true }
                }
            }
        }),
        prisma.store.count({ where })
    ]);

    res.json({
        stores,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    });
}));

/**
 * @route   PUT /api/admin/stores/:storeId
 * @desc    Update store (admin)
 */
router.put('/stores/:storeId', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
    const { isActive } = req.body;

    const store = await prisma.store.update({
        where: { id: req.params.storeId },
        data: {
            ...(typeof isActive === 'boolean' && { isActive })
        }
    });

    res.json(store);
}));

/**
 * @route   GET /api/admin/analytics
 * @desc    Get system analytics
 */
router.get('/analytics', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
    const { period = '7d' } = req.query;

    const periodDays = period === '24h' ? 1 : period === '30d' ? 30 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Get daily stats
    const notifications = await prisma.notification.groupBy({
        by: ['status'],
        where: { createdAt: { gte: startDate } },
        _count: true
    });

    const orders = await prisma.order.groupBy({
        by: ['status'],
        where: { createdAt: { gte: startDate } },
        _count: true
    });

    res.json({
        period,
        notifications: notifications.reduce((acc, n) => {
            acc[n.status] = n._count;
            return acc;
        }, {}),
        orders: orders.reduce((acc, o) => {
            acc[o.status] = o._count;
            return acc;
        }, {})
    });
}));

/**
 * @route   GET /api/admin/orders
 * @desc    Get all orders (admin)
 */
router.get('/orders', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, status, storeId } = req.query;

    const where = {
        ...(status && { status }),
        ...(storeId && { storeId })
    };

    const [orders, total] = await Promise.all([
        prisma.order.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: parseInt(limit),
            include: {
                store: {
                    select: { name: true, sallaStoreId: true }
                }
            }
        }),
        prisma.order.count({ where })
    ]);

    res.json({
        orders,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    });
}));

/**
 * @route   GET /api/admin/webhooks
 * @desc    Get webhook logs
 */
router.get('/webhooks', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, source, event } = req.query;

    const where = {
        ...(source && { source }),
        ...(event && { event: { contains: event } })
    };

    const [webhooks, total] = await Promise.all([
        prisma.webhookLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: parseInt(limit)
        }),
        prisma.webhookLog.count({ where })
    ]);

    res.json({
        webhooks,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    });
}));

/**
 * @route   DELETE /api/admin/webhooks
 * @desc    Clear webhook logs
 */
router.delete('/webhooks', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
    const { olderThan } = req.query;

    const where = olderThan ? {
        createdAt: { lt: new Date(olderThan) }
    } : {};

    const { count } = await prisma.webhookLog.deleteMany({ where });

    res.json({ deleted: count, message: `تم حذف ${count} سجل` });
}));

module.exports = router;

