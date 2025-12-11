const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

class AuthService {
    /**
     * Register a new user
     */
    async register(data) {
        const { email, password, name, role = 'MERCHANT' } = data;

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            throw new Error('البريد الإلكتروني مستخدم مسبقاً');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true
            }
        });

        // Generate token
        const token = this.generateToken(user.id);

        return { user, token };
    }

    /**
     * Login user
     */
    async login(email, password) {
        // Find user
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
        }

        if (!user.isActive) {
            throw new Error('الحساب معطل');
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
        }

        // Generate token
        const token = this.generateToken(user.id);

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            },
            token
        };
    }

    /**
     * Generate JWT token
     */
    generateToken(userId) {
        return jwt.sign(
            { userId },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );
    }

    /**
     * Get user profile
     */
    async getProfile(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                stores: {
                    select: {
                        id: true,
                        name: true,
                        sallaStoreId: true,
                        isActive: true
                    }
                }
            }
        });

        return user;
    }

    /**
     * Update user profile
     */
    async updateProfile(userId, data) {
        const { name, email } = data;

        const user = await prisma.user.update({
            where: { id: userId },
            data: { name, email },
            select: {
                id: true,
                email: true,
                name: true,
                role: true
            }
        });

        return user;
    }

    /**
     * Change password
     */
    async changePassword(userId, currentPassword, newPassword) {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        const isValidPassword = await bcrypt.compare(currentPassword, user.password);

        if (!isValidPassword) {
            throw new Error('كلمة المرور الحالية غير صحيحة');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        return { message: 'تم تغيير كلمة المرور بنجاح' };
    }
}

module.exports = new AuthService();
