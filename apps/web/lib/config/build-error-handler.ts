/**
 * Build and deployment error handling utilities
 */

/**
 * Build error types
 */
export enum BuildErrorType {
  DEPENDENCY_RESOLUTION = 'DEPENDENCY_RESOLUTION',
  COMPILATION = 'COMPILATION',
  TYPE_CHECK = 'TYPE_CHECK',
  LINT = 'LINT',
  TEST = 'TEST',
  ENVIRONMENT = 'ENVIRONMENT',
  PHASE_INTEGRATION = 'PHASE_INTEGRATION',
  TURBO_CACHE = 'TURBO_CACHE',
  OUTPUT_VALIDATION = 'OUTPUT_VALIDATION',
  DEPLOYMENT = 'DEPLOYMENT',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Build error severity levels
 */
export enum BuildErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Custom error class for build operations
 */
export class BuildError extends Error {
  public readonly type: BuildErrorType;
  public readonly severity: BuildErrorSeverity;
  public readonly recoverable: boolean;
  public readonly timestamp: Date;
  public readonly context: Record<string, any>;
  public readonly suggestions: string[];

  constructor(
    message: string,
    type: BuildErrorType,
    severity: BuildErrorSeverity = BuildErrorSeverity.MEDIUM,
    recoverable: boolean = false,
    context: Record<string, any> = {},
    suggestions: string[] = []
  ) {
    super(message);
    this.name = 'BuildError';
    this.type = type;
    this.severity = severity;
    this.recoverable = recoverable;
    this.timestamp = new Date();
    this.context = context;
    this.suggestions = suggestions;
  }
}

/**
 * Build diagnostic information
 */
export interface BuildDiagnostics {
  nodeVersion: string;
  pnpmVersion?: string;
  turboVersion?: string;
  workingDirectory: string;
  environment: string;
  phaseConfigured: boolean;
  memoryUsage: NodeJS.MemoryUsage;
  buildStartTime: Date;
  buildDuration?: number;
  errors: BuildError[];
  warnings: string[];
}

/**
 * Build error handler class
 */
export class BuildErrorHandler {
  private diagnostics: BuildDiagnostics;
  private buildStartTime: Date;

  constructor() {
    this.buildStartTime = new Date();
    this.diagnostics = {
      nodeVersion: process.version,
      workingDirectory: process.cwd(),
      environment: process.env.NODE_ENV || 'unknown',
      phaseConfigured: !!process.env.PHASE_SERVICE_TOKEN,
      memoryUsage: process.memoryUsage(),
      buildStartTime: this.buildStartTime,
      errors: [],
      warnings: []
    };

    this.detectVersions();
  }

  /**
   * Detect tool versions
   */
  private async detectVersions(): Promise<void> {
    try {
      const { execSync } = require('child_process');
      
      try {
        this.diagnostics.pnpmVersion = execSync('pnpm --version', { encoding: 'utf8' }).trim();
      } catch {
        // pnpm not available
      }

      try {
        this.diagnostics.turboVersion = execSync('turbo --version', { encoding: 'utf8' }).trim();
      } catch {
        // turbo not available
      }
    } catch (error) {
      // Version detection failed
    }
  }

  /**
   * Handle and classify build errors
   * @param error Original error
   * @param context Additional context
   * @returns Classified BuildError
   */
  handleError(error: any, context: Record<string, any> = {}): BuildError {
    const buildError = this.classifyError(error, context);
    this.diagnostics.errors.push(buildError);
    this.logError(buildError);
    return buildError;
  }

  /**
   * Add a warning to diagnostics
   * @param message Warning message
   */
  addWarning(message: string): void {
    this.diagnostics.warnings.push(message);
    this.logWarning(message);
  }

  /**
   * Classify error based on message and context
   * @param error Original error
   * @param context Additional context
   * @returns Classified BuildError
   */
  private classifyError(error: any, context: Record<string, any>): BuildError {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    // Dependency resolution errors
    if (this.isDependencyError(message)) {
      return new BuildError(
        message,
        BuildErrorType.DEPENDENCY_RESOLUTION,
        BuildErrorSeverity.HIGH,
        true,
        { ...context, stack },
        [
          'Try running "pnpm install" to refresh dependencies',
          'Check for version conflicts in package.json files',
          'Clear node_modules and reinstall dependencies'
        ]
      );
    }

    // TypeScript compilation errors
    if (this.isTypeScriptError(message)) {
      return new BuildError(
        message,
        BuildErrorType.COMPILATION,
        BuildErrorSeverity.HIGH,
        true,
        { ...context, stack },
        [
          'Check TypeScript configuration in tsconfig.json',
          'Verify type definitions are installed',
          'Run "turbo typecheck" to see detailed type errors'
        ]
      );
    }

    // Type checking errors
    if (this.isTypeCheckError(message)) {
      return new BuildError(
        message,
        BuildErrorType.TYPE_CHECK,
        BuildErrorSeverity.MEDIUM,
        true,
        { ...context, stack },
        [
          'Fix type errors in the reported files',
          'Update type definitions if needed',
          'Check for missing imports or exports'
        ]
      );
    }

    // Linting errors
    if (this.isLintError(message)) {
      return new BuildError(
        message,
        BuildErrorType.LINT,
        BuildErrorSeverity.LOW,
        true,
        { ...context, stack },
        [
          'Fix linting errors using "turbo lint --fix"',
          'Update ESLint configuration if needed',
          'Consider disabling specific rules if appropriate'
        ]
      );
    }

    // Test errors
    if (this.isTestError(message)) {
      return new BuildError(
        message,
        BuildErrorType.TEST,
        BuildErrorSeverity.MEDIUM,
        true,
        { ...context, stack },
        [
          'Fix failing tests',
          'Update test snapshots if needed',
          'Check test configuration in vitest.config.ts'
        ]
      );
    }

    // Environment variable errors
    if (this.isEnvironmentError(message)) {
      return new BuildError(
        message,
        BuildErrorType.ENVIRONMENT,
        BuildErrorSeverity.CRITICAL,
        false,
        { ...context, stack },
        [
          'Check required environment variables are set',
          'Verify Phase.dev configuration',
          'Review .env.example for required variables'
        ]
      );
    }

    // Phase.dev integration errors
    if (this.isPhaseError(message)) {
      return new BuildError(
        message,
        BuildErrorType.PHASE_INTEGRATION,
        BuildErrorSeverity.HIGH,
        true,
        { ...context, stack },
        [
          'Check PHASE_SERVICE_TOKEN is valid',
          'Verify Phase.dev service is accessible',
          'Consider using fallback environment variables'
        ]
      );
    }

    // Turbo cache errors
    if (this.isTurboCacheError(message)) {
      return new BuildError(
        message,
        BuildErrorType.TURBO_CACHE,
        BuildErrorSeverity.LOW,
        true,
        { ...context, stack },
        [
          'Clear Turbo cache with "turbo clean"',
          'Check disk space availability',
          'Verify cache directory permissions'
        ]
      );
    }

    // Output validation errors
    if (this.isOutputValidationError(message)) {
      return new BuildError(
        message,
        BuildErrorType.OUTPUT_VALIDATION,
        BuildErrorSeverity.HIGH,
        false,
        { ...context, stack },
        [
          'Check build output directory exists',
          'Verify all required files are generated',
          'Review build configuration'
        ]
      );
    }

    // Deployment errors
    if (this.isDeploymentError(message)) {
      return new BuildError(
        message,
        BuildErrorType.DEPLOYMENT,
        BuildErrorSeverity.CRITICAL,
        false,
        { ...context, stack },
        [
          'Check Vercel configuration',
          'Verify deployment environment variables',
          'Review build logs for specific issues'
        ]
      );
    }

    // Unknown error
    return new BuildError(
      message,
      BuildErrorType.UNKNOWN,
      BuildErrorSeverity.MEDIUM,
      false,
      { ...context, stack },
      [
        'Check build logs for more details',
        'Try rebuilding from scratch',
        'Contact support if issue persists'
      ]
    );
  }

  /**
   * Check if error is related to dependency resolution
   */
  private isDependencyError(message: string): boolean {
    const patterns = [
      /cannot resolve dependency/i,
      /module not found/i,
      /package not found/i,
      /pnpm.*error/i,
      /dependency.*conflict/i,
      /peer dependency/i
    ];
    return patterns.some(pattern => pattern.test(message));
  }

  /**
   * Check if error is related to TypeScript compilation
   */
  private isTypeScriptError(message: string): boolean {
    const patterns = [
      /typescript.*error/i,
      /ts\(\d+\)/,
      /type.*error/i,
      /cannot find module.*\.ts/i,
      /compilation.*failed/i
    ];
    return patterns.some(pattern => pattern.test(message));
  }

  /**
   * Check if error is related to type checking
   */
  private isTypeCheckError(message: string): boolean {
    const patterns = [
      /type check.*failed/i,
      /typecheck.*error/i,
      /tsc.*error/i
    ];
    return patterns.some(pattern => pattern.test(message));
  }

  /**
   * Check if error is related to linting
   */
  private isLintError(message: string): boolean {
    const patterns = [
      /eslint.*error/i,
      /lint.*failed/i,
      /linting.*error/i
    ];
    return patterns.some(pattern => pattern.test(message));
  }

  /**
   * Check if error is related to tests
   */
  private isTestError(message: string): boolean {
    const patterns = [
      /test.*failed/i,
      /vitest.*error/i,
      /jest.*error/i,
      /test suite.*failed/i
    ];
    return patterns.some(pattern => pattern.test(message));
  }

  /**
   * Check if error is related to environment variables
   */
  private isEnvironmentError(message: string): boolean {
    const patterns = [
      /environment variable.*missing/i,
      /required.*env/i,
      /configuration.*missing/i,
      /env.*not found/i
    ];
    return patterns.some(pattern => pattern.test(message));
  }

  /**
   * Check if error is related to Phase.dev
   */
  private isPhaseError(message: string): boolean {
    const patterns = [
      /phase\.dev/i,
      /phase.*error/i,
      /phase.*failed/i,
      /phase_service_token/i
    ];
    return patterns.some(pattern => pattern.test(message));
  }

  /**
   * Check if error is related to Turbo cache
   */
  private isTurboCacheError(message: string): boolean {
    const patterns = [
      /turbo.*cache/i,
      /cache.*error/i,
      /cache.*failed/i
    ];
    return patterns.some(pattern => pattern.test(message));
  }

  /**
   * Check if error is related to output validation
   */
  private isOutputValidationError(message: string): boolean {
    const patterns = [
      /build output.*not found/i,
      /required.*file.*missing/i,
      /output.*validation/i
    ];
    return patterns.some(pattern => pattern.test(message));
  }

  /**
   * Check if error is related to deployment
   */
  private isDeploymentError(message: string): boolean {
    const patterns = [
      /deployment.*failed/i,
      /vercel.*error/i,
      /deploy.*error/i
    ];
    return patterns.some(pattern => pattern.test(message));
  }

  /**
   * Generate comprehensive diagnostics report
   * @returns Diagnostics report
   */
  generateDiagnosticsReport(): BuildDiagnostics {
    this.diagnostics.buildDuration = Date.now() - this.buildStartTime.getTime();
    this.diagnostics.memoryUsage = process.memoryUsage();
    return { ...this.diagnostics };
  }

  /**
   * Log error with formatting
   * @param error Build error
   */
  private logError(error: BuildError): void {
    console.error(`\n❌ [${error.type}] ${error.message}`);
    console.error(`   Severity: ${error.severity}`);
    console.error(`   Recoverable: ${error.recoverable}`);
    console.error(`   Time: ${error.timestamp.toISOString()}`);
    
    if (error.suggestions.length > 0) {
      console.error(`   Suggestions:`);
      error.suggestions.forEach(suggestion => {
        console.error(`   • ${suggestion}`);
      });
    }

    if (Object.keys(error.context).length > 0) {
      console.error(`   Context:`, error.context);
    }
  }

  /**
   * Log warning with formatting
   * @param message Warning message
   */
  private logWarning(message: string): void {
    console.warn(`⚠️  ${message}`);
  }
}

/**
 * Global build error handler instance
 */
let globalBuildErrorHandler: BuildErrorHandler | null = null;

/**
 * Get or create global build error handler
 * @returns Build error handler instance
 */
export function getBuildErrorHandler(): BuildErrorHandler {
  if (!globalBuildErrorHandler) {
    globalBuildErrorHandler = new BuildErrorHandler();
  }
  return globalBuildErrorHandler;
}

/**
 * Reset global build error handler (for testing)
 */
export function resetBuildErrorHandler(): void {
  globalBuildErrorHandler = null;
}