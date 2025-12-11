const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const whatsappService = require('../services/whatsapp.service');
const { authenticate, requireStoreAccess } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * @route   GET /api/conversations/:storeId
 * @desc    Get all conversations for a store
 */
router.get('/:storeId', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const { archived = 'false', search } = req.query;

    const where = {
        storeId: req.params.storeId,
        isArchived: archived === 'true'
    };

    if (search) {
        where.OR = [
            { customerPhone: { contains: search } },
            { customerName: { contains: search, mode: 'insensitive' } }
        ];
    }

    const conversations = await prisma.conversation.findMany({
        where,
        orderBy: { lastMessageAt: 'desc' },
        include: {
            messages: {
                take: 1,
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    res.json(conversations);
}));

/**
 * @route   GET /api/conversations/:storeId/:conversationId
 * @desc    Get a single conversation with messages
 */
router.get('/:storeId/:conversationId', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const conversation = await prisma.conversation.findUnique({
        where: { id: req.params.conversationId },
        include: {
            messages: {
                orderBy: { createdAt: 'asc' }
            }
        }
    });

    if (!conversation || conversation.storeId !== req.params.storeId) {
        return res.status(404).json({ error: 'المحادثة غير موجودة' });
    }

    // Mark as read
    await prisma.conversation.update({
        where: { id: req.params.conversationId },
        data: { unreadCount: 0 }
    });

    res.json(conversation);
}));

/**
 * @route   POST /api/conversations/:storeId/:conversationId/send
 * @desc    Send a message in a conversation
 */
router.post('/:storeId/:conversationId/send', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const { content, type = 'text', templateName, templateVars } = req.body;

    const conversation = await prisma.conversation.findUnique({
        where: { id: req.params.conversationId }
    });

    if (!conversation || conversation.storeId !== req.params.storeId) {
        return res.status(404).json({ error: 'المحادثة غير موجودة' });
    }

    const store = await prisma.store.findUnique({
        where: { id: req.params.storeId }
    });

    if (!store.whatsappPhoneId || !store.whatsappAccessToken) {
        return res.status(400).json({ error: 'المتجر غير مربوط بواتساب' });
    }

    // Send message via WhatsApp
    let result;
    let messageContent = content;

    if (type === 'template' && templateName) {
        result = await whatsappService.sendTemplateMessage(
            store,
            conversation.customerPhone,
            templateName,
            templateVars || []
        );
        messageContent = `[قالب: ${templateName}]`;
    } else {
        result = await whatsappService.sendTextMessage(
            store,
            conversation.customerPhone,
            content
        );
    }

    // Save message to database
    const message = await prisma.message.create({
        data: {
            conversationId: conversation.id,
            direction: 'outbound',
            type,
            content: messageContent,
            templateName,
            templateVars,
            whatsappMsgId: result.messageId,
            status: result.success ? 'sent' : 'failed',
            error: result.error
        }
    });

    // Update conversation
    await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
            lastMessage: messageContent,
            lastMessageAt: new Date()
        }
    });

    res.json(message);
}));

/**
 * @route   POST /api/conversations/:storeId/new
 * @desc    Start a new conversation
 */
router.post('/:storeId/new', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const { customerPhone, customerName, message, templateName, templateVars } = req.body;

    if (!customerPhone) {
        return res.status(400).json({ error: 'رقم الهاتف مطلوب' });
    }

    const store = await prisma.store.findUnique({
        where: { id: req.params.storeId }
    });

    if (!store.whatsappPhoneId || !store.whatsappAccessToken) {
        return res.status(400).json({ error: 'المتجر غير مربوط بواتساب' });
    }

    // Find or create conversation
    let conversation = await prisma.conversation.findFirst({
        where: {
            storeId: req.params.storeId,
            customerPhone
        }
    });

    if (!conversation) {
        conversation = await prisma.conversation.create({
            data: {
                storeId: req.params.storeId,
                customerPhone,
                customerName
            }
        });
    }

    // Send message
    let result;
    let messageContent = message;
    let type = 'text';

    if (templateName) {
        result = await whatsappService.sendTemplateMessage(
            store,
            customerPhone,
            templateName,
            templateVars || []
        );
        messageContent = `[قالب: ${templateName}]`;
        type = 'template';
    } else if (message) {
        result = await whatsappService.sendTextMessage(
            store,
            customerPhone,
            message
        );
    } else {
        return res.status(400).json({ error: 'الرسالة أو القالب مطلوب' });
    }

    // Save message
    const newMessage = await prisma.message.create({
        data: {
            conversationId: conversation.id,
            direction: 'outbound',
            type,
            content: messageContent,
            templateName,
            templateVars,
            whatsappMsgId: result.messageId,
            status: result.success ? 'sent' : 'failed',
            error: result.error
        }
    });

    // Update conversation
    await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
            lastMessage: messageContent,
            lastMessageAt: new Date(),
            customerName: customerName || conversation.customerName
        }
    });

    res.json({
        conversation,
        message: newMessage
    });
}));

/**
 * @route   POST /api/conversations/:storeId/:conversationId/archive
 * @desc    Archive/unarchive a conversation
 */
router.post('/:storeId/:conversationId/archive', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const { archived = true } = req.body;

    const conversation = await prisma.conversation.update({
        where: { id: req.params.conversationId },
        data: { isArchived: archived }
    });

    res.json(conversation);
}));

module.exports = router;
