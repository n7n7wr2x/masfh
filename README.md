# سلة واتساب

نظام متكامل لربط منصة سلة مع واتساب بزنس API.

## المميزات

- ✅ إشعارات تلقائية لتحديثات الطلبات
- ✅ تذكير السلات المتروكة
- ✅ حملات تسويقية عبر واتساب
- ✅ نظام مستخدمين متعدد الأدوار (سوبر أدمن، تاجر، موظف)
- ✅ لوحة تحكم متكاملة

## التقنيات

- **Backend:** Node.js + Express
- **Frontend:** Next.js 14
- **Database:** PostgreSQL + Prisma
- **Queue:** BullMQ + Redis

## التشغيل

### 1. نسخ ملفات البيئة

```bash
cp backend/.env.example backend/.env
```

### 2. تعديل متغيرات البيئة

قم بتعديل `backend/.env` وإضافة:
- بيانات Salla API
- بيانات WhatsApp Business API

### 3. التشغيل بـ Docker

```bash
docker-compose up -d
```

### أو التشغيل محلياً

```bash
# تثبيت الحزم
npm install

# تشغيل قاعدة البيانات
npx prisma db push --schema=backend/prisma/schema.prisma

# التشغيل
npm run dev
```

## الوصول

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001

## الـ Webhooks

### Salla Webhook
```
POST http://your-domain.com/api/webhooks/salla
```

### WhatsApp Webhook
```
GET/POST http://your-domain.com/api/webhooks/whatsapp
```

## الترخيص

MIT
