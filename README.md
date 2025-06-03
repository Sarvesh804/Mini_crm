# CRM Application

A modern Customer Relationship Management (CRM) application built with Next.js, featuring authentication, dashboard analytics, campaign management, and customer data management.

## 🚀 Features

- **Authentication System** - Secure user authentication with NextAuth.js
- **Dashboard Analytics** - Comprehensive dashboard with data visualization
- **Campaign Management** - Create, manage, and track marketing campaigns
- **Customer Management** - Complete customer data management system
- **Modern UI** - Built with Tailwind CSS and shadcn/ui components
- **Charts & Analytics** - Data visualization with Recharts and Victory
- **Database Integration** - Prisma ORM for database management
- **Redis Support** - Caching and session management
- **Type Safety** - Full TypeScript support

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Modern UI component library
- **Recharts** - Chart library for data visualization
- **Victory** - Additional charting components

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Prisma** - Type-safe database ORM
- **NextAuth.js** - Authentication library
- **JOSE** - JSON Web Token utilities

### Database & Caching
- **Prisma** - Database ORM and migrations
- **Redis** - Caching and session storage

### Development Tools
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **TypeScript** - Static type checking

## 📋 Prerequisites

Before running this project, make sure you have:

- **Node.js** (version 18 or higher)
- **npm**, **yarn**, **pnpm**, or **bun** package manager
- **Database** (PostgreSQL, MySQL, or SQLite)
- **Redis** (for caching and sessions)
- **Git** for version control

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd crm_app
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

### 3. Environment Setup

Create a `.env` file in the root directory and configure the following variables:

```env
# Database
DATABASE_URL="your-database-connection-string"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret"

# Redis (optional)
REDIS_URL="your-redis-connection-string"

# OAuth Providers (if using)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Other environment variables as needed
```

### 4. Database Setup

Run Prisma migrations to set up your database:

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# (Optional) Seed the database
npx prisma db seed
```

### 5. Start the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## 📁 Project Structure

```
crm_app/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── campaigns/            # Campaign management API
│   │   ├── customer/             # Customer management API
│   │   └── dashboard/            # Dashboard API
│   ├── auth/                     # Authentication pages
│   ├── dashboard/                # Dashboard pages
│   ├── favicon.ico
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
├── components/                   # Reusable UI components
│   ├── icons.tsx                 # Icon components
│   ├── signInForm.tsx           # Sign-in form component
│   └── ui/                       # shadcn/ui components
├── lib/                          # Utility libraries
├── prisma/                       # Database schema and migrations
├── public/                       # Static assets
├── services/                     # Business logic services
├── test-scripts/                 # Testing scripts
├── types/                        # TypeScript type definitions
├── .env                          # Environment variables
├── .gitignore                    # Git ignore rules
├── components.json               # shadcn/ui configuration
├── eslint.config.mjs            # ESLint configuration
├── next.config.ts               # Next.js configuration
├── package.json                 # Dependencies and scripts
├── postcss.config.mjs           # PostCSS configuration
├── README.md                    # Project documentation
└── tsconfig.json                # TypeScript configuration
```

## 🔧 Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run db:push      # Push schema changes to database
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed database with initial data

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript type checking

# Testing
npm run test         # Run tests (if configured)
```

## 🔐 Authentication

This application uses NextAuth.js for authentication. Supported authentication methods:

- **Email/Password** - Traditional login
- **OAuth Providers** - Google, GitHub, etc. (configurable)
- **Magic Links** - Passwordless authentication (if configured)

Configure authentication providers in the [app/api/auth/[...nextauth]/route.ts](app/api/auth/[...nextauth]/route.ts) file.

## 📊 Dashboard Features

The dashboard includes:

- **Analytics Overview** - Key metrics and KPIs
- **Campaign Performance** - Campaign analytics and insights
- **Customer Insights** - Customer behavior and demographics
- **Interactive Charts** - Built with Recharts and Victory
- **Real-time Data** - Live updates and notifications

## 🎯 Campaign Management

Features include:

- **Campaign Creation** - Create and configure marketing campaigns
- **Performance Tracking** - Monitor campaign metrics
- **A/B Testing** - Test different campaign variations
- **Audience Targeting** - Segment and target specific customer groups

## 👥 Customer Management

Comprehensive customer management:

- **Customer Profiles** - Detailed customer information
- **Interaction History** - Track customer interactions
- **Segmentation** - Group customers by various criteria
- **Communication Tools** - Manage customer communications

## 🔧 Configuration

### Database Configuration

Configure your database connection in the `.env` file and update the Prisma schema in `prisma/schema.prisma` as needed.

### UI Customization

Customize the UI components using the shadcn/ui configuration in `components.json` and global styles in `app/globals.css`.

### API Endpoints

API routes are located in the `app/api/` directory:

- `/api/auth/*` - Authentication endpoints
- `/api/campaigns` - Campaign management
- `/api/customer` - Customer management
- `/api/dashboard` - Dashboard data

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to a Git repository
2. Connect your repository to [Vercel](https://vercel.com)
3. Configure environment variables in Vercel dashboard
4. Deploy automatically

### Other Platforms

The application can be deployed to any platform that supports Node.js:

- **Railway** - Simple deployment with built-in database
- **Heroku** - Traditional PaaS deployment
- **AWS/GCP/Azure** - Cloud platform deployment
- **Docker** - Containerized deployment

### Build for Production

```bash
npm run build
npm run start
```

## 🔒 Security

- **Environment Variables** - Sensitive data is stored in environment variables
- **Authentication** - Secure authentication with NextAuth.js
- **CSRF Protection** - Built-in CSRF protection
- **SQL Injection Prevention** - Prisma ORM prevents SQL injection
- **XSS Protection** - React's built-in XSS protection

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 Development Guidelines

- **Code Style** - Follow ESLint configuration
- **TypeScript** - Use TypeScript for all new code
- **Components** - Create reusable components in the `components/` directory
- **API Routes** - Follow RESTful conventions for API endpoints
- **Database** - Use Prisma migrations for database changes

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Verify `DATABASE_URL` in `.env`
   - Ensure database is running
   - Run `npx prisma generate`

2. **Authentication Issues**
   - Check `NEXTAUTH_SECRET` and `NEXTAUTH_URL`
   - Verify OAuth provider configuration

3. **Build Issues**
   - Clear `.next` directory
   - Reinstall dependencies
   - Check TypeScript errors

4. **Redis Connection Issues**
   - Verify `REDIS_URL` configuration
   - Ensure Redis server is running

---

## 🙏 Acknowledgments

- **Next.js** - The React framework
- **Prisma** - Database toolkit
- **shadcn/ui** - UI component library
- **Tailwind CSS** - CSS framework
- **NextAuth.js** - Authentication library

