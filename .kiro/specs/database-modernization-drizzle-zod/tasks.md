# Implementation Plan

- [x] 1. Install and configure Drizzle ORM dependencies
  - Add drizzle-orm, drizzle-kit, and database driver packages to apps/web
  - Install Zod and drizzle-zod integration packages
  - Configure drizzle.config.ts with database connection and schema paths
  - Set up TypeScript configuration for Drizzle type generation
  - _Requirements: 1.1, 1.2_

- [x] 2. Create Drizzle schema definitions for existing database tables
  - [x] 2.1 Define core entity schemas (users, organizations, roles, permissions)
    - Create lib/db/schema/users.ts with complete user table schema
    - Create lib/db/schema/organizations.ts with organization and membership schemas
    - Create lib/db/schema/roles.ts with roles and permissions schemas
    - Define proper relationships between entities using Drizzle relations
    - _Requirements: 1.1, 1.4_

  - [x] 2.2 Define content and onboarding schemas
    - Create lib/db/schema/content.ts for onboarding content tables
    - Create lib/db/schema/invitations.ts for invitation management
    - Create lib/db/schema/audit.ts for audit logging tables
    - Ensure all existing database tables are represented in Drizzle schemas
    - _Requirements: 1.1, 1.4_

  - [x] 2.3 Set up schema exports and type generation
    - Create lib/db/schema/index.ts to export all schemas
    - Configure Drizzle Kit for automatic type generation
    - Generate initial TypeScript types from database schemas
    - Verify generated types match existing database structure
    - _Requirements: 1.4, 1.5_

- [x] 3. Integrate drizzle-zod for automatic schema generation
  - [x] 3.1 Update validation schemas to use drizzle-zod
    - Replace manual Zod schemas with createInsertSchema and createSelectSchema
    - Update lib/validation/schemas/users.ts to use drizzle-zod integration
    - Update lib/validation/schemas/organizations.ts with auto-generated schemas
    - Update lib/validation/schemas/roles.ts with drizzle-zod patterns
    - _Requirements: 2.1, 2.2, 3.1_

  - [x] 3.2 Extend auto-generated schemas with business rules
    - Use .extend() and .omit() to customize drizzle-zod schemas
    - Add custom validation rules for email format, length limits, and business logic
    - Create API request/response schemas with proper transformations
    - Implement schema composition for nested and related data validation
    - _Requirements: 2.1, 2.4, 3.1_

  - [x] 3.3 Create validation utilities and error handling
    - Create lib/validation/utils.ts with validation helper functions
    - Implement structured error handling for Zod validation failures
    - Create type-safe error response schemas for API endpoints
    - Add validation middleware for API routes with proper error formatting
    - _Requirements: 2.2, 4.1, 4.2_

- [x] 4. Implement database connection and configuration
  - [x] 4.1 Create Drizzle database connection setup
    - Create lib/db/connection.ts with Drizzle database client configuration
    - Implement connection pooling and environment-specific settings
    - Add database health check and connection monitoring utilities
    - Ensure compatibility with existing Supabase PostgreSQL setup
    - _Requirements: 1.1, 6.1_

  - [x] 4.2 Create database migration system
    - Set up Drizzle Kit migration configuration and scripts
    - Create initial migration from current database state
    - Implement migration utilities for development and production
    - Add migration rollback and validation capabilities
    - _Requirements: 5.1, 5.5_

  - [x] 4.3 Implement query logging and performance monitoring
    - Add query logging with configurable log levels
    - Implement query performance metrics collection
    - Create database operation monitoring and alerting
    - Add query analysis and optimization recommendations
    - _Requirements: 4.3, 6.4, 6.5_

- [x] 5. Create repository layer with Drizzle integration
  - [x] 5.1 Implement base repository pattern
    - Create lib/repositories/base-repository.ts with generic CRUD operations
    - Implement type-safe query builders and filters
    - Add transaction support and error handling
    - Create repository interface definitions for all entities
    - _Requirements: 1.1, 1.3, 4.1_

  - [x] 5.2 Implement core entity repositories
    - Create UserRepository with all user-related database operations
    - Create OrganizationRepository with organization and membership operations
    - Create RoleRepository with role and permission management
    - Implement complex queries with proper joins and relations
    - _Requirements: 1.1, 1.3, 3.3_

  - [x] 5.3 Add repository caching and optimization
    - Implement query result caching with Redis integration
    - Add cache invalidation strategies for data consistency
    - Create optimized queries for common operations
    - Implement batch operations and bulk data handling
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 6. Migrate service layer to use Drizzle repositories and Zod validation
  - [x] 6.1 Update user management services
    - Migrate UserService to use UserRepository and Zod validation
    - Update user creation, update, and deletion operations
    - Implement proper error handling with structured error responses
    - Add comprehensive input validation for all user operations
    - _Requirements: 2.1, 3.1, 4.1, 4.2_

  - [x] 6.2 Update organization management services
    - Migrate OrganizationService to use new repository and validation layer
    - Update membership management with proper validation
    - Implement role-based access control with Zod schema validation
    - Add audit logging for all organization operations
    - _Requirements: 2.1, 3.1, 4.1, 4.2_

  - [x] 6.3 Update content creation services
    - Migrate ContentCreationService to use Drizzle repositories
    - Add comprehensive validation for content templates and builders
    - Implement type-safe content validation and transformation
    - Update interactive element validation with Zod schemas
    - _Requirements: 2.1, 2.4, 3.1, 4.1_

- [x] 7. Update API routes to use new validation and database layer
  - [x] 7.1 Migrate authentication and user API routes
    - Update /api/auth/* routes to use Zod validation schemas
    - Implement proper error handling with structured responses
    - Add request/response validation middleware
    - Ensure backward compatibility with existing API contracts
    - _Requirements: 2.1, 2.2, 4.1, 5.2_

  - [x] 7.2 Migrate organization and membership API routes
    - Update /api/organizations/* routes with new validation layer
    - Implement proper authorization checks with Zod schemas
    - Add comprehensive error handling and logging
    - Update API documentation with new schema definitions
    - _Requirements: 2.1, 2.2, 4.1, 5.2_

  - [x] 7.3 Update content management API routes
    - Migrate content creation and management endpoints
    - Add validation for complex content structures and templates
    - Implement proper file upload and media handling validation
    - Update webhook handlers with new validation schemas
    - _Requirements: 2.1, 2.4, 4.1, 5.2_

- [x] 8. Create comprehensive testing infrastructure
  - [x] 8.1 Set up Drizzle testing utilities
    - Create test database setup and teardown utilities
    - Implement database seeding and fixture management
    - Add transaction-based test isolation
    - Create mock repository implementations for unit testing
    - _Requirements: 7.1, 7.3_

  - [x] 8.2 Create Zod validation testing framework
    - Write comprehensive tests for all validation schemas
    - Test error handling and validation error formatting
    - Create test utilities for schema composition and transformation
    - Add performance tests for validation operations
    - _Requirements: 7.2, 7.4_

  - [x] 8.3 Implement integration tests for new database layer
    - Create end-to-end tests for repository operations
    - Test service layer integration with validation and database
    - Add API integration tests with proper validation testing
    - Implement performance and load testing for database operations
    - _Requirements: 7.3, 7.5_

- [x] 9. Remove legacy Supabase client code
  - [x] 9.1 Remove legacy services using Supabase client
    - Remove createSupabaseClient usage from remaining services
    - Update content-manager-service.ts to use repository pattern
    - Update organizational-customization-service.ts to use Drizzle
    - Update session-management-service.ts to use new database layer
    - _Requirements: 5.4_

  - [x] 9.2 Remove legacy database utilities and dependencies
    - Remove lib/database/index.ts and lib/database.ts files
    - Clean up createSupabaseClient function and related utilities
    - Remove unused Supabase client imports and references
    - Update import statements throughout codebase
    - _Requirements: 5.4_

  - [x] 9.3 Update remaining middleware and utilities
    - Update lib/middleware/rbac.ts to use repository layer
    - Remove Supabase client usage from auth-router-service.ts
    - Update any remaining utilities using legacy database patterns
    - Ensure all database operations use Drizzle repositories
    - _Requirements: 5.4_

- [x] 10. Update tests to use new database layer
  - [x] 10.1 Update service tests to mock Drizzle instead of Supabase
    - Update organizational-customization-service.test.ts to mock Drizzle database
    - Update content-manager-service.test.ts to use repository mocks
    - Update session-management-service tests to use new patterns
    - Update auth-router-service tests to mock repository factory
    - Update rbac-service tests to use repository pattern
    - _Requirements: 5.4_

  - [x] 10.2 Update API route tests to use repository mocks
    - Update admin analytics API tests to mock Drizzle database
    - Update organization membership API tests to use repository mocks
    - Update user search API tests to use repository pattern
    - Ensure all API tests use consistent mocking patterns
    - _Requirements: 5.4_

  - [x] 10.3 Update integration tests for new database layer
    - Update database integration tests to use Drizzle queries
    - Update service integration tests to use repository pattern
    - Ensure test database setup works with Drizzle
    - Update test utilities and helpers for new patterns
    - _Requirements: 5.4_

  - [x] 10.4 Validate all tests pass with new database layer
    - Run comprehensive test suite to ensure 100% pass rate
    - Fix any remaining test failures from database migration
    - Update test documentation and patterns
    - Ensure coverage thresholds are maintained
    - _Requirements: 5.4_

- [ ] 10. Performance optimization and monitoring
  - [ ] 10.1 Implement query optimization strategies
    - Analyze and optimize common database queries
    - Implement proper indexing strategies for new query patterns
    - Add query performance monitoring and alerting
    - Create query optimization recommendations and tooling
    - _Requirements: 6.1, 6.4, 6.5_

  - [ ] 10.2 Add caching and performance enhancements
    - Implement Redis-based query result caching
    - Add cache warming strategies for frequently accessed data
    - Implement cache invalidation patterns for data consistency
    - Add performance metrics collection and monitoring
    - _Requirements: 6.2, 6.3, 6.4_

  - [ ] 10.3 Create monitoring and observability tools
    - Add database operation metrics and logging
    - Implement error tracking and alerting for database operations
    - Create performance dashboards for query analysis
    - Add automated performance regression detection
    - _Requirements: 6.4, 6.5_

- [ ] 11. Documentation and team enablement
  - [ ] 11.1 Create comprehensive development documentation
    - Write guides for using Drizzle ORM in the project
    - Create Zod validation best practices and examples
    - Document repository patterns and service layer architecture
    - Add troubleshooting guides for common issues
    - _Requirements: 5.5_

  - [ ] 11.2 Create deployment and schema management guides
    - Document database schema management with Drizzle Kit
    - Create migration procedures and best practices
    - Add performance tuning and optimization guides
    - Document monitoring and observability setup
    - _Requirements: 5.5_

  - [ ] 11.3 Conduct team training and knowledge transfer
    - Create training materials for Drizzle and Zod usage
    - Conduct workshops on new development patterns
    - Create code review guidelines for new database layer
    - Establish ongoing support and knowledge sharing processes
    - _Requirements: 5.5_