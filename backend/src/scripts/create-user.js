const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');

async function createMerchantUser() {
    const email = 'merchant@example.com';
    const password = 'password123';
    const name = 'Merchant User';

    try {
        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            console.log('Merchant User already exists');
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
                role: 'MERCHANT',
            },
        });

        console.log('Merchant User created successfully:', user.email);
    } catch (error) {
        console.error('Error creating Merchant User:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createMerchantUser();
