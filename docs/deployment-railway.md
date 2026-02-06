# Civitas Backend Deployment Guide - Railway + Docker

**Recommended Approach**: Railway with Docker containerization

**Updated**: February 6, 2026

---

## Table of Contents

1. [Why Railway + Docker?](#1-why-railway--docker)
2. [Quick Start (5 minutes)](#2-quick-start-5-minutes)
3. [Detailed Setup](#3-detailed-setup)
4. [Environment Variables](#4-environment-variables)
5. [Deployment Workflow](#5-deployment-workflow)
6. [Monitoring & Debugging](#6-monitoring--debugging)
7. [Cost Breakdown](#7-cost-breakdown)
8. [Migration from EC2](#8-migration-from-ec2)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Why Railway + Docker?

### Railway Advantages over EC2

| Feature | Railway | EC2 |
|---------|---------|-----|
| **Setup Time** | 5 minutes | 2-3 hours |
| **Maintenance** | Zero (fully managed) | High (updates, security, SSL) |
| **Deployments** | `git push` or CLI | SSH + manual steps |
| **SSL/HTTPS** | Automatic | Manual (Certbot) |
| **Monitoring** | Built-in dashboard | Setup CloudWatch |
| **Logs** | Real-time streaming | Configure + rotate |
| **Scaling** | Click to scale | Provision new instances |
| **Cost (low traffic)** | $20/month | $15-20/month + time |
| **Long-running processes** | ✅ Full support | ✅ Full support |
| **Event listeners** | ✅ Works perfectly | ✅ Works perfectly |
| **Cron jobs** | ✅ Native support | ⚙️ Manual setup |

### Docker Advantages

**✅ Dev-Prod Parity**
- Same container runs locally and on Railway
- Eliminates "works on my machine" issues
- Reproducible builds

**✅ Dependency Isolation**
- Node version locked (20.x)
- System dependencies bundled
- No conflicts with host system

**✅ Railway Auto-Detection**
- Railway automatically detects Dockerfile
- Faster cold starts than buildpacks
- Optimized layer caching

**✅ Easy Debugging**
```bash
# Run production container locally
docker build -t civitas-backend .
docker run --env-file .env -p 3001:3001 civitas-backend

# Exact same environment as production
```

### Why NOT docker-compose?

**You have a single service** - docker-compose is designed for multi-service apps:

```yaml
# ❌ Overkill - you don't need orchestration for one container
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "3001:3001"
```

**Use docker-compose ONLY if you add:**
- Local PostgreSQL for testing
- Redis for caching
- Multiple microservices
- Local development with multiple containers

**For now**: Single `Dockerfile` is perfect.

---

## 2. Quick Start (5 minutes)

### Prerequisites

- [Railway account](https://railway.app) (free tier available)
- [Railway CLI](https://docs.railway.app/develop/cli) installed
- Docker installed (optional, for local testing)
- GitHub repo connected

### Step 1: Install Railway CLI

```bash
# macOS
brew install railway

# Windows
scoop install railway

# Linux
curl -fsSL https://railway.app/install.sh | sh

# Verify installation
railway version
```

### Step 2: Login and Link Project

```bash
# Login to Railway
railway login

# Navigate to backend directory
cd backend

# Create new project (or link existing)
railway init

# Follow prompts:
# - Project name: civitas-backend
# - Environment: production
```

### Step 3: Set Environment Variables

```bash
# Add environment variables
railway variables set NODE_ENV=production
railway variables set PORT=3001
railway variables set FRONTEND_URL=https://civitas.app
railway variables set BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
railway variables set CIVITAS_FACTORY_ADDRESS=0xa44EbCC68383fc6761292A4D5Ec13127Cc123B56
railway variables set NEXT_PUBLIC_SUPABASE_URL=https://rauowpwmuscewwffpocn.supabase.co
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
railway variables set SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Or use Railway dashboard (recommended for secrets)
railway open
# Go to Variables tab, paste all env vars
```

### Step 4: Deploy

```bash
# Deploy to Railway
railway up

# Railway will:
# 1. Detect Dockerfile
# 2. Build Docker image
# 3. Push to Railway registry
# 4. Deploy and start container
# 5. Expose on public URL

# Get public URL
railway domain

# Example output: https://civitas-backend-production.up.railway.app
```

### Step 5: Verify Deployment

```bash
# Check logs
railway logs

# Test health endpoint
curl https://civitas-backend-production.up.railway.app/health

# Expected response:
# {"status":"ok","timestamp":"2026-02-06T12:00:00.000Z"}
```

### Step 6: Configure Custom Domain (Optional)

```bash
# Add custom domain via CLI
railway domain add api.civitas.app

# Or via dashboard:
railway open
# Go to Settings → Domains → Add Custom Domain
# Enter: api.civitas.app
# Configure DNS:
#   Type: CNAME
#   Name: api
#   Value: civitas-backend-production.up.railway.app
```

**Done! Your backend is live.** 🚀

---

## 3. Detailed Setup

### 3.1 Project Structure

```
backend/
├── src/
│   ├── index.ts          # Express server entry point
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── listeners/        # Event listeners
│   └── ...
├── dist/                 # Compiled JavaScript (after build)
├── Dockerfile            # ✅ Docker configuration
├── .dockerignore         # ✅ Docker ignore patterns
├── railway.json          # ✅ Railway configuration
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
└── .env.example
```

### 3.2 Dockerfile Explanation

```dockerfile
# ----- Build Stage -----
# Multi-stage build for smaller image size
FROM node:20-alpine AS builder

# Install pnpm (faster than npm)
RUN npm install -g pnpm

WORKDIR /app

# Copy only package files first (better caching)
COPY package.json pnpm-lock.yaml ./

# Install ALL dependencies (including devDependencies for TypeScript build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN pnpm build

# Remove devDependencies to reduce size
RUN pnpm prune --prod

# ----- Production Stage -----
FROM node:20-alpine AS production

# Smaller base image (alpine = ~50MB vs ~900MB)
WORKDIR /app

# Copy only built artifacts and production dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Security: Run as non-root user
RUN adduser -S nodejs -u 1001
USER nodejs

# Expose port
EXPOSE 3001

# Health check for Railway
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "dist/index.js"]
```

**Key Optimizations:**
- **Multi-stage build**: Final image only 150-200 MB (vs 1+ GB)
- **Layer caching**: `package.json` cached separately from source code
- **Alpine Linux**: Minimal base image
- **Non-root user**: Security best practice
- **Health check**: Railway auto-restarts if unhealthy

### 3.3 Railway Configuration (`railway.json`)

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",           // Use our Dockerfile
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "numReplicas": 1,                  // Single instance (increase for HA)
    "restartPolicyType": "ON_FAILURE", // Auto-restart on crash
    "restartPolicyMaxRetries": 10,     // Max 10 restart attempts
    "healthcheckPath": "/health",      // Health check endpoint
    "healthcheckTimeout": 300          // 5 minute startup timeout
  }
}
```

### 3.4 Local Docker Testing

```bash
# Build image
docker build -t civitas-backend .

# Run container with env file
docker run --env-file .env -p 3001:3001 civitas-backend

# Run container with interactive shell (debugging)
docker run -it --env-file .env civitas-backend sh

# Check logs
docker logs <container-id>

# Stop container
docker stop <container-id>
```

---

## 4. Environment Variables

### 4.1 Required Variables

Add these in Railway dashboard (Settings → Variables):

```env
# Server
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://civitas.app

# Blockchain
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
CIVITAS_FACTORY_ADDRESS=0xa44EbCC68383fc6761292A4D5Ec13127Cc123B56

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://rauowpwmuscewwffpocn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional: Keeper for automated rent releases
KEEPER_PRIVATE_KEY=0x...
```

### 4.2 How to Add Variables

**Option 1: Railway Dashboard (Recommended for Secrets)**
1. Go to https://railway.app/project/your-project
2. Click on backend service
3. Go to "Variables" tab
4. Click "Raw Editor"
5. Paste all variables (one per line: `KEY=value`)
6. Click "Save"

**Option 2: Railway CLI**
```bash
# Single variable
railway variables set KEY=value

# From .env file (⚠️ be careful with secrets)
railway variables set --from .env

# List all variables
railway variables list
```

**Option 3: Railway API**
```bash
# For CI/CD pipelines
curl -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $RAILWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { variableUpsert(input: {projectId: \"...\", environmentId: \"...\", name: \"KEY\", value: \"value\"}) { id } }"}'
```

### 4.3 Railway Provides Automatically

Railway injects these variables automatically (no need to set):

```env
RAILWAY_ENVIRONMENT=production
RAILWAY_SERVICE_NAME=civitas-backend
RAILWAY_DEPLOYMENT_ID=...
RAILWAY_REPLICA_ID=...
RAILWAY_PUBLIC_DOMAIN=civitas-backend-production.up.railway.app
```

Use them for debugging:
```typescript
console.log('Deployed on Railway:', process.env.RAILWAY_DEPLOYMENT_ID);
```

---

## 5. Deployment Workflow

### 5.1 Automatic Deployments (Recommended)

**Connect GitHub Repository:**

1. Go to Railway dashboard
2. Click backend service → Settings
3. Connect to GitHub
4. Select repo: `your-org/civitas`
5. Set root directory: `/backend`
6. Set branch: `main`

**Automatic triggers:**
```bash
# Every push to main branch triggers deployment
git add .
git commit -m "feat: add new endpoint"
git push origin main

# Railway automatically:
# 1. Detects push via webhook
# 2. Builds Docker image
# 3. Runs health check
# 4. Deploys with zero downtime
# 5. Sends notification
```

### 5.2 Manual Deployments

```bash
# Via CLI (useful for hotfixes)
cd backend
railway up

# With custom branch
railway up --branch staging

# Force rebuild (ignores cache)
railway up --no-cache
```

### 5.3 Preview Deployments (for PRs)

```bash
# Create PR in GitHub
# Railway automatically creates preview deployment

# Access preview URL
https://civitas-backend-pr-123.up.railway.app

# Test changes before merging
curl https://civitas-backend-pr-123.up.railway.app/health
```

### 5.4 Rollback

```bash
# Via Dashboard
# 1. Go to Deployments tab
# 2. Find previous successful deployment
# 3. Click "Redeploy"

# Via CLI
railway status  # List recent deployments
railway redeploy <deployment-id>
```

---

## 6. Monitoring & Debugging

### 6.1 Real-Time Logs

```bash
# Stream logs (like `tail -f`)
railway logs

# Filter by service
railway logs --service civitas-backend

# Show last 100 lines
railway logs --tail 100

# Filter by log level
railway logs | grep ERROR
```

**Dashboard Logs:**
1. Go to Railway dashboard → Service → Logs
2. Real-time streaming
3. Search/filter functionality
4. Download logs

### 6.2 Metrics Dashboard

Railway provides built-in metrics:

1. Go to Service → Metrics
2. View:
   - **CPU Usage** (% of allocated)
   - **Memory Usage** (MB)
   - **Network In/Out** (MB)
   - **Request Count** (if HTTP)
   - **Response Time** (p50, p95, p99)

**Set Alerts:**
1. Go to Service → Observability → Alerts
2. Configure:
   - CPU > 80% for 5 minutes → Email
   - Memory > 90% → Restart
   - Health check failing → Email

### 6.3 Health Checks

Railway automatically hits `/health` endpoint:

```typescript
// backend/src/index.ts
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});
```

**Configure health check:**
```json
// railway.json
{
  "deploy": {
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300,  // 5 minutes
    "healthcheckInterval": 30   // Check every 30s
  }
}
```

### 6.4 Debugging

**Access Container Shell:**
```bash
# Not directly supported by Railway CLI
# Use this workaround:

# 1. Add debug endpoint
app.get('/debug/shell', (req, res) => {
  const { exec } = require('child_process');
  exec(req.query.cmd, (error, stdout, stderr) => {
    res.json({ stdout, stderr, error });
  });
});

# 2. Execute commands via HTTP
curl "https://your-app.railway.app/debug/shell?cmd=ls%20-la"

# ⚠️ Remove in production! Security risk.
```

**Better approach - Add debug logs:**
```typescript
// Enhanced logging
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

// Use throughout app
logger.info('Event listener started', { blockNumber: 12345 });
logger.error('RPC call failed', { error: err.message });
```

### 6.5 Event Listener Monitoring

Add custom metrics for event listener:

```typescript
// backend/src/listeners/monitor.ts
let lastBlockChecked = 0;
let eventsProcessed = 0;

setInterval(() => {
  console.log(JSON.stringify({
    metric: 'event_listener_status',
    lastBlockChecked,
    eventsProcessed,
    lag: currentBlock - lastBlockChecked,
    timestamp: new Date().toISOString(),
  }));
}, 60000); // Log every minute
```

Parse in Railway dashboard or export to external monitoring (Datadog, Grafana).

---

## 7. Cost Breakdown

### 7.1 Railway Pricing

| Plan | Price/Month | Resources | Best For |
|------|-------------|-----------|----------|
| **Trial** | $0 | $5 credit, 500 execution hours | Testing |
| **Developer** | $20 | Unlimited hours, 8 GB RAM, 8 vCPUs | Solo devs, MVP |
| **Team** | $20/seat | Same as Developer + collaboration | Small teams |
| **Enterprise** | Custom | Custom resources + SLA | Large orgs |

**Your backend needs:**
- **Recommended**: Developer plan ($20/month)
- Resources: ~512 MB RAM, 0.5 vCPU (actual usage)
- Unlimited execution hours (for 24/7 event listener)

### 7.2 Cost Comparison

| Item | Railway | EC2 (t3.small) |
|------|---------|----------------|
| Compute | $20/month (unlimited hours) | $15/month (730 hours) |
| Storage | Included (Docker layers) | $2/month (20 GB EBS) |
| Data Transfer | 100 GB free, $0.10/GB | 100 GB free, $0.09/GB |
| SSL/Domain | Free | Free (Let's Encrypt) |
| Monitoring | Free (built-in) | $3-5/month (CloudWatch) |
| Load Balancer | N/A (single instance) | $16/month (ALB) |
| **Total** | **$20/month** | **$20-40/month** |
| **Your Time** | **0 hours/month** | **3-5 hours/month** |

**Value Proposition:**
- Railway saves 3-5 hours/month of DevOps work
- At $50/hour developer rate = **$150-250/month saved**
- Clear ROI: Spend $20, save $150+ in time

### 7.3 Resource Monitoring

**Monitor usage to optimize costs:**

```bash
# Check resource usage
railway status

# View detailed metrics
railway logs | grep "Memory usage"
```

**Optimize Docker image:**
```bash
# Check image size
docker images civitas-backend

# If > 300 MB, optimize:
# - Use alpine base image ✅ (already done)
# - Remove devDependencies ✅ (already done)
# - Use multi-stage build ✅ (already done)
# - Remove unused files (.dockerignore) ✅ (already done)
```

---

## 8. Migration from EC2

### If You Already Have EC2 Deployment

**Migration Steps:**

1. **Deploy to Railway (parallel)**
   ```bash
   cd backend
   railway init
   railway up
   ```

2. **Update frontend to use Railway backend**
   ```bash
   # In Vercel dashboard
   NEXT_PUBLIC_BACKEND_URL=https://civitas-backend-production.up.railway.app
   ```

3. **Test Railway deployment**
   ```bash
   # Verify health
   curl https://civitas-backend-production.up.railway.app/health

   # Test API endpoints
   curl https://civitas-backend-production.up.railway.app/api/templates
   ```

4. **Monitor for 24 hours**
   - Check Railway logs for errors
   - Verify event listener working
   - Confirm cron jobs running

5. **Terminate EC2 instance**
   ```bash
   # Stop instance
   aws ec2 stop-instances --instance-ids i-xxxxx

   # After confirming Railway works, terminate
   aws ec2 terminate-instances --instance-ids i-xxxxx
   ```

**No Downtime Migration:**
- Railway and EC2 run in parallel
- Switch traffic via environment variable
- Instant rollback if needed

---

## 9. Troubleshooting

### Issue: Build Fails

**Symptoms:**
```
Error: Cannot find module '@supabase/supabase-js'
```

**Cause:** Missing dependencies in Docker image

**Fix:**
```bash
# Ensure pnpm-lock.yaml is committed
git add pnpm-lock.yaml
git commit -m "chore: add lockfile"
git push

# Or rebuild with no cache
railway up --no-cache
```

### Issue: Health Check Failing

**Symptoms:**
```
Health check timeout after 300s
```

**Cause:** App takes too long to start

**Fix:**
```json
// railway.json - increase timeout
{
  "deploy": {
    "healthcheckTimeout": 600  // 10 minutes
  }
}
```

Or optimize startup:
```typescript
// backend/src/index.ts
// Start server BEFORE event listener
const server = app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
});

// Then start event listener
startEventListener();
```

### Issue: Event Listener Not Working

**Symptoms:**
- No events in database
- Logs show "RPC rate limit exceeded"

**Diagnostics:**
```bash
railway logs | grep "Event listener"
```

**Fix:**
```bash
# Upgrade RPC provider (Alchemy free tier may be limiting)
# Switch to paid tier: $49/month for 30M compute units

# Or reduce polling frequency
const POLLING_INTERVAL = 30000; // 30s instead of 10s
```

### Issue: High Memory Usage

**Symptoms:**
```
Memory usage: 450 MB / 512 MB (87%)
```

**Cause:** Event listener holding too many logs in memory

**Fix:**
```typescript
// backend/src/listeners/index.ts
// Process events in batches
const BATCH_SIZE = 100;
for (let i = 0; i < events.length; i += BATCH_SIZE) {
  const batch = events.slice(i, i + BATCH_SIZE);
  await processEvents(batch);
}
```

Or increase Railway memory:
```bash
# Railway dashboard → Settings → Resources
# Increase memory limit: 1 GB
# (stays within $20/month Developer plan)
```

### Issue: Cannot Connect to Supabase

**Symptoms:**
```
Error: Connection timeout to Supabase
```

**Cause:** Railway IP not whitelisted (if you have IP restrictions)

**Fix:**
```bash
# Railway uses dynamic IPs - whitelist all IPs or use connection pooling
# Supabase dashboard → Settings → Network → Allow all IPs (0.0.0.0/0)

# Or use Supabase connection pooler
SUPABASE_URL=https://<project>.supabase.co
# Connection pooler: postgresql://...:6543/postgres
```

### Issue: Slow Deployments

**Symptoms:**
- Builds take 5+ minutes

**Cause:** Large Docker layers not cached

**Fix:**
```dockerfile
# Optimize Dockerfile layer caching
# Copy package.json first (changes rarely)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

# Copy source code last (changes frequently)
COPY . .
RUN pnpm build
```

Or use Railway build cache:
```bash
# Railway caches layers by default
# Force cache clear if needed:
railway up --no-cache
```

---

## 10. CI/CD with GitHub Actions

**Automated workflow:**

Create `.github/workflows/deploy-backend.yml`:

```yaml
name: Deploy Backend to Railway

on:
  push:
    branches:
      - main
    paths:
      - 'backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Railway CLI
        run: npm install -g @railway/cli

      - name: Deploy to Railway
        working-directory: backend
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: railway up --detach
```

**Get Railway token:**
```bash
railway login --email
railway tokens:create
# Add to GitHub Secrets as RAILWAY_TOKEN
```

---

## 11. Production Checklist

Before going live:

- [ ] Environment variables set in Railway
- [ ] Custom domain configured (`api.civitas.app`)
- [ ] Health checks passing
- [ ] Event listener logging events
- [ ] Cron jobs running (check logs every 5 minutes)
- [ ] Frontend can reach backend API
- [ ] Supabase connection working
- [ ] RPC provider quota sufficient
- [ ] Alerts configured (email on errors)
- [ ] Logs retention configured (7-30 days)
- [ ] Backup strategy for database (Supabase backups enabled)
- [ ] Secrets rotation schedule (90 days)

---

## 12. Scaling Strategies

### Vertical Scaling (Increase Resources)

Railway auto-scales within plan limits. If needed:

1. Go to Settings → Resources
2. Increase:
   - Memory: 512 MB → 1 GB → 2 GB
   - CPU: 0.5 vCPU → 1 vCPU → 2 vCPUs

**When to scale:**
- Memory usage > 80% sustained
- CPU usage > 70% sustained
- Response times increasing

### Horizontal Scaling (Multiple Instances)

```json
// railway.json
{
  "deploy": {
    "numReplicas": 3  // Run 3 instances
  }
}
```

**Considerations:**
- Event listener may process duplicate events (add idempotency)
- Use Redis for shared state
- Railway load balances automatically

**For your use case: 1 replica is sufficient**

---

## 13. Comparison Summary

| Aspect | Railway + Docker | EC2 + Native |
|--------|------------------|--------------|
| **Setup Time** | 5 minutes | 2-3 hours |
| **Deployment** | `railway up` | SSH + rebuild + restart |
| **SSL** | Automatic | Manual (Certbot) |
| **Logs** | Built-in streaming | Configure + manage |
| **Monitoring** | Built-in dashboard | Setup CloudWatch |
| **Cost** | $20/month | $15-40/month |
| **Maintenance** | Zero | 3-5 hours/month |
| **Scaling** | Click to scale | Provision instances |
| **Long-running** | ✅ Supported | ✅ Supported |
| **Docker** | ✅ Native support | Manual setup |
| **Rollback** | One click | Git + rebuild |
| **For Solo Dev** | **⭐ Recommended** | Overkill |

---

## Conclusion

**Recommended Setup: Railway + Docker (single Dockerfile)**

✅ **Use Railway because:**
- Zero DevOps overhead
- Perfect for solo developers
- Supports long-running processes (event listeners, cron jobs)
- Auto-deployments from GitHub
- Built-in monitoring and logs
- Cost-effective ($20/month)

✅ **Use Docker because:**
- Dev-prod parity
- Reproducible builds
- Railway auto-detects and optimizes
- Easy local testing

❌ **Don't use docker-compose because:**
- Overkill for single service
- No orchestration needed
- Adds unnecessary complexity

---

**Ready to deploy?**

```bash
cd backend
railway login
railway init
railway up
```

You're live in 5 minutes! 🚀
