# 🚀 Railway Deployment Guide

This guide will walk you through deploying your Salla WhatsApp Integration to Railway.app.

## Prerequisites

- Railway.app account (sign up at https://railway.app)
- GitHub account (to connect your repository)
- Salla App credentials (Client ID & Secret)

---

## Step 1: Push Code to GitHub

1. Create a new GitHub repository
2. Push your code:

```bash
cd C:\Users\Fahad\Desktop\jhfjsag
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

---

## Step 2: Create Railway Project

1. Go to https://railway.app
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub
5. Select your repository

---

## Step 3: Add PostgreSQL Database

1. In your Railway project dashboard, click **"+ New"**
2. Select **"Database"** → **"PostgreSQL"**
3. Railway will automatically provision the database
4. Copy the `DATABASE_URL` from the database settings (you'll need it later)

---

## Step 4: Deploy Backend Service

1. In Railway project, click **"+ New"**
2. Select **"GitHub Repo"** → Choose your repo
3. Set **Root Directory** to: `backend`
4. Railway will auto-detect Node.js and deploy

### Configure Backend Environment Variables

Click on your backend service → **"Variables"** tab → Add:

```
DATABASE_URL=<from-postgresql-database>
JWT_SECRET=<generate-random-string>
SALLA_CLIENT_ID=<from-salla-dashboard>
SALLA_CLIENT_SECRET=<from-salla-dashboard>
NODE_ENV=production
PORT=3001
```

**For SALLA_REDIRECT_URI**, wait until backend deploys, then:
1. Click backend service → **"Settings"** → Copy the domain (e.g., `https://backend-production-xxxx.up.railway.app`)
2. Add new variable: `SALLA_REDIRECT_URI=https://your-backend-domain.up.railway.app/api/salla/callback`

---

## Step 5: Deploy Frontend Service

1. In Railway project, click **"+ New"**
2. Select **"GitHub Repo"** → Choose same repo
3. Set **Root Directory** to: `frontend`
4. Railway will auto-detect Next.js and deploy

### Configure Frontend Environment Variables

Click on your frontend service → **"Variables"** tab → Add:

```
NEXTAUTH_SECRET=<generate-random-string>
```

**For NEXT_PUBLIC_BACKEND_URL and NEXTAUTH_URL**, wait until services deploy, then:
1. Get backend URL from backend service settings
2. Get frontend URL from frontend service settings
3. Add these variables:
```
NEXT_PUBLIC_BACKEND_URL=https://your-backend-domain.up.railway.app
NEXTAUTH_URL=https://your-frontend-domain.up.railway.app
```

### Update Backend's FRONTEND_URL

Go back to backend service → Variables → Add:
```
FRONTEND_URL=https://your-frontend-domain.up.railway.app
```

---

## Step 6: Run Database Migration

After backend is deployed:

1. Go to backend service → **"Settings"** → **"Service"** tab
2. Scroll to **"Custom Start Command"** (already set in railway.toml)
3. To push Prisma schema to database, you can use Railway CLI or:
   - Go to **"Deployments"** tab → Click latest deployment → **"View Logs"**
   - Check if Prisma generate ran successfully
   - For pushing schema, you may need to run `npx prisma db push` manually via Railway's terminal

**Alternative**: Use Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migration
railway run npx prisma db push
```

---

## Step 7: Verify Deployment

### Backend Health Check
Visit: `https://your-backend-domain.up.railway.app/health`

Expected response:
```json
{"status":"ok","timestamp":"2024-..."}
```

### Frontend Access
Visit: `https://your-frontend-domain.up.railway.app`

You should see the login page with proper styling.

---

## Step 8: Update External Services

### Salla Partner Dashboard

1. Go to https://salla.partners/
2. Navigate to your app settings
3. Update **Redirect URI** to:
   ```
   https://your-backend-domain.up.railway.app/api/salla/callback
   ```

### Meta Developer Dashboard (WhatsApp)

1. Go to https://developers.facebook.com
2. Navigate to your WhatsApp app
3. Update **Webhook URL** to:
   ```
   https://your-backend-domain.up.railway.app/api/webhooks/whatsapp
   ```

---

## Step 9: Create Admin User

If you need to create an admin user, you can run the script via Railway:

```bash
railway run node backend/src/scripts/create-admin.js
```

Or use Railway's web terminal in the backend service.

---

## Monitoring & Logs

- **View Logs**: Click on any service → **"Deployments"** → Select deployment → **"View Logs"**
- **Metrics**: Railway dashboard shows CPU, Memory, and Network usage
- **Database**: PostgreSQL service has metrics and query logs

---

## Cost Estimation

Railway free tier includes:
- **$5 credit per month**
- Typical usage for this app: ~$3-4/month (Backend + Frontend + Database)
- No sleep mode - services stay active 24/7

---

## Troubleshooting

### Build Fails
- Check **"Deployments"** → **"View Logs"** for errors
- Ensure `package.json` has correct scripts
- Verify `railway.toml` is in correct directory

### Database Connection Error
- Verify `DATABASE_URL` is set in backend variables
- Check PostgreSQL service is running
- Ensure Prisma schema matches database

### Frontend Can't Connect to Backend
- Verify `NEXT_PUBLIC_BACKEND_URL` is set correctly
- Check CORS settings in backend allow frontend domain
- Verify both services are deployed and running

### Webhooks Not Working
- Ensure backend service is public (not private)
- Verify webhook URLs in Salla/Meta dashboards are correct
- Check backend logs for incoming webhook requests

---

## Next Steps

1. Test authentication flow
2. Connect a Salla store
3. Configure WhatsApp Business API
4. Test sending messages
5. Monitor logs for any errors

✅ **Deployment Complete!** Your app is now live on Railway.
