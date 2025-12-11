const express = require('express');
const router = express.Router();
const sallaService = require('../services/salla.service');
const prisma = require('../lib/prisma');
const { authenticate, requireStoreAccess } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * @route   GET /api/salla/connect/:storeId
 * @desc    Get Salla OAuth URL
 */
router.get('/connect/:storeId', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const authUrl = sallaService.getAuthorizationUrl(req.params.storeId);
    res.json({ url: authUrl });
}));

/**
 * @route   GET /api/salla/callback
 * @desc    Handle Salla OAuth callback
 */
router.get('/callback', asyncHandler(async (req, res) => {
    const { code, state: storeId } = req.query;

    if (!code || !storeId) {
        return res.redirect(`${process.env.FRONTEND_URL}/connect-salla?error=missing_params`);
    }

    try {
        await sallaService.connectStore(storeId, code);
        res.redirect(`${process.env.FRONTEND_URL}/connect-salla?success=true`);
    } catch (error) {
        console.error('Salla callback error:', error);
        res.redirect(`${process.env.FRONTEND_URL}/connect-salla?error=${encodeURIComponent(error.message)}`);
    }
}));

/**
 * @route   POST /api/salla/disconnect/:storeId
 * @desc    Disconnect store from Salla
 */
router.post('/disconnect/:storeId', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const result = await sallaService.disconnectStore(req.params.storeId);
    res.json(result);
}));

/**
 * @route   GET /api/salla/status/:storeId
 * @desc    Get Salla connection status
 */
router.get('/status/:storeId', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const store = await prisma.store.findUnique({
        where: { id: req.params.storeId },
        select: {
            sallaStoreId: true,
            sallaTokenExpiresAt: true
        }
    });

    res.json({
        connected: !!store.sallaStoreId,
        sallaStoreId: store.sallaStoreId,
        tokenValid: store.sallaTokenExpiresAt ? new Date() < store.sallaTokenExpiresAt : false
    });
}));

/**
 * @route   GET /api/salla/orders/:storeId
 * @desc    Get orders from Salla
 */
router.get('/orders/:storeId', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const { page = 1 } = req.query;
    const orders = await sallaService.getOrders(req.params.storeId, page);
    res.json(orders);
}));

/**
 * @route   GET /api/salla/customers/:storeId
 * @desc    Get customers from Salla
 */
router.get('/customers/:storeId', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const { page = 1 } = req.query;
    const customers = await sallaService.getCustomers(req.params.storeId, page);
    res.json(customers);
}));

module.exports = router;
