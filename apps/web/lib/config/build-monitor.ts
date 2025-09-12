/**
 * Build monitoring and reporting utilities
 */

import { getBuildErrorHandler, BuildError, BuildErrorType, BuildErrorSeverity } from './build-error-handler';

/**
 * Build stage tracking
 */
export enum BuildStage {
  INITIALIZATION = 'INITIALIZATION',
  DEPENDENCY_RESOLUTION = 'DEPENDENCY_RESOLUTION',
  TYPE_CHECKING = 'TYPE_CHECKING',
  COMPILATION = 'COMPILATION',
  BUNDLING = 'BUNDLING',
  OPTIMIZATION = 'OPTIMIZATION',
  OUTPUT_GENERATION = 'OUTPUT_GENERATION',
  VALIDATION = 'VALIDATION',
  COMPLETION = 'COMPLETION'
}

/**
 * Build stage information
 */
export interface BuildStageInfo {
  stage: BuildStage;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'running' | 'completed' | 'failed';
  errors: BuildError[];
  warnings: string[];
  metrics: Record<string, any>;
}

/**
 * Build monitoring class
 */
export class BuildMonitor {
  private stages: Map<BuildStage, BuildStageInfo> = new Map();
  private currentStage: BuildStage | null = null;
  private buildStartTime: Date;
  private errorHandler = getBuildErrorHandler();

  constructor() {
    this.buildStartTime = new Date();
  }

  /**
   * Start monitoring a build stage
   * @param stage Build stage to monitor
   * @param metrics Optional initial metrics
   */
  startStage(stage: BuildStage, metrics: Record<string, any> = {}): void {
    // End current stage if running
    if (this.currentStage && this.stages.get(this.currentStage)?.status === 'running') {
      this.endStage(this.currentStage, 'completed');
    }

    const stageInfo: BuildStageInfo = {
      stage,
      startTime: new Date(),
      status: 'running',
      errors: [],
      warnings: [],
      metrics
    };

    this.stages.set(stage, stageInfo);
    this.currentStage = stage;

    console.log(`🔄 [BuildMonitor] Starting stage: ${stage}`);
  }

  /**
   * End monitoring a build stage
   * @param stage Build stage to end
   * @param status Final status
   */
  endStage(stage: BuildStage, status: 'completed' | 'failed'): void {
    const stageInfo = this.stages.get(stage);
    if (!stageInfo) {
      console.warn(`⚠️  [BuildMonitor] Attempted to end unknown stage: ${stage}`);
      return;
    }

    stageInfo.endTime = new Date();
    stageInfo.duration = stageInfo.endTime.getTime() - stageInfo.startTime.getTime();
    stageInfo.status = status;

    if (this.currentStage === stage) {
      this.currentStage = null;
    }

    const statusIcon = status === 'completed' ? '✅' : '❌';
    console.log(`${statusIcon} [BuildMonitor] Stage ${stage} ${status} in ${stageInfo.duration}ms`);
  }

  /**
   * Add error to current stage
   * @param error Error to add
   */
  addError(error: any): BuildError {
    const buildError = this.errorHandler.handleError(error);
    
    if (this.currentStage) {
      const stageInfo = this.stages.get(this.currentStage);
      if (stageInfo) {
        stageInfo.errors.push(buildError);
      }
    }

    return buildError;
  }

  /**
   * Add warning to current stage
   * @param message Warning message
   */
  addWarning(message: string): void {
    this.errorHandler.addWarning(message);
    
    if (this.currentStage) {
      const stageInfo = this.stages.get(this.currentStage);
      if (stageInfo) {
        stageInfo.warnings.push(message);
      }
    }
  }

  /**
   * Update metrics for current stage
   * @param metrics Metrics to update
   */
  updateMetrics(metrics: Record<string, any>): void {
    if (this.currentStage) {
      const stageInfo = this.stages.get(this.currentStage);
      if (stageInfo) {
        stageInfo.metrics = { ...stageInfo.metrics, ...metrics };
      }
    }
  }

  /**
   * Get build summary
   * @returns Build summary information
   */
  getBuildSummary(): {
    totalDuration: number;
    stages: BuildStageInfo[];
    totalErrors: number;
    totalWarnings: number;
    success: boolean;
    criticalErrors: number;
  } {
    const now = new Date();
    const totalDuration = now.getTime() - this.buildStartTime.getTime();
    const stages = Array.from(this.stages.values());
    
    const totalErrors = stages.reduce((sum, stage) => sum + stage.errors.length, 0);
    const totalWarnings = stages.reduce((sum, stage) => sum + stage.warnings.length, 0);
    const criticalErrors = stages.reduce((sum, stage) => 
      sum + stage.errors.filter(error => error.severity === BuildErrorSeverity.CRITICAL).length, 0
    );
    
    const success = stages.every(stage => stage.status !== 'failed') && criticalErrors === 0;

    return {
      totalDuration,
      stages,
      totalErrors,
      totalWarnings,
      success,
      criticalErrors
    };
  }

