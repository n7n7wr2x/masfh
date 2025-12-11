const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate, requireStoreAccess } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * @route   GET /api/contacts/template/download
 * @desc    Download CSV template for contact import (PUBLIC)
 */
router.get('/template/download', (req, res) => {
    const BOM = '\uFEFF';
    const csv = BOM + [
        'phone,name,email,notes',
        '966512345678,أحمد محمد,ahmed@example.com,عميل VIP',
        '966551234567,خالد العتيبي,,يفضل التواصل صباحاً',
        '966598765432,سارة علي,sara@example.com,',
        '0551112233,فهد السالم,,'
    ].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="contacts_template.csv"');
    res.send(csv);
});

/**
 * @route   GET /api/contacts/:storeId
 * @desc    Get all contacts for a store
 */
router.get('/:storeId', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, search, source, blocked } = req.query;

    const where = {
        storeId: req.params.storeId,
        ...(blocked !== undefined && { isBlocked: blocked === 'true' }),
        ...(source && { source })
    };

    if (search) {
        where.OR = [
            { phone: { contains: search } },
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } }
        ];
    }

    const [contacts, total] = await Promise.all([
        prisma.contact.findMany({
            where,
            orderBy: { lastContactAt: 'desc' },
            skip: (parseInt(page) - 1) * parseInt(limit),
            take: parseInt(limit)
        }),
        prisma.contact.count({ where })
    ]);

    res.json({
        contacts,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
}));

/**
 * @route   GET /api/contacts/:storeId/:contactId
 * @desc    Get a single contact
 */
router.get('/:storeId/:contactId', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const contact = await prisma.contact.findUnique({
        where: { id: req.params.contactId }
    });

    if (!contact || contact.storeId !== req.params.storeId) {
        return res.status(404).json({ error: 'جهة الاتصال غير موجودة' });
    }

    res.json(contact);
}));

/**
 * @route   POST /api/contacts/:storeId
 * @desc    Create a new contact manually
 */
router.post('/:storeId', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const { phone, name, email, notes, tags } = req.body;

    if (!phone) {
        return res.status(400).json({ error: 'رقم الهاتف مطلوب' });
    }

    // Check if contact already exists
    const existing = await prisma.contact.findFirst({
        where: { storeId: req.params.storeId, phone }
    });

    if (existing) {
        return res.status(400).json({ error: 'جهة الاتصال موجودة مسبقاً' });
    }

    const contact = await prisma.contact.create({
        data: {
            storeId: req.params.storeId,
            phone,
            name,
            email,
            notes,
            tags: tags || [],
            source: 'manual'
        }
    });

    res.status(201).json(contact);
}));

/**
 * @route   PUT /api/contacts/:storeId/:contactId
 * @desc    Update a contact
 */
router.put('/:storeId/:contactId', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const { name, email, notes, tags, isBlocked } = req.body;

    const contact = await prisma.contact.update({
        where: { id: req.params.contactId },
        data: {
            ...(name !== undefined && { name }),
            ...(email !== undefined && { email }),
            ...(notes !== undefined && { notes }),
            ...(tags !== undefined && { tags }),
            ...(isBlocked !== undefined && { isBlocked })
        }
    });

    res.json(contact);
}));

/**
 * @route   DELETE /api/contacts/:storeId/:contactId
 * @desc    Delete a contact
 */
router.delete('/:storeId/:contactId', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    await prisma.contact.delete({
        where: { id: req.params.contactId }
    });

    res.json({ message: 'تم حذف جهة الاتصال' });
}));

/**
 * @route   POST /api/contacts/:storeId/:contactId/block
 * @desc    Block/unblock a contact
 */
router.post('/:storeId/:contactId/block', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const { blocked = true } = req.body;

    const contact = await prisma.contact.update({
        where: { id: req.params.contactId },
        data: { isBlocked: blocked }
    });

    res.json(contact);
}));

/**
 * @route   POST /api/contacts/:storeId/import
 * @desc    Bulk import contacts from CSV data
 */
router.post('/:storeId/import', authenticate, requireStoreAccess, asyncHandler(async (req, res) => {
    const { contacts } = req.body;

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
        return res.status(400).json({ error: 'لا توجد بيانات للاستيراد' });
    }

    if (contacts.length > 1000) {
        return res.status(400).json({ error: 'الحد الأقصى للاستيراد 1000 جهة اتصال' });
    }

    let imported = 0;
    let skipped = 0;
    let errors = [];

    for (const contact of contacts) {
        try {
            // Validate phone
            if (!contact.phone) {
                errors.push(`سطر بدون رقم هاتف`);
                skipped++;
                continue;
            }

            // Format phone number
            let phone = contact.phone.toString().replace(/\D/g, '');
            if (phone.startsWith('0')) {
                phone = '966' + phone.substring(1);
            } else if (!phone.startsWith('966') && phone.length === 9) {
                phone = '966' + phone;
            }

            // Check if exists
            const existing = await prisma.contact.findFirst({
                where: { storeId: req.params.storeId, phone }
            });

            if (existing) {
                // Update existing contact if new data provided
                if (contact.name || contact.email) {
                    await prisma.contact.update({
                        where: { id: existing.id },
                        data: {
                            ...(contact.name && !existing.name && { name: contact.name }),
                            ...(contact.email && !existing.email && { email: contact.email }),
                            ...(contact.notes && { notes: contact.notes })
                        }
                    });
                }
                skipped++;
                continue;
            }

            // Create new contact
            await prisma.contact.create({
                data: {
                    storeId: req.params.storeId,
                    phone,
                    name: contact.name || null,
                    email: contact.email || null,
                    notes: contact.notes || null,
                    source: 'import'
                }
            });
            imported++;
        } catch (error) {
            errors.push(`خطأ في ${contact.phone}: ${error.message}`);
            skipped++;
        }
    }

    res.json({
        message: `تم استيراد ${imported} جهة اتصال`,
        imported,
        skipped,
        errors: errors.slice(0, 10) // Return max 10 errors
    });
}));

/**
 * @route   GET /api/contacts/:storeId/template
 * @desc    Download import template example
 */
router.get('/:storeId/template', authenticate, requireStoreAccess, (req, res) => {
    const template = [
        { phone: '966512345678', name: 'أحمد محمد', email: 'ahmed@example.com', notes: 'عميل VIP' },
        { phone: '966598765432', name: 'سارة علي', email: 'sara@example.com', notes: '' },
        { phone: '0551234567', name: 'خالد', email: '', notes: 'يفضل التواصل صباحاً' }
    ];

    res.json({
        template,
        instructions: {
            phone: 'رقم الهاتف (مطلوب) - يمكن أن يبدأ بـ 966 أو 05',
            name: 'اسم العميل (اختياري)',
            email: 'البريد الإلكتروني (اختياري)',
            notes: 'ملاحظات (اختياري)'
        },
        csvExample: 'phone,name,email,notes\n966512345678,أحمد محمد,ahmed@example.com,عميل VIP\n0551234567,خالد,,يفضل التواصل صباحاً'
    });
});

/**
 * Helper: Find or create contact when receiving a message
 */
const findOrCreateContact = async (storeId, phone, name = null) => {
    let contact = await prisma.contact.findFirst({
        where: { storeId, phone }
    });

    if (!contact) {
        contact = await prisma.contact.create({
            data: {
                storeId,
                phone,
                name,
                source: 'whatsapp',
                lastContactAt: new Date()
            }
        });
    } else {
        // Update last contact time and increment messages
        contact = await prisma.contact.update({
            where: { id: contact.id },
            data: {
                lastContactAt: new Date(),
                messagesCount: { increment: 1 },
                ...(name && !contact.name && { name })
            }
        });
    }

    return contact;
};

module.exports = router;
module.exports.findOrCreateContact = findOrCreateContact;

