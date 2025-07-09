# Jadoo API Documentation

## Overview

The Jadoo API provides endpoints for product feed transformation, user management, and analytics. All API requests should be made to the base URL of your Jadoo instance.

**Base URL**: `https://your-domain.com/api`

## Authentication

Jadoo uses Supabase JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Getting a Token

1. Register or sign in through the frontend
2. The JWT token is automatically managed by Supabase
3. Use the token in API requests for protected endpoints

## Endpoints

### Authentication

#### Register User
```http
POST /auth/signup
```

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response**:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "message": "Account created successfully"
}
```

#### Sign In
```http
POST /auth/signin
```

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response**:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "message": "Signed in successfully"
}
```

#### Sign Out
```http
POST /auth/signout
```

**Response**:
```json
{
  "message": "Signed out successfully"
}
```

### Feed Management

#### List Feeds
```http
GET /feeds
```

**Query Parameters**:
- `limit` (optional): Number of feeds to return (default: 50)
- `offset` (optional): Number of feeds to skip (default: 0)
- `status` (optional): Filter by status (processing, completed, failed)

**Response**:
```json
[
  {
    "id": "feed_123",
    "filename": "products.csv",
    "platform": "walmart",
    "status": "completed",
    "created_at": "2024-01-01T00:00:00Z",
    "output_path": "https://storage.example.com/feed_123.xlsx",
    "summary_json": {
      "total_rows": 100,
      "processed_rows": 100,
      "avg_confidence": 0.85
    }
  }
]
```

#### Upload Feed
```http
POST /simple-upload
```

**Request**: Multipart form data
- `file`: CSV/Excel file
- `platform`: Target marketplace (walmart, amazon, etc.)
- `email`: User email
- `category` (optional): Product category

**Response**:
```json
{
  "feed_id": "feed_123",
  "status": "queued",
  "message": "File uploaded and job enqueued",
  "file_info": {
    "name": "products.csv",
    "size": 1024,
    "type": "text/csv"
  },
  "platform": "walmart",
  "category": "auto-detect"
}
```

#### Download Feed
```http
GET /feeds/{feedId}/download
```

**Response**: File download (XLSX format)

#### Check Feed Status
```http
GET /feeds/{feedId}/ready
```

**Response**:
```json
{
  "ready": true,
  "url": "https://storage.example.com/feed_123.xlsx"
}
```

#### Get Feed Progress
```http
GET /feeds/{feedId}/progress
```

**Response**:
```json
{
  "feed_id": "feed_123",
  "status": "processing",
  "progress": 75,
  "message": "Processing products...",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Job Management

#### Get Job Status
```http
GET /jobs/{feedId}/status
```

**Response**:
```json
{
  "jobId": "job_456",
  "feedId": "feed_123",
  "status": "completed",
  "progress": 100,
  "createdAt": "2024-01-01T00:00:00Z",
  "finishedAt": "2024-01-01T00:05:00Z",
  "platform": "walmart",
  "fileName": "products.csv",
  "feed": {
    "id": "feed_123",
    "output_path": "https://storage.example.com/feed_123.xlsx"
  }
}
```

### Analytics

#### Dashboard Data
```http
GET /analytics/dashboard
```

**Response**:
```json
{
  "success": true,
  "data": {
    "totalFeeds": 150,
    "totalProducts": 15000,
    "successRate": 0.95,
    "avgProcessingTime": 120,
    "recentActivity": [
      {
        "feedId": "feed_123",
        "status": "completed",
        "timestamp": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

#### Job Performance
```http
GET /analytics/jobs
```

**Query Parameters**:
- `platform` (optional): Filter by platform
- `category` (optional): Filter by category
- `startDate` (optional): Start date for range
- `endDate` (optional): End date for range

**Response**:
```json
{
  "success": true,
  "data": {
    "totalJobs": 150,
    "successRate": 0.95,
    "avgProcessingTime": 120,
    "platformBreakdown": {
      "walmart": 80,
      "amazon": 45,
      "meta": 25
    }
  }
}
```

#### Field Performance
```http
GET /analytics/fields
```

**Response**:
```json
{
  "success": true,
  "data": {
    "totalFields": 262,
    "mappedFields": 25,
    "mappingSuccessRate": 0.095,
    "topFields": [
      {
        "name": "product_name",
        "successRate": 0.98,
        "usageCount": 150
      }
    ]
  }
}
```

#### LLM Performance
```http
GET /analytics/llm
```

**Response**:
```json
{
  "success": true,
  "data": {
    "totalCalls": 15000,
    "successRate": 0.99,
    "avgResponseTime": 2.5,
    "modelUsage": {
      "gpt-4o": 1000,
      "gpt-4o-mini": 14000
    },
    "costAnalysis": {
      "totalCost": 45.50,
      "avgCostPerProduct": 0.003
    }
  }
}
```

#### Recent Analytics
```http
GET /analytics/recent
```

**Query Parameters**:
- `limit` (optional): Number of recent items (default: 10)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "feedId": "feed_123",
      "platform": "walmart",
      "status": "completed",
      "processingTime": 120,
      "productCount": 100,
      "timestamp": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Templates

#### Get Platform Categories
```http
GET /platforms/{platform}/categories
```

**Response**:
```json
{
  "platform": "walmart",
  "categories": [
    "Cell Phones",
    "Computer Monitors",
    "Desktop Computers",
    "Headphones",
    "Laptop Computers"
  ]
}
```

### Health Check

#### API Health
```http
GET /health
```

**Response**:
```json
{
  "status": "ok",
  "message": "Jadoo backend is running",
  "timestamp": "2024-01-01T00:00:00Z",
  "endpoints": {
    "simpleUpload": "POST /api/simple-upload",
    "process": "POST /api/process/:id",
    "download": "GET /api/download/:file"
  }
}
```

## Error Handling

### Error Response Format

All error responses follow this format:

```json
{
  "error": "Error message",
  "details": "Additional error details",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

- `400`: Bad Request - Invalid input data
- `401`: Unauthorized - Authentication required
- `403`: Forbidden - Insufficient permissions
- `404`: Not Found - Resource not found
- `413`: Payload Too Large - File too large
- `422`: Unprocessable Entity - Validation failed
- `500`: Internal Server Error - Server error

### Example Error Responses

#### Authentication Error
```json
{
  "error": "Authentication failed",
  "details": "Invalid email or password",
  "code": "AUTH_ERROR"
}
```

#### File Upload Error
```json
{
  "error": "Upload failed",
  "details": "Only CSV and Excel files are allowed",
  "code": "FILE_TYPE_ERROR"
}
```

#### Processing Error
```json
{
  "error": "Transformation failed",
  "details": "Invalid CSV format",
  "code": "PROCESSING_ERROR"
}
```

## Rate Limiting

API requests are rate-limited to prevent abuse:

- **Authentication endpoints**: 10 requests per minute
- **Upload endpoints**: 5 requests per minute
- **Analytics endpoints**: 60 requests per minute
- **Other endpoints**: 100 requests per minute

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## File Upload Guidelines

### Supported Formats

- **CSV**: Comma-separated values
- **Excel**: .xlsx files (Office 2007+)

### File Size Limits

- **Maximum file size**: 10MB
- **Recommended size**: <5MB for optimal performance

### Required Fields

Minimum required fields for processing:

- Product name or title
- Price
- SKU or product ID

### Best Practices

1. **Clean data**: Remove empty rows and invalid characters
2. **Consistent formatting**: Use consistent date and price formats
3. **Descriptive headers**: Use clear, descriptive column names
4. **Backup**: Keep original files as backup

## SDKs and Libraries

### JavaScript/TypeScript

```javascript
// Example using fetch
const uploadFeed = async (file, platform) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('platform', platform);
  formData.append('email', 'user@example.com');

  const response = await fetch('/api/simple-upload', {
    method: 'POST',
    body: formData,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return response.json();
};
```

### Python

```python
import requests

def upload_feed(file_path, platform, token):
    url = "https://your-domain.com/api/simple-upload"
    
    with open(file_path, 'rb') as f:
        files = {'file': f}
        data = {
            'platform': platform,
            'email': 'user@example.com'
        }
        headers = {'Authorization': f'Bearer {token}'}
        
        response = requests.post(url, files=files, data=data, headers=headers)
        return response.json()
```

## Webhooks

Jadoo supports webhooks for real-time notifications:

### Webhook Events

- `feed.completed`: Feed processing completed
- `feed.failed`: Feed processing failed
- `job.started`: Job processing started
- `job.progress`: Job progress update

### Webhook Configuration

Configure webhooks in your account settings:

```json
{
  "url": "https://your-domain.com/webhooks/jadoo",
  "events": ["feed.completed", "feed.failed"],
  "secret": "your-webhook-secret"
}
```

### Webhook Payload

```json
{
  "event": "feed.completed",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "feedId": "feed_123",
    "status": "completed",
    "downloadUrl": "https://storage.example.com/feed_123.xlsx"
  }
}
```

## Support

For API support and questions:

- **Documentation**: Check this documentation
- **Examples**: See the `/docs/examples` directory
- **Status**: Check `/health` endpoint
- **Contact**: Reach out to the development team

---

This API documentation covers all current endpoints and provides examples for integration. 