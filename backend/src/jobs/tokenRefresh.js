/**
 * Scheduled Jobs for Salla Token Refresh
 * Runs every 12 hours to refresh tokens that will expire within 2 days
 */
const cron = require('node-cron');
const prisma = require('../lib/prisma');
const sallaService = require('../services/salla.service');

/**
 * Refresh tokens for all stores that have tokens expiring within 2 days
 */
async function refreshExpiringTokens() {
    console.log('🔄 Starting token refresh job...');

    try {
        // Find stores with tokens expiring within 2 days
        const twoDaysFromNow = new Date();
        twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

        const stores = await prisma.store.findMany({
            where: {
                sallaRefreshToken: { not: null },
                sallaTokenExpiresAt: {
                    not: null,
                    lte: twoDaysFromNow // Expires within 2 days
                },
                isActive: true
            },
            select: {
                id: true,
                name: true,
                sallaRefreshToken: true,
                sallaTokenExpiresAt: true
            }
        });

        console.log(`📊 Found ${stores.length} stores with expiring tokens`);

        for (const store of stores) {
            try {
                console.log(`🔑 Refreshing token for store: ${store.name} (${store.id})`);

                // Refresh the token
                const tokens = await sallaService.refreshToken(store.sallaRefreshToken);

                // Calculate new expiry
                const expiresAt = new Date();
                expiresAt.setSeconds(expiresAt.getSeconds() + (tokens.expires_in || 1209600));

                // Update store with new tokens
                await prisma.store.update({
                    where: { id: store.id },
                    data: {
                        sallaAccessToken: tokens.access_token,
                        sallaRefreshToken: tokens.refresh_token,
                        sallaTokenExpiresAt: expiresAt
                    }
                });

                console.log(`✅ Token refreshed for store: ${store.name}`);
            } catch (error) {
                console.error(`❌ Failed to refresh token for store ${store.id}:`, error.message);

                // If refresh fails, the token might be invalid - deactivate the store connection
                if (error.response?.status === 401 || error.response?.status === 400) {
                    console.log(`⚠️ Token invalid for store ${store.id}, clearing connection...`);
                    await prisma.store.update({
                        where: { id: store.id },
                        data: {
                            sallaAccessToken: null,
                            sallaRefreshToken: null,
                            sallaTokenExpiresAt: null
                        }
                    });
                }
            }
        }

        console.log('✅ Token refresh job completed');
    } catch (error) {
        console.error('❌ Token refresh job failed:', error);
    }
}

/**
 * Initialize scheduled jobs
 */
function initScheduledJobs() {
    // Run token refresh every 12 hours (at 00:00 and 12:00)
    cron.schedule('0 0,12 * * *', async () => {
        console.log('⏰ Scheduled token refresh starting...');
        await refreshExpiringTokens();
    });

    console.log('📅 Scheduled jobs initialized:');
    console.log('   - Token refresh: Every 12 hours (00:00 and 12:00)');
}

module.exports = {
    initScheduledJobs,
    refreshExpiringTokens
};
