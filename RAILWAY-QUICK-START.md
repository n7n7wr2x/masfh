# 🚀 Quick Railway Deployment Guide

Your code is now on GitHub! Follow these steps to deploy to Railway:

## 1️⃣ Go to Railway
Visit: **https://railway.app**
- Click "Start a New Project"
- Choose "Deploy from GitHub repo"

## 2️⃣ Connect Your Repository
- Authorize Railway to access GitHub
- Select repository: **n7n7wr2x/masfh**

## 3️⃣ Add PostgreSQL Database
- In Railway project, click "+ New"
- Select "Database" → "PostgreSQL"
- Railway auto-provisions it

## 4️⃣ Deploy Backend
- Click "+ New" → "GitHub Repo" → Select your repo
- **Set Root Directory**: `backend`
- Railway will auto-deploy

### Backend Environment Variables
After backend deploys, add these in Variables tab:

```
DATABASE_URL = (copy from PostgreSQL service)
JWT_SECRET = (generate random string)
SALLA_CLIENT_ID = (from Salla dashboard)
SALLA_CLIENT_SECRET = (from Salla dashboard)
NODE_ENV = production
PORT = 3001
```

Then get your backend URL and add:
```
SALLA_REDIRECT_URI = https://your-backend-url.up.railway.app/api/salla/callback
```

## 5️⃣ Deploy Frontend
- Click "+ New" → "GitHub Repo" → Select same repo
- **Set Root Directory**: `frontend`
- Railway will auto-deploy

### Frontend Environment Variables
After both services deploy:

```
NEXTAUTH_SECRET = (generate random string)
NEXT_PUBLIC_BACKEND_URL = https://your-backend-url.up.railway.app
NEXTAUTH_URL = https://your-frontend-url.up.railway.app
```

### Update Backend
Go back to backend Variables and add:
```
FRONTEND_URL = https://your-frontend-url.up.railway.app
```

## 6️⃣ Verify Deployment

✅ Backend health: `https://your-backend-url.up.railway.app/health`
✅ Frontend: `https://your-frontend-url.up.railway.app`

## 7️⃣ Update Webhooks

**Salla Dashboard**: Update callback URL to your backend
**Meta Dashboard**: Update webhook URL to your backend

---

Done! Your app is live 24/7 with no sleep mode 🎉

For detailed steps, see: [DEPLOYMENT.md](file:///c:/Users/Fahad/Desktop/jhfjsag/DEPLOYMENT.md)