  /**
   * Generate detailed build report
   * @returns Detailed build report
   */
  generateBuildReport(): {
    summary: any;
    diagnostics: any;
    recommendations: string[];
  } {
    const summary = this.getBuildSummary();
    const diagnostics = this.errorHandler.generateDiagnosticsReport();
    const recommendations = this.generateRecommendations(summary, diagnostics);

    return {
      summary,
      diagnostics,
      recommendations
    };
  }

  /**
   * Generate recommendations based on build results
   * @param summary Build summary
   * @param diagnostics Build diagnostics
   * @returns Array of recommendations
   */
  private generateRecommendations(summary: any, diagnostics: any): string[] {
    const recommendations: string[] = [];

    // Performance recommendations
    if (summary.totalDuration > 300000) { // > 5 minutes
      recommendations.push('Consider optimizing build performance - build took longer than 5 minutes');
    }

    // Memory recommendations
    const memoryUsageMB = diagnostics.memoryUsage.heapUsed / 1024 / 1024;
    if (memoryUsageMB > 1024) { // > 1GB
      recommendations.push('High memory usage detected - consider optimizing memory consumption');
    }

    // Error pattern recommendations
    const errorTypes = diagnostics.errors.map((error: BuildError) => error.type);
    const errorTypeCounts = errorTypes.reduce((counts: Record<string, number>, type: string) => {
      counts[type] = (counts[type] || 0) + 1;
      return counts;
    }, {});

    if (errorTypeCounts[BuildErrorType.DEPENDENCY_RESOLUTION] > 0) {
      recommendations.push('Dependency resolution issues detected - consider updating package.json');
    }

    if (errorTypeCounts[BuildErrorType.TYPE_CHECK] > 0) {
      recommendations.push('TypeScript errors detected - run "turbo typecheck" for detailed analysis');
    }

    if (errorTypeCounts[BuildErrorType.PHASE_INTEGRATION] > 0) {
      recommendations.push('Phase.dev integration issues - verify service token and connectivity');
    }

    // Stage-specific recommendations
    const failedStages = summary.stages.filter((stage: BuildStageInfo) => stage.status === 'failed');
    if (failedStages.length > 0) {
      recommendations.push(`Failed stages detected: ${failedStages.map((s: BuildStageInfo) => s.stage).join(', ')}`);
    }

    // Warning recommendations
    if (summary.totalWarnings > 10) {
      recommendations.push('High number of warnings detected - consider addressing to improve build quality');
    }

    return recommendations;
  }

  /**
   * Log build summary to console
   */
  logBuildSummary(): void {
    const summary = this.getBuildSummary();
    
    console.log('\n📊 Build Summary:');
    console.log(`   Total Duration: ${summary.totalDuration}ms`);
    console.log(`   Stages Completed: ${summary.stages.filter(s => s.status === 'completed').length}/${summary.stages.length}`);
    console.log(`   Errors: ${summary.totalErrors}`);
    console.log(`   Warnings: ${summary.totalWarnings}`);
    console.log(`   Success: ${summary.success ? '✅' : '❌'}`);

    if (summary.stages.length > 0) {
      console.log('\n📋 Stage Details:');
      summary.stages.forEach(stage => {
        const statusIcon = stage.status === 'completed' ? '✅' : stage.status === 'failed' ? '❌' : '🔄';
        const duration = stage.duration ? `${stage.duration}ms` : 'running';
        console.log(`   ${statusIcon} ${stage.stage}: ${duration}`);
        
        if (stage.errors.length > 0) {
          console.log(`      Errors: ${stage.errors.length}`);
        }
        if (stage.warnings.length > 0) {
          console.log(`      Warnings: ${stage.warnings.length}`);
        }
      });
    }

    const recommendations = this.generateRecommendations(summary, this.errorHandler.generateDiagnosticsReport());
    if (recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }
  }
}

/**
 * Global build monitor instance
 */
let globalBuildMonitor: BuildMonitor | null = null;

/**
 * Get or create global build monitor
 * @returns Build monitor instance
 */
export function getBuildMonitor(): BuildMonitor {
  if (!globalBuildMonitor) {
    globalBuildMonitor = new BuildMonitor();
  }
  return globalBuildMonitor;
}

/**
 * Reset global build monitor (for testing)
 */
export function resetBuildMonitor(): void {
  globalBuildMonitor = null;
}

/**
 * Convenience function to wrap a build operation with monitoring
 * @param stage Build stage
 * @param operation Operation to execute
 * @param metrics Optional initial metrics
 * @returns Promise resolving to operation result
 */
export async function monitorBuildOperation<T>(
  stage: BuildStage,
  operation: () => Promise<T> | T,
  metrics: Record<string, any> = {}
): Promise<T> {
  const monitor = getBuildMonitor();
  
  monitor.startStage(stage, metrics);
  
  try {
    const result = await operation();
    monitor.endStage(stage, 'completed');
    return result;
  } catch (error) {
    monitor.addError(error);
    monitor.endStage(stage, 'failed');
    throw error;
  }
}