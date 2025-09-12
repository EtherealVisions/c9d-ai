# C9D AI Platform

A modern, scalable AI platform built with Next.js, featuring secure environment management, monorepo architecture, and optimized deployment workflows.

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)
[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js-black?style=for-the-badge&logo=next.js)](https://nextjs.org)

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.17.0 or higher
- **pnpm** 8.0.0 or higher
- **Git** for version control

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd c9d-ai

# Install dependencies
pnpm install

# Copy environment template
cp .env.local.example .env.local

# Configure environment variables (see docs/environment-setup.md)
# Edit .env.local with your database, authentication, and service credentials

# Start development server
pnpm dev

# Open in browser
open http://localhost:3000
```

## 📁 Project Structure

```
c9d-ai/
├── apps/
│   └── web/                 # Next.js web application
├── packages/
│   ├── ui/                  # Shared UI components
│   ├── config/              # Shared configuration
│   └── types/               # Shared TypeScript types
├── docs/                    # Documentation
├── scripts/                 # Build and utility scripts
├── supabase/               # Database migrations
└── .env.local.example      # Environment template
```

## 🛠️ Development

### Available Scripts

```bash
# Development
pnpm dev                    # Start all development servers
pnpm dev --filter=@c9d/web  # Start specific package

# Building
pnpm build                  # Build all packages
pnpm build:packages         # Build shared packages only

# Testing
pnpm test                   # Run tests in watch mode
pnpm test:run              # Run tests once
pnpm test:phase            # Test Phase.dev integration

# Utilities
pnpm typecheck             # Type checking
pnpm lint                  # Code linting
pnpm clean                 # Clean build outputs
```

### Technology Stack

- **Framework**: Next.js 15 with App Router
- **Package Manager**: pnpm with workspaces
- **Build System**: Turbo for monorepo orchestration
- **Database**: PostgreSQL with Supabase
- **Authentication**: Clerk
- **Environment Management**: Phase.dev with local fallback
- **Deployment**: Vercel with optimized build process
- **Styling**: Tailwind CSS with shadcn/ui components
- **Testing**: Vitest with React Testing Library

## 📚 Documentation

### Setup Guides
- [**Development Setup**](docs/development-setup.md) - Complete guide for local development
- [**Environment Setup**](docs/environment-setup.md) - Environment variables and Phase.dev configuration
- [**Authentication Setup**](docs/authentication-setup.md) - Clerk authentication configuration

### Deployment
- [**Vercel Deployment**](docs/vercel-deployment.md) - Production deployment guide
- [**Troubleshooting**](docs/troubleshooting.md) - Common issues and solutions

### Architecture
- [**Monorepo Structure**](docs/development-setup.md#project-structure) - Package organization and dependencies
- [**Build System**](docs/development-setup.md#build-orchestration-turbo) - Turbo configuration and workflows

## 🔧 Configuration

### Environment Variables

The application uses a hybrid approach for environment management:

1. **Phase.dev** (Recommended): Secure, centralized configuration
2. **Local .env files**: Development and fallback
3. **Platform variables**: Direct deployment configuration

Key variables:
- `PHASE_SERVICE_TOKEN` - Phase.dev service token
- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk authentication
- `CLERK_SECRET_KEY` - Clerk server-side key

See [Environment Setup Guide](docs/environment-setup.md) for complete configuration details.

### Package Management

This project uses **pnpm** for efficient dependency management:

- **Faster installs**: Up to 2x faster than npm/yarn
- **Disk efficient**: Shared dependency storage
- **Strict resolution**: Prevents phantom dependencies
- **Monorepo support**: Built-in workspace management

### Build System

**Turbo** orchestrates builds across the monorepo:

- **Incremental builds**: Only rebuilds changed packages
- **Parallel execution**: Runs tasks simultaneously
- **Intelligent caching**: Caches outputs and test results
- **Task dependencies**: Ensures correct build order

## 🚀 Deployment

### Vercel (Recommended)

The application is optimized for Vercel deployment:

1. **Connect repository** to Vercel
2. **Set environment variables** in Vercel dashboard:
   - `PHASE_SERVICE_TOKEN` (required)
   - Other variables as needed
3. **Deploy** - Vercel automatically uses optimized build process

### Other Platforms

For other deployment platforms:

1. Set `PHASE_SERVICE_TOKEN` environment variable
2. Use build command: `pnpm build`
3. Serve the `apps/web/.next` directory

See [Vercel Deployment Guide](docs/vercel-deployment.md) for detailed instructions.

## 🧪 Testing

```bash
# Run all tests
pnpm test:run

# Watch mode
pnpm test

# Specific package
pnpm test --filter=@c9d/web

# With coverage
pnpm test:run --coverage

# Integration tests
pnpm test:phase
```

## 🔍 Troubleshooting

Common issues and solutions:

- **Environment variables not loading**: Check `.env.local` format and location
- **pnpm command not found**: Install with `npm install -g pnpm`
- **Build failures**: Clear cache with `rm -rf .turbo/cache && pnpm build`
- **Database connection**: Verify `DATABASE_URL` format and credentials
- **Authentication issues**: Check Clerk keys and configuration

See [Troubleshooting Guide](docs/troubleshooting.md) for comprehensive solutions.

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/new-feature`
3. **Make** your changes
4. **Test** your changes: `pnpm test:run && pnpm build`
5. **Commit** your changes: `git commit -m 'feat: add new feature'`
6. **Push** to the branch: `git push origin feature/new-feature`
7. **Submit** a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the [docs/](docs/) directory
- **Issues**: Create an issue on GitHub
- **Discussions**: Use GitHub Discussions for questions

---

Built with ❤️ using modern web technologies and best practices.
