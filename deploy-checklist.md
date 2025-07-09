# 🚀 Jadoo Production Deployment Checklist

## ✅ Current Status (Local Development)
- **Backend Server**: ✅ Running on port 4000
- **Frontend**: ✅ Running on port 5173  
- **Critical Endpoints**: ✅ 13/18 working (72.2% success rate)
- **Dependencies**: ✅ All installed (pako, etc.)
- **File Processing**: ✅ Working (jobs complete successfully)
- **Analytics**: ✅ Working (dashboard, jobs, fields)
- **Auth**: ✅ Working (Google OAuth, user endpoints)

## 🔧 Production Environment Setup

### 1. Environment Variables
Create `.env.production` with:
```bash
NODE_ENV=production
APP_URL=https://feed-flow-ai-transform.lovable.app
GOOGLE_CLIENT_ID=your-production-client-id
GOOGLE_CLIENT_SECRET=your-production-secret
GOOGLE_CALLBACK_URL=https://feed-flow-ai-transform.lovable.app/api/auth/google/callback
SUPABASE_URL=your-production-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-production-key
STRIPE_SECRET_KEY=your-production-stripe-key
REDIS_URL=your-production-redis-url
```

### 2. Frontend Environment
Create `client/.env.production`:
```bash
VITE_API_URL=https://feed-flow-ai-transform.lovable.app
```

### 3. Google OAuth Setup
- Update Google Cloud Console with production callback URL
- Use production OAuth credentials (not dev)
- Ensure callback URL matches exactly

### 4. Database & Storage
- Supabase: Use production database and storage
- Redis: Use production Redis instance
- Ensure all tables and storage buckets exist

## 🚀 Deployment Steps

### Fly.io Deployment
```bash
# Set production environment variables
fly secrets set NODE_ENV=production
fly secrets set APP_URL=https://feed-flow-ai-transform.lovable.app
# ... set all other production env vars

# Deploy
fly deploy
```

### Frontend Deployment (Lovable)
- Build with production API URL
- Deploy to your Lovable domain
- Ensure CORS is configured correctly

## 🧪 Post-Deployment Testing

### 1. Health Checks
```bash
curl https://feed-flow-ai-transform.lovable.app/api/health
curl https://feed-flow-ai-transform.lovable.app/health
```

### 2. Critical Endpoints Test
```bash
# Auth
curl https://feed-flow-ai-transform.lovable.app/api/auth/user

# Analytics  
curl https://feed-flow-ai-transform.lovable.app/api/analytics/dashboard

# Categories
curl https://feed-flow-ai-transform.lovable.app/api/platforms/walmart/categories

# Upload (test with real file)
curl -X POST https://feed-flow-ai-transform.lovable.app/api/simple-upload \
  -F "file=@test.csv" \
  -F "platform=walmart" \
  -F "email=test@example.com"
```

### 3. Frontend Integration
- Test file upload from frontend
- Test Google OAuth flow
- Test analytics dashboard
- Test download functionality

## 📊 Monitoring & Logs

### 1. Fly.io Logs
```bash
fly logs
fly logs --follow
```

### 2. Health Monitoring
- Monitor `/api/health` endpoint
- Check job processing success rates
- Monitor file upload/download success

### 3. Error Tracking
- Check for 500 errors in logs
- Monitor failed job processing
- Track authentication failures

## 🔄 Continuous Integration

### 1. Automated Testing
```bash
# Run endpoint tests before deployment
node test-endpoints.cjs
```

### 2. Environment Validation
- Verify all environment variables are set
- Test database connections
- Validate OAuth configuration

## 🚨 Troubleshooting

### Common Issues
1. **404s on endpoints**: Check route registration order
2. **500s on auth**: Verify Google OAuth credentials
3. **File upload failures**: Check Supabase storage permissions
4. **Job processing errors**: Verify Redis connection and worker processes

### Debug Commands
```bash
# Check server status
curl https://feed-flow-ai-transform.lovable.app/api/health

# Check specific endpoint
curl https://feed-flow-ai-transform.lovable.app/api/auth/user

# View logs
fly logs | grep ERROR
```

## ✅ Success Criteria
- [ ] All critical endpoints return 200/302/401 (not 404/500)
- [ ] File upload and processing works end-to-end
- [ ] Google OAuth flow completes successfully
- [ ] Analytics dashboard loads with data
- [ ] Frontend can communicate with backend
- [ ] No critical errors in production logs

## 📈 Performance Targets
- File upload: < 30 seconds
- Job processing: < 5 minutes for typical files
- API response time: < 2 seconds
- Frontend load time: < 3 seconds 