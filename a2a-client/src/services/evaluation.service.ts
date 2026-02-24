import { logger } from '../utils/logger.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface EvaluationResult {
  score: number; // 0 to 100
  passed: boolean;
  critique: string;
  errors: string[];
}

/**
 * EvaluationService
 * Performs automated quality checks on agent implementations.
 */
export class EvaluationService {
  /**
   * Evaluates an implementation based on static analysis and (optional) test runs.
   *
   * Реальная интеграция с тестами включается флагом:
   * - context.runTests === true И
   * - process.env.EVAL_RUN_TESTS === '1'
   */
  public async evaluate(
    implementation: string,
    context: Record<string, any>
  ): Promise<EvaluationResult> {
    logger.info('Evaluation: Starting evaluation of implementation');

    const errors: string[] = [];
    let score = 100;

    // 1. Basic sanity checks
    if (!implementation || implementation.length < 50) {
      errors.push('Implementation is too short or empty');
      score -= 50;
    }

    // 2. Lightweight syntax / pattern checks
    if (implementation.includes('<<<<SEARCH') && !implementation.includes('====')) {
      errors.push('Incomplete SEARCH/REPLACE block detected');
      score -= 30;
    }

    // 3. Optional automated test run
    const shouldRunTests = context.runTests === true && process.env['EVAL_RUN_TESTS'] === '1';

    if (shouldRunTests) {
      try {
        logger.info('Evaluation: Running automated tests for implementation');
        const start = Date.now();

        // По умолчанию запускаем npm test в текущем проекте.
        // Ожидается, что окружение настроено (DATABASE_URL и т.п.).
        const { stdout, stderr } = await execAsync('npm test -- --runInBand', {
          timeout: 5 * 60 * 1000,
        });

        logger.info('Evaluation: Test run completed', {
          durationMs: Date.now() - start,
        });

        if (stderr && stderr.trim().length > 0) {
          logger.warn('Evaluation: Test run reported stderr', { stderr });
        }
      } catch (err) {
        errors.push('Automated tests failed or timed out');
        score -= 20;
        logger.warn('Evaluation: Test run failed', { error: String(err) });
      }
    }

    const passed = score >= 70;
    const critique = passed
      ? 'Implementation meets quality standards.'
      : 'Implementation failed quality gate. See errors.';

    return {
      score,
      passed,
      critique,
      errors,
    };
  }
}

export const evaluationService = new EvaluationService();
