const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');
const { authenticate } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 */
router.post('/register', asyncHandler(async (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
        return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }

    const result = await authService.register({ email, password, name });
    res.status(201).json(result);
}));

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 */
router.post('/login', asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
    }

    const result = await authService.login(email, password);
    res.json(result);
}));

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 */
router.get('/me', authenticate, asyncHandler(async (req, res) => {
    const profile = await authService.getProfile(req.user.id);
    res.json(profile);
}));

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 */
router.put('/profile', authenticate, asyncHandler(async (req, res) => {
    const { name, email } = req.body;
    const result = await authService.updateProfile(req.user.id, { name, email });
    res.json(result);
}));

/**
 * @route   PUT /api/auth/password
 * @desc    Change password
 */
router.put('/password', authenticate, asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'كلمة المرور الحالية والجديدة مطلوبتان' });
    }

    const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
    res.json(result);
}));

module.exports = router;
