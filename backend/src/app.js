const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/auth.routes');
const sallaRoutes = require('./routes/salla.routes');
const whatsappRoutes = require('./routes/whatsapp.routes');
const storeRoutes = require('./routes/store.routes');
const campaignRoutes = require('./routes/campaign.routes');
const templateRoutes = require('./routes/template.routes');
const adminRoutes = require('./routes/admin.routes');
const webhookRoutes = require('./routes/webhook.routes');
const planRoutes = require('./routes/plan.routes');
const conversationRoutes = require('./routes/conversation.routes');
const contactRoutes = require('./routes/contact.routes');

// Import middleware
const { errorHandler } = require('./middleware/error.middleware');

// Import scheduled jobs
const { initScheduledJobs } = require('./jobs/tokenRefresh');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs (increased for development)
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Setup Admin Route (Temporary)
app.get('/api/setup-admin', async (req, res) => {
  const prisma = require('./lib/prisma');
  const bcrypt = require('bcryptjs');

  try {
    const email = 'admin@example.com';
    const password = 'password123';

    // Check connection first
    await prisma.$connect();

    let user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      return res.json({ success: true, message: 'Admin user already exists', user: user.email });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
      },
    });

    res.json({ success: true, message: 'Admin created successfully', user: user.email });

  } catch (error) {
    console.error('Setup Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/salla', sallaRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/contacts', contactRoutes);

// Error handling
app.use(errorHandler);

// Root route
app.get('/', (req, res) => {
  res.send('API is running... 🚀');
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);

  // Initialize scheduled jobs (token refresh, etc.)
  initScheduledJobs();
});

module.exports = app;
