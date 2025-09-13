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
pnpm test                   # Run tests once (default behavior)
pnpm test:run              # Run tests once (explicit)
pnpm test:dev              # Run tests in watch mode (development)
pnpm test:watch            # Alternative watch mode command

# Quality Validation
pnpm validate:quick         # Quick validation (typecheck + lint)
pnpm validate:full          # Full validation (typecheck + lint + test:coverage + build)
pnpm validate:coverage      # Coverage validation (test:coverage + coverage report)
pnpm validate:task-completion # Complete task validation with quality gates

# Code Quality
pnpm typecheck             # Type checking
pnpm lint                  # Code linting
pnpm format                # Format code with Prettier
pnpm format:check          # Check code formatting

# Coverage Reporting
pnpm coverage:report       # Generate detailed coverage analysis
pnpm coverage:open         # Open HTML coverage report
pnpm coverage:json         # Generate JSON coverage report
pnpm coverage:lcov         # Generate LCOV coverage report

# Utilities
pnpm clean                 # Clean build outputs
```

### Technology Stack

- **Framework**: Next.js 15 with App Router
- **Package Manager**: pnpm with workspaces
- **Build System**: Turbo for monorepo orchestration
- **Database**: PostgreSQL with Supabase
- **Authentication**: Clerk with enhanced organization management
- **Analytics**: Multi-provider analytics with A/B testing and conversion tracking
- **Environment Management**: Phase.dev with local fallback
- **Deployment**: Vercel with optimized build process
- **Styling**: Tailwind CSS with shadcn/ui components
- **Design System**: Comprehensive design tokens and brand guidelines
- **Testing**: Vitest with React Testing Library

## 📚 Documentation

### Setup Guides
- [**Development Setup**](docs/development-setup.md) - Complete guide for local development
- [**Environment Setup**](docs/environment-setup.md) - Environment variables and Phase.dev configuration
- [**Authentication Setup**](docs/authentication-setup.md) - Clerk authentication configuration
- [**Authentication Context**](docs/authentication-context.md) - Enhanced auth context with organization management
- [**Authentication API**](docs/api/authentication.md) - Complete API reference for authentication endpoints
- [**Organization Management**](docs/organization-management.md) - Multi-organization support and member management

### Feature Documentation
- [**Account Settings Status**](docs/features/account-settings-status.md) - Current status and planned improvements for account management
- [**Analytics System**](docs/analytics/README.md) - Comprehensive analytics, A/B testing, and conversion tracking
  - [Analytics Quick Reference](docs/analytics/quick-reference.md) - Essential commands and patterns
  - [Analytics API Types](docs/analytics/api/types.md) - Complete TypeScript type definitions
  - [Basic Setup Examples](docs/analytics/examples/basic-setup.md) - Implementation examples

### Design System
- [**Getting Started**](docs/design-system/getting-started.md) - Quick start guide for the design system
- [**Design System Overview**](docs/design-system/README.md) - Comprehensive design system documentation
- [**Design Tokens**](docs/design-system/design-tokens.md) - Colors, typography, spacing, and animation tokens
- [**Component Library**](docs/design-system/component-library.md) - Reusable UI components and patterns
- [**Accessibility Guidelines**](docs/design-system/accessibility.md) - WCAG compliance and inclusive design
- [**Brand Guidelines**](docs/design-system/brand-guidelines.md) - Brand identity and visual guidelines

### Deployment
- [**Vercel Deployment**](docs/vercel-deployment.md) - Production deployment guide
- [**Configuration Updates**](docs/configuration-updates.md) - Recent configuration changes and updates
- [**Troubleshooting**](docs/troubleshooting.md) - Common issues and solutions

### Architecture
- [**Monorepo Structure**](docs/development-setup.md#project-structure) - Package organization and dependencies
- [**Build System**](docs/development-setup.md#build-orchestration-turbo) - Turbo configuration and workflows
- [**Data Layer**](docs/data-layer.md) - Models, transformers, and database interaction patterns
- [**Design System**](docs/design-system/README.md) - Design tokens, components, and brand guidelines
- [**Hero Section API**](docs/design-system/hero-section-api.md) - Comprehensive hero section component documentation

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

## 🧪 Testing & Quality Assurance

The project follows comprehensive testing standards with unit, integration, and E2E tests. All tests are designed for isolation and parallel execution with advanced coverage tracking and quality gates.

**Note**: The project is currently in active development. Some TypeScript compilation errors exist and are being resolved as part of ongoing development work. The analytics type system has been added and documented, but integration with existing services is in progress.

### Test Execution Commands

```bash
# Run all tests once (default behavior)
pnpm test

# Run tests once (explicit)
pnpm test:run

# Watch mode for development (explicit)
pnpm test:dev

# Alternative watch mode command
pnpm test:watch

# Specific package tests (run once)
pnpm test --filter=@c9d/web

# Run with coverage reporting
pnpm test:coverage

# Unit tests only
pnpm test:unit

# Integration tests
pnpm test:integration

# E2E tests
pnpm test:e2e

# Performance tests
pnpm test:performance
```

### Quality Validation Commands

```bash
# Quick validation (typecheck + lint)
pnpm validate:quick

# Full validation (typecheck + lint + test:coverage + build)
pnpm validate:full

# Coverage validation with detailed reporting
pnpm validate:coverage

# Complete task validation with all quality gates
pnpm validate:task-completion
```

### Coverage Analysis Commands

```bash
# Generate detailed coverage analysis and recommendations
pnpm coverage:report

# Open interactive HTML coverage report
pnpm coverage:open

# Generate machine-readable coverage formats
pnpm coverage:json         # JSON format
pnpm coverage:lcov         # LCOV format for CI/CD
```

### Test Standards & Coverage Requirements

- **100% Test Success Rate**: All tests must pass without skips or failures
- **Tiered Coverage Requirements**: Module-specific coverage thresholds based on criticality
  - **Global Minimum**: 85% (branches, functions, lines, statements)
  - **Services (`lib/services/**`)**: 100% coverage required (critical business logic)
  - **Models (`lib/models/**`)**: 95% coverage required (data layer)
  - **API Routes (`app/api/**`)**: 90% coverage required (external interfaces)
- **Test Isolation**: Each test runs independently with proper cleanup
- **Performance Aware**: Tests execute efficiently with parallel execution (max 4 threads)
- **Comprehensive Reporting**: Multiple coverage formats (HTML, JSON, LCOV, console)

### Coverage Reports

Coverage reports are generated in multiple formats:
- **Interactive HTML**: `./coverage/index.html` - Line-by-line coverage visualization
- **JSON Summary**: `./coverage/coverage-summary.json` - Quick statistics
- **LCOV**: `./coverage/lcov.info` - CI/CD integration format
- **Test Results**: `./test-results/` - Detailed test execution reports

**Documentation:**
- [Quality Validation System](docs/quality-validation-system.md) - **NEW**: Comprehensive quality validation and task completion system
- [Test Commands Quick Reference](docs/testing/quick-reference.md) - Essential commands and workflows
- [Test Commands Reference](docs/testing/test-commands.md) - Complete command documentation
- [Coverage Integration Guide](docs/testing/coverage-integration-guide.md) - Coverage requirements and enforcement
- [Coverage Configuration](docs/testing/coverage-configuration.md) - Detailed coverage setup and thresholds
- [Testing Standards](docs/testing/comprehensive-test-guide.md) - Detailed guidelines and best practices
- [Analytics Testing Guide](docs/testing/analytics-testing-guide.md) - Analytics-specific testing strategies

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
