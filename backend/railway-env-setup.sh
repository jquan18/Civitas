#!/bin/bash

# Railway Environment Variables Setup Script
# This sets all required environment variables for Base Sepolia (Testnet)

echo "🚀 Setting up Railway environment variables..."
echo ""
echo "Setting server configuration..."

railway variables set NODE_ENV=production
railway variables set PORT=3001
railway variables set FRONTEND_URL=https://civitas.app

echo ""
echo "Setting Base Sepolia (Testnet) blockchain configuration..."

railway variables set BASE_RPC_URL=https://sepolia.base.org
railway variables set CIVITAS_FACTORY_ADDRESS=0xa44EbCC68383fc6761292A4D5Ec13127Cc123B56

echo ""
echo "Setting Supabase database configuration..."

railway variables set NEXT_PUBLIC_SUPABASE_URL=https://rauowpwmuscewwffpocn.supabase.co
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdW93cHdtdXNjZXd3ZmZwb2NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NTM3NDgsImV4cCI6MjA4NTUyOTc0OH0.FuLlRVpOQraz5yiqa9jIOWqpeYC4v0hd4nO0oUSxeo4
railway variables set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdW93cHdtdXNjZXd3ZmZwb2NuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTk1Mzc0OCwiZXhwIjoyMDg1NTI5NzQ4fQ.kEibEnU3OB9JHlfL8pm9ZHBYRrWfc-eP-xz1cUXINto

echo ""
echo "✅ All environment variables set!"
echo ""
echo "Your backend will automatically redeploy with these settings."
echo ""
echo "🔍 Check deployment status:"
echo "   railway logs --tail 50"
echo ""
echo "🌐 Your backend URL:"
echo "   https://civitas-production-4c27.up.railway.app"
echo ""
