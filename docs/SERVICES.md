# Jadoo Services & Platform Integration

## Overview

Jadoo integrates with multiple services and platforms to provide a complete product feed transformation solution. This document outlines each service, its role, and how they work together.

## Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Jadoo Platform                          │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React)  │  Backend (Node.js)  │  Queue (Redis)     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Services                            │
├─────────────────┬─────────────────┬─────────────────┬───────────┤
│   Supabase      │   Lovable       │   Cloudflare    │   OpenAI  │
│   (Auth + DB)   │   (Hosting)     │   (CDN)         │   (AI)    │
└─────────────────┴─────────────────┴─────────────────┴───────────┘
```

## Supabase

### Overview
Supabase is our primary backend-as-a-service platform, providing authentication, database, and file storage.

### Services Used

#### 1. Authentication
- **Purpose**: User management and authentication
- **Features**: 
  - Email/password authentication
  - JWT token management
  - Row-level security (RLS)
  - Session management

**Configuration**:
```javascript
// Frontend configuration
const REMOVED_SECRET= createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Backend configuration
const REMOVED_SECRET= createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
```

**Key Features**:
- Automatic JWT token refresh
- Secure password hashing
- Email confirmation
- Password reset functionality

#### 2. Database (PostgreSQL)
- **Purpose**: Data persistence and management
- **Tables**:
  - `users`: User account information
  - `feeds`: Feed transformation records
  - `analytics`: Performance metrics
  - `llm_cache`: AI response caching

**Schema Example**:
```sql
-- Feeds table
CREATE TABLE feeds (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES auth.users(id),
  filename TEXT NOT NULL,
  platform TEXT NOT NULL,
  status TEXT DEFAULT 'processing',
  output_path TEXT,
  summary_json JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Row-level security
ALTER TABLE feeds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own feeds" ON feeds
  FOR SELECT USING (auth.uid()::text = user_id::text);
```

#### 3. Storage
- **Purpose**: File storage for feeds and templates
- **Buckets**:
  - `feeds`: Transformed XLSX files
  - `templates`: Marketplace template files
  - `uploads`: Temporary upload files

**Storage Policies**:
```sql
-- Public read access for feeds
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'feeds');

-- Authenticated upload access
CREATE POLICY "Authenticated upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'feeds' AND 
    auth.role() = 'authenticated'
  );
```

### Integration Points

#### Frontend Integration
```javascript
// Authentication
const { user, signIn, signOut } = useAuth();

// File upload
const { data, error } = await supabase.storage
  .from('feeds')
  .upload(`${feedId}.xlsx`, file);

// Database queries
const { data: feeds } = await supabase
  .from('feeds')
  .select('*')
  .eq('user_id', user.id);
```

#### Backend Integration
```javascript
// Database operations
const { data, error } = await supabase
  .from('feeds')
  .upsert({
    id: feedId,
    user_id: userId,
    status: 'completed',
    output_path: publicUrl
  });

// File storage
const { data: uploadData } = await supabase.storage
  .from('feeds')
  .upload(`${feedId}.xlsx`, xlsxBuffer);
```

## Redis (Queue System)

### Overview
Redis provides the queue system for background job processing using BullMQ.

### Configuration
```javascript
// Redis connection
const redisUrl = process.env.REDIS_URL;
const redis = new IORedis(redisUrl);

// Queue configuration
const feedQueue = new Queue('feed-transform', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
});
```

### Queue Types

#### 1. Feed Transformation Queue
- **Purpose**: Process file uploads and transformations
- **Job Data**:
  ```javascript
  {
    feedId: 'feed_123',
    fileBuffer: Buffer,
    fields: {
      platform: 'walmart',
      email: 'user@example.com',
      category: 'electronics'
    }
  }
  ```

#### 2. Analytics Queue
- **Purpose**: Update performance metrics
- **Job Data**:
  ```javascript
  {
    feedId: 'feed_123',
    metrics: {
      processingTime: 120,
      successRate: 0.95,
      fieldCount: 25
    }
  }
  ```

### Job Processing
```javascript
// Worker setup
feedQueue.process('feed-transform', async (job) => {
  const { feedId, fileBuffer, fields } = job.data;
  
  // Update progress
  await job.updateProgress(10);
  
  // Process transformation
  const result = await transformFeed(fileBuffer, fields);
  
  // Update progress
  await job.updateProgress(100);
  
  return result;
});
```

## Lovable Platform

### Overview
Lovable provides hosting and deployment infrastructure for Jadoo.

### Features Used

#### 1. Application Hosting
- **Runtime**: Node.js environment
- **Build System**: Automatic builds from GitHub
- **Scaling**: Automatic scaling based on demand

#### 2. Environment Management
- **Environment Variables**: Secure storage and management
- **Secrets**: Encrypted secret storage
- **Configuration**: Environment-specific settings

#### 3. Monitoring
- **Logs**: Application and build logs
- **Metrics**: Performance monitoring
- **Health Checks**: Automatic health monitoring

### Deployment Configuration
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

### Integration Benefits
- **Automatic Deployments**: Deploy on Git push
- **SSL Certificates**: Automatic HTTPS
- **CDN Integration**: Global content delivery
- **Error Tracking**: Built-in error monitoring

## Cloudflare

### Overview
Cloudflare provides CDN, DNS, and security services for Jadoo.

### Services Used

#### 1. Content Delivery Network (CDN)
- **Purpose**: Global content delivery
- **Benefits**:
  - Faster load times
  - Reduced server load
  - Global availability
  - DDoS protection

#### 2. DNS Management
- **Purpose**: Domain name resolution
- **Features**:
  - Automatic DNS management
  - Health checks
  - Load balancing
  - Failover protection

#### 3. Security Features
- **DDoS Protection**: Automatic attack mitigation
- **WAF**: Web Application Firewall
- **SSL/TLS**: Automatic certificate management
- **Rate Limiting**: API protection

### Configuration
```javascript
// CORS configuration for Cloudflare
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
```

## OpenAI

### Overview
OpenAI provides AI services for data transformation and enrichment.

### Services Used

#### 1. GPT Models
- **GPT-4o**: Premium tier transformations
- **GPT-4o-mini**: Basic tier transformations
- **Purpose**: Field mapping and data enrichment

#### 2. Integration
```javascript
// OpenAI client configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// AI transformation
const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    {
      role: 'system',
      content: 'You are an expert at transforming product data...'
    },
    {
      role: 'user',
      content: `Transform this product data: ${productData}`
    }
  ],
  temperature: 0.1
});
```

### Cost Management
- **Tier-based Model Selection**: Use appropriate models per tier
- **Caching**: Cache AI responses to reduce costs
- **Rate Limiting**: Control API usage
- **Monitoring**: Track usage and costs

## Service Integration Flow

### 1. User Authentication Flow
```
User → Frontend → Supabase Auth → JWT Token → Backend Validation
```

### 2. File Upload Flow
```
User Upload → Frontend → Backend → Redis Queue → Worker → Supabase Storage
```

### 3. Transformation Flow
```
File → Worker → OpenAI → Transform → Supabase DB → Download URL
```

### 4. Analytics Flow
```
Events → Backend → Supabase Analytics → Dashboard → Frontend Display
```

## Service Dependencies

### Critical Dependencies
1. **Supabase**: Authentication, database, storage
2. **Redis**: Queue system, job processing
3. **OpenAI**: AI transformation services

### Optional Dependencies
1. **Cloudflare**: CDN and security (can be replaced)
2. **Lovable**: Hosting (can be replaced with other platforms)

## Monitoring and Observability

### Service Health Checks
```javascript
// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      supabase: await checkSupabaseHealth(),
      redis: await checkRedisHealth(),
      openai: await checkOpenAIHealth()
    }
  };
  
  res.json(health);
});
```

### Error Tracking
- **Supabase**: Built-in error logging
- **Redis**: Connection monitoring
- **OpenAI**: API error tracking
- **Application**: Custom error logging

### Performance Monitoring
- **Response Times**: API endpoint monitoring
- **Queue Performance**: Job processing metrics
- **Database Performance**: Query optimization
- **AI Performance**: Model response times

## Security Considerations

### Data Protection
- **Encryption**: All data encrypted in transit and at rest
- **Access Control**: Row-level security in database
- **Authentication**: JWT-based secure authentication
- **Authorization**: Role-based access control

### Service Security
- **Supabase**: Built-in security features
- **Redis**: Network security and authentication
- **OpenAI**: API key management
- **Cloudflare**: DDoS protection and WAF

## Cost Optimization

### Supabase
- **Database**: Optimize queries and indexing
- **Storage**: Implement cleanup policies
- **Bandwidth**: Use CDN for static assets

### Redis
- **Connection Pooling**: Reuse connections
- **Data Expiration**: Set TTL for temporary data
- **Memory Management**: Monitor memory usage

### OpenAI
- **Model Selection**: Use appropriate models per tier
- **Caching**: Cache responses to reduce API calls
- **Prompt Optimization**: Efficient prompt design

### Cloudflare
- **Caching**: Maximize cache hit rates
- **Compression**: Enable gzip compression
- **Image Optimization**: Use Cloudflare Images

## Backup and Recovery

### Data Backup
- **Supabase**: Automatic database backups
- **Storage**: Automatic file backups
- **Configuration**: Version control for configs

### Disaster Recovery
- **Service Failover**: Multiple service providers
- **Data Recovery**: Backup restoration procedures
- **Service Migration**: Alternative service options

## Future Considerations

### Scalability
- **Horizontal Scaling**: Add more workers
- **Vertical Scaling**: Upgrade service tiers
- **Global Distribution**: Multi-region deployment

### Service Evolution
- **New AI Models**: Integration with newer models
- **Alternative Services**: Backup service providers
- **Feature Additions**: New service integrations

---

This document provides a comprehensive overview of all services and platforms used in Jadoo, their integration points, and best practices for management and optimization. 