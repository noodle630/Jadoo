# Jadoo - Product Feed Transformation Platform

Jadoo is a modern, AI-powered platform for transforming product data feeds across different marketplace formats. Built with a focus on data quality, scalability, and user experience.

## 🚀 Features

- **Multi-Platform Support**: Transform feeds for Walmart, Amazon, Meta, TikTok, and more
- **AI-Powered Enrichment**: Intelligent field mapping and data enhancement
- **Real-time Processing**: Background job processing with progress tracking
- **Modern Authentication**: Supabase Auth with JWT-based security
- **Analytics Dashboard**: Comprehensive insights into transformation performance
- **Template Management**: Pre-built templates for different marketplaces and categories

## 🏗️ Architecture

Jadoo follows a modern microservices architecture:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Infrastructure │
│   (React/Vite)  │◄──►│   (Node.js)     │◄──►│   (Lovable)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Supabase      │    │   Redis Queue   │    │   Cloudflare    │
│   (Auth + DB)   │    │   (BullMQ)      │    │   (CDN)         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Shadcn/ui
- **Backend**: Node.js, Express, TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Queue System**: Redis + BullMQ
- **File Storage**: Supabase Storage
- **Hosting**: Lovable Platform
- **CDN**: Cloudflare

## 🛠️ Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Redis instance
- Supabase account

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret

# Redis Configuration
REDIS_URL=your_redis_url

# Server Configuration
PORT=4000
NODE_ENV=development

# Frontend Environment Variables (client/.env)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Jadoo
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   npm install
   
   # Install frontend dependencies
   cd client
   npm install
   cd ..
   ```

3. **Set up Supabase**
   - Create a new Supabase project
   - Run the migrations in `supabase-migrations/`
   - Configure authentication settings
   - Set up storage buckets for feeds

4. **Start the development servers**
   ```bash
   # Start backend (from root)
   npm run dev:server
   
   # Start frontend (from client directory)
   cd client
   npm run dev
   ```

## 📖 Usage

### 1. Authentication

- Register a new account at `/register`
- Sign in with email/password at `/login`
- JWT tokens are automatically managed by Supabase

### 2. Upload and Transform

1. Navigate to `/new-feed` or `/transform`
2. Select your target marketplace (Walmart, Amazon, etc.)
3. Upload your CSV file
4. The system will process your data in the background
5. Download the transformed XLSX file when ready

### 3. Monitor Progress

- View real-time processing status
- Check job progress in the dashboard
- Download completed feeds from the history page

### 4. Analytics

- View transformation statistics
- Monitor AI performance metrics
- Track field mapping success rates

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/signin` - Sign in user
- `POST /api/auth/signout` - Sign out user

### Feed Management
- `GET /api/feeds` - List all feeds
- `POST /api/simple-upload` - Upload new feed
- `GET /api/feeds/:id/download` - Download feed
- `GET /api/feeds/:id/ready` - Check feed status
- `GET /api/jobs/:id/status` - Get job status

### Analytics
- `GET /api/analytics/dashboard` - Dashboard data
- `GET /api/analytics/jobs` - Job performance
- `GET /api/analytics/fields` - Field mapping stats
- `GET /api/analytics/llm` - AI performance metrics

### Templates
- `GET /api/platforms/:platform/categories` - Get categories

## 🏗️ Development

### Project Structure

```
Jadoo/
├── client/                 # Frontend React app
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   ├── hooks/         # Custom hooks
│   │   └── lib/           # Utilities
│   └── public/            # Static assets
├── server/                # Backend Node.js app
│   ├── routes/            # API routes
│   ├── utils/             # Utilities and transformers
│   ├── queue/             # Job queue management
│   └── storage/           # Data storage layer
├── supabase-migrations/   # Database migrations
├── attached_assets/       # Templates and test data
└── docs/                  # Documentation
```

### Key Components

- **Transformer Engine**: AI-powered data transformation
- **Queue System**: Background job processing
- **Analytics Service**: Performance tracking
- **Template System**: Marketplace-specific configurations

## 🚀 Deployment

### Lovable Platform

Jadoo is optimized for deployment on Lovable:

1. Connect your GitHub repository
2. Set environment variables in Lovable dashboard
3. Deploy with automatic builds
4. Configure custom domains

### Environment Configuration

Ensure all environment variables are set in production:
- Supabase credentials
- Redis connection
- JWT secrets
- Frontend environment variables

## 📊 Monitoring

- **Application Logs**: View in Lovable dashboard
- **Database Monitoring**: Supabase dashboard
- **Queue Monitoring**: Redis monitoring tools
- **Performance**: Built-in analytics dashboard

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the documentation in `/docs`
- Review the architecture guide
- Contact the development team

---

**Jadoo** - Transform your product feeds with AI-powered precision.
