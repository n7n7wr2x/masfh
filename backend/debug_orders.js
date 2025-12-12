const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- START DEBUG ORDERS ---');

    // 1. Count
    const count = await prisma.order.count();
    console.log(`Total Count: ${count}`);

    // 2. Find All (Raw)
    const orders = await prisma.order.findMany({
        include: {
            store: {
                select: { id: true, name: true, sallaStoreId: true }
            }
        }
    });

    console.log(`Found ${orders.length} orders via findMany`);

    orders.forEach((o, i) => {
        console.log(`[Order ${i + 1}] ID: ${o.id}, SallaID: ${o.sallaOrderId}, StoreID: ${o.storeId}`);
        if (o.store) {
            console.log(`   -> Linked Store: ${o.store.name} (${o.store.sallaStoreId})`);
        } else {
            console.log(`   -> ❌ STORE RELATION MISSING`);
        }
    });

    console.log('--- END DEBUG ORDERS ---');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
