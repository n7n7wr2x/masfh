const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

/**
 * Verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'الرجاء تسجيل الدخول' });
        }

        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true
            }
        });

        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'الحساب غير موجود أو معطل' });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'انتهت صلاحية الجلسة' });
        }
        return res.status(401).json({ error: 'غير مصرح' });
    }
};

/**
 * Check if user is Super Admin
 */
const requireSuperAdmin = (req, res, next) => {
    if (req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'غير مصرح - يتطلب صلاحيات سوبر أدمن' });
    }
    next();
};

/**
 * Check if user is Merchant or Super Admin
 */
const requireMerchant = (req, res, next) => {
    if (req.user.role !== 'MERCHANT' && req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'غير مصرح - يتطلب صلاحيات تاجر' });
    }
    next();
};

/**
 * Check if user has access to a specific store
 */
const requireStoreAccess = async (req, res, next) => {
    try {
        const storeId = req.params.storeId || req.body.storeId;

        if (!storeId) {
            return res.status(400).json({ error: 'معرف المتجر مطلوب' });
        }

        // Super admin has access to all stores
        if (req.user.role === 'SUPER_ADMIN') {
            return next();
        }

        // Check if user owns the store
        const store = await prisma.store.findFirst({
            where: {
                id: storeId,
                OR: [
                    { userId: req.user.id },
                    { staff: { some: { userId: req.user.id } } }
                ]
            }
        });

        if (!store) {
            return res.status(403).json({ error: 'لا يوجد صلاحية للوصول لهذا المتجر' });
        }

        req.store = store;
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    authenticate,
    requireSuperAdmin,
    requireMerchant,
    requireStoreAccess
};
