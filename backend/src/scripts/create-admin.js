const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');

async function createSuperAdmin() {
    const email = 'admin@example.com';
    const password = 'password123';
    const name = 'Super Admin';

    try {
        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            console.log('Super Admin already exists');
            return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: 'SUPER_ADMIN',
            },
        });

        console.log('Super Admin created successfully:', user.email);
    } catch (error) {
        console.error('Error creating Super Admin:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createSuperAdmin();
