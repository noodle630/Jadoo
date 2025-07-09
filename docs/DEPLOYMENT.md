# Jadoo Deployment Guide - Lovable Platform

## Overview

This guide covers deploying Jadoo on the Lovable platform, including environment setup, configuration, and troubleshooting.

## Prerequisites

Before deploying to Lovable, ensure you have:

- A Lovable account
- GitHub repository with Jadoo code
- Supabase project configured
- Redis instance (Redis Cloud recommended)
- Environment variables ready

## Lovable Platform Setup

### 1. Connect Repository

1. **Login to Lovable Dashboard**
   - Navigate to [Lovable](https://lovable.dev)
   - Sign in with your account

2. **Create New Project**
   - Click "New Project"
   - Select "Connect GitHub Repository"
   - Choose your Jadoo repository

3. **Configure Build Settings**
   - **Framework**: Node.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `client/dist`
   - **Install Command**: `npm install && cd client && npm install`

### 2. Environment Configuration

Set the following environment variables in Lovable dashboard:

#### Backend Environment Variables

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret

# Redis Configuration
REDIS_URL=your_redis_url

# Server Configuration
PORT=4000
NODE_ENV=production

# Optional: Stripe Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PRICE_ID_BASIC=your_basic_price_id
STRIPE_PRICE_ID_PREMIUM=your_premium_price_id
STRIPE_SUCCESS_URL=https://your-domain.com/success
STRIPE_CANCEL_URL=https://your-domain.com/cancel
```

#### Frontend Environment Variables

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# API Configuration
VITE_API_URL=https://your-domain.com/api
```

### 3. Build Configuration

Create a `lovable.json` file in your project root:

```json
{
  "build": {
    "command": "npm run build:all",
    "output": "client/dist"
  },
  "start": {
    "command": "npm start"
  },
  "env": {
    "NODE_ENV": "production"
  }
}
```

Update your `package.json` scripts:

```json
{
  "scripts": {
    "build:all": "npm install && cd client && npm install && npm run build",
    "start": "node server/index.js",
    "dev:server": "nodemon server/index.js",
    "dev:client": "cd client && npm run dev"
  }
}
```

## Supabase Setup

### 1. Database Configuration

1. **Create Supabase Project**
   - Go to [Supabase](https://supabase.com)
   - Create new project
   - Note your project URL and keys

2. **Run Migrations**
   ```bash
   # Apply database migrations
   psql -h your-project.supabase.co -U postgres -d postgres -f supabase-migrations/analytics.sql
   psql -h your-project.supabase.co -U postgres -d postgres -f supabase-migrations/llm_cache.sql
   ```

3. **Configure Row Level Security (RLS)**
   ```sql
   -- Enable RLS on feeds table
   ALTER TABLE feeds ENABLE ROW LEVEL SECURITY;
   
   -- Create policy for user access
   CREATE POLICY "Users can view own feeds" ON feeds
     FOR SELECT USING (auth.uid()::text = user_id::text);
   
   CREATE POLICY "Users can insert own feeds" ON feeds
     FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
   ```

### 2. Storage Configuration

1. **Create Storage Buckets**
   ```sql
   -- Create feeds bucket
   INSERT INTO storage.buckets (id, name, public) 
   VALUES ('feeds', 'feeds', true);
   
   -- Create templates bucket
   INSERT INTO storage.buckets (id, name, public) 
   VALUES ('templates', 'templates', true);
   ```

2. **Configure Storage Policies**
   ```sql
   -- Allow public read access to feeds
   CREATE POLICY "Public read access" ON storage.objects
     FOR SELECT USING (bucket_id = 'feeds');
   
   -- Allow authenticated users to upload
   CREATE POLICY "Authenticated users can upload" ON storage.objects
     FOR INSERT WITH CHECK (bucket_id = 'feeds' AND auth.role() = 'authenticated');
   ```

### 3. Authentication Setup

1. **Configure Auth Settings**
   - Go to Authentication > Settings
   - Set your site URL
   - Configure email templates
   - Set up redirect URLs

2. **Enable Email Confirmation**
   - Enable email confirmation in auth settings
   - Configure SMTP settings if needed

## Redis Setup

### 1. Redis Cloud Configuration

1. **Create Redis Cloud Account**
   - Go to [Redis Cloud](https://redis.com/try-free/)
   - Create free account
   - Create new database

2. **Get Connection Details**
   - Note your Redis URL
   - Format: `redis://username:password@host:port`

3. **Test Connection**
   ```bash
   # Test Redis connection
   redis-cli -u your_redis_url ping
   ```

### 2. Local Redis (Development)

For local development:

```bash
# Install Redis
brew install redis  # macOS
sudo apt-get install redis-server  # Ubuntu

# Start Redis
redis-server

# Test connection
redis-cli ping
```

## Deployment Process

### 1. Initial Deployment

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial deployment setup"
   git push origin main
   ```

2. **Trigger Lovable Build**
   - Lovable will automatically detect changes
   - Monitor build progress in dashboard
   - Check build logs for any errors

3. **Verify Deployment**
   - Check application health: `https://your-domain.com/health`
   - Test authentication flow
   - Verify file upload functionality

### 2. Continuous Deployment

Lovable automatically deploys on:
- Push to `main` branch
- Pull request merges
- Manual deployment triggers

## Domain Configuration

### 1. Custom Domain Setup

1. **Add Custom Domain**
   - Go to Lovable project settings
   - Add custom domain
   - Update DNS records as instructed

2. **SSL Certificate**
   - Lovable automatically provisions SSL
   - Certificate renewal is automatic

### 2. Environment-Specific URLs

Update your environment variables with production URLs:

```bash
# Production URLs
VITE_API_URL=https://your-domain.com/api
STRIPE_SUCCESS_URL=https://your-domain.com/success
STRIPE_CANCEL_URL=https://your-domain.com/cancel
```

## Monitoring and Logs

### 1. Application Logs

Access logs in Lovable dashboard:
- **Function Logs**: View server-side logs
- **Build Logs**: View deployment logs
- **Error Logs**: View error tracking

### 2. Performance Monitoring

Monitor application performance:
- **Response Times**: API endpoint performance
- **Error Rates**: Application error tracking
- **Resource Usage**: Memory and CPU usage

### 3. Health Checks

Implement health check endpoints:

```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version
  });
});
```

## Troubleshooting

### Common Issues

#### 1. Build Failures

**Problem**: Build fails during deployment
**Solution**:
- Check build logs in Lovable dashboard
- Verify all dependencies are in `package.json`
- Ensure build commands are correct

#### 2. Environment Variables

**Problem**: Environment variables not available
**Solution**:
- Verify variables are set in Lovable dashboard
- Check variable names match code
- Restart deployment after adding variables

#### 3. Database Connection

**Problem**: Cannot connect to Supabase
**Solution**:
- Verify `SUPABASE_URL` and keys are correct
- Check network connectivity
- Verify database is not paused

#### 4. Redis Connection

**Problem**: Queue system not working
**Solution**:
- Verify `REDIS_URL` is correct
- Check Redis instance is running
- Test connection manually

#### 5. File Upload Issues

**Problem**: File uploads failing
**Solution**:
- Check Supabase storage configuration
- Verify storage policies
- Check file size limits

### Debug Commands

```bash
# Check application status
curl https://your-domain.com/health

# Test API endpoints
curl https://your-domain.com/api/health

# Check environment variables
echo $SUPABASE_URL
echo $REDIS_URL
```

### Log Analysis

Common log patterns to monitor:

```bash
# Application errors
grep "ERROR" logs/app.log

# Database connection issues
grep "database" logs/app.log

# Redis connection issues
grep "redis" logs/app.log
```

## Security Considerations

### 1. Environment Variables

- Never commit secrets to Git
- Use Lovable's secure environment variable storage
- Rotate keys regularly

### 2. Database Security

- Enable RLS policies
- Use service role key only for backend
- Use anon key for frontend

### 3. API Security

- Implement rate limiting
- Validate all inputs
- Use HTTPS only

### 4. File Upload Security

- Validate file types
- Implement size limits
- Scan for malware (if needed)

## Scaling Considerations

### 1. Performance Optimization

- Implement caching strategies
- Optimize database queries
- Use CDN for static assets

### 2. Resource Management

- Monitor memory usage
- Implement connection pooling
- Use efficient algorithms

### 3. Load Balancing

- Lovable handles load balancing automatically
- Monitor application performance
- Scale resources as needed

## Backup and Recovery

### 1. Database Backups

- Supabase provides automatic backups
- Configure backup retention policies
- Test restore procedures

### 2. File Storage Backups

- Supabase storage is automatically backed up
- Consider additional backup strategies
- Test file recovery procedures

### 3. Configuration Backups

- Document all configuration changes
- Version control configuration files
- Maintain deployment documentation

## Support and Resources

### 1. Lovable Support

- [Lovable Documentation](https://docs.lovable.dev)
- [Lovable Community](https://community.lovable.dev)
- [Support Email](mailto:support@lovable.dev)

### 2. Jadoo Support

- Check project documentation
- Review GitHub issues
- Contact development team

### 3. Third-Party Services

- [Supabase Documentation](https://supabase.com/docs)
- [Redis Cloud Support](https://redis.com/support)
- [Stripe Documentation](https://stripe.com/docs)

---

This deployment guide covers all aspects of deploying Jadoo on the Lovable platform. For additional support, refer to the resources listed above. 