# Implementation Plan

- [x] 1. Install Phase.dev Node.js SDK and setup dependencies
  - Add @phase-dev/node package to the project
  - Update TypeScript configuration for SDK types
  - Verify SDK installation and basic import functionality
  - _Requirements: 1.1, 7.3_

- [x] 2. Implement PHASE_SERVICE_TOKEN loading from multiple sources
  - Create PhaseTokenLoader class to check process.env, local .env files, and root .env files
  - Implement precedence order: process.env > local .env.local > local .env > root .env.local > root .env
  - Add workspace root detection for monorepo support
  - Write unit tests for token loading from different sources
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 3. Create Phase.dev SDK client wrapper with token-aware authentication
  - Implement PhaseSDKClient class that uses PhaseTokenLoader for authentication
  - Add service token validation and authentication logic
  - Create connection testing functionality
  - Track token source for better error messages
  - Write unit tests for SDK client initialization with various token sources
  - _Requirements: 1.1, 3.1, 5.1_

- [x] 4. Implement secret retrieval using Phase.dev SDK
  - Replace custom fetch API calls with SDK methods
  - Add proper error handling for SDK-specific error types
  - Implement secret caching with SDK-compatible TTL
  - Include token source information in results for debugging
  - Create unit tests for secret retrieval functionality
  - _Requirements: 1.2, 3.2, 5.2_

- [x] 5. Create comprehensive error handling system with token source awareness
  - Implement PhaseErrorHandler with SDK error code mapping
  - Add specific error messages for authentication, app not found, and network issues
  - Include token source information in error messages for better debugging
  - Add special handling for TOKEN_NOT_FOUND error when no token is found in any source
  - Create fallback mechanisms for each error type
  - Write unit tests for error handling scenarios with different token sources
  - _Requirements: 1.3, 1.4, 4.1, 4.2, 4.3, 2.5_

- [x] 6. Implement environment fallback manager with token source tracking
  - Create EnvironmentFallbackManager for graceful degradation
  - Add logic to merge Phase.dev secrets with local environment variables
  - Implement local-only environment loading as fallback
  - Log token source information for debugging
  - Write integration tests for fallback scenarios with various token configurations
  - _Requirements: 1.5, 1.6, 4.4, 4.5_

- [x] 7. Add TypeScript type definitions and interfaces
  - Create comprehensive TypeScript interfaces for SDK integration and token loading
  - Add proper error typing for Phase.dev SDK errors including TOKEN_NOT_FOUND
  - Implement typed configuration objects with validation
  - Add TokenSource interface for tracking token origins
  - Update existing interfaces to support SDK source tracking
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 8. Implement caching and performance optimizations
  - Phase.dev SDK handles internal caching automatically
  - Connection pooling and retry logic implemented in PhaseSDKClient
  - Performance monitoring implemented via PhaseMonitoring class
  - Performance tests written and validated
  - _Requirements: 3.3, 3.4_

- [x] 9. Add comprehensive logging and monitoring with token source tracking
  - Implement secure logging that redacts sensitive information but shows token sources
  - Add performance metrics tracking for SDK operations
  - Create monitoring for error rates and fallback usage
  - Add detailed configuration diagnostics showing token loading process
  - Log token source information for debugging without exposing token values
  - _Requirements: 4.5, 6.2_

- [x] 10. Write integration tests with real Phase.dev SDK and token loading
  - Create integration tests that use actual Phase.dev service
  - Test authentication with valid and invalid service tokens from different sources
  - Test token loading precedence order with multiple .env files
  - Test secret retrieval for existing and non-existent apps
  - Verify fallback behavior when Phase.dev is unavailable
  - Test scenarios where no PHASE_SERVICE_TOKEN is found anywhere
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 11. Update application startup and configuration loading
  - Modify app/layout.tsx to use new SDK-based configuration with token loading
  - Update environment configuration initialization to show token source
  - Add proper error display for configuration issues including token not found
  - Test application startup with various Phase.dev and token scenarios
  - _Requirements: 1.5, 1.6, 4.5_

- [x] 12. Remove legacy custom API integration code
  - Remove legacy PhaseEnvironmentLoader class from apps/web/lib/config/phase.ts
  - Remove getPhaseServiceTokenInternal function from packages/config/src/phase.ts (replaced by PhaseTokenLoader)
  - Clean up console.phase.dev API endpoint references in apps/web/lib/config/
  - Update apps/web to use packages/config Phase.dev integration instead of local implementation
  - Remove unused imports and dependencies from legacy implementation
  - Update documentation to reflect SDK usage and token loading
  - Verify no breaking changes to existing functionality
  - _Requirements: 7.4, 7.5_

- [x] 13. Add development setup automation and documentation
  - Create setup scripts that verify Phase.dev SDK configuration and token loading
  - Add troubleshooting documentation for common SDK and token issues
  - Document token loading precedence and where to place PHASE_SERVICE_TOKEN
  - Update development environment setup guide with token configuration
  - Create configuration validation tools for team onboarding
  - Update existing Phase.dev documentation to reflect SDK migration
  - _Requirements: 6.1, 6.3, 6.4, 6.5_

- [x] 14. Migrate apps/web to use packages/config Phase.dev integration
  - Update apps/web/lib/config/init.ts to use @c9d/config Phase.dev integration
  - Remove local Phase.dev implementation from apps/web/lib/config/phase.ts
  - Update all imports in apps/web to use @c9d/config instead of local phase.ts
  - Ensure environment variable loading works consistently across the application
  - Update tests to use the new SDK-based integration
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 15. Create comprehensive Phase.dev SDK cache implementation
  - Implement PhaseSDKCache class with TTL-based expiration as designed (in-memory only, no disk persistence)
  - Add cache invalidation patterns for different scenarios
  - Implement secure memory management to clear secrets when cache expires
  - Add cache metrics and monitoring for performance optimization (without exposing secret values)
  - Write comprehensive tests for caching behavior and security
  - Ensure cache is cleared on application shutdown for security
  - _Requirements: 3.3, 3.4_
