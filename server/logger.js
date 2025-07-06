import pino from 'pino';

// Create structured logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

// Specialized loggers for different components
export const llmLogger = logger.child({ component: 'llm' });
export const jobLogger = logger.child({ component: 'job' });
export const performanceLogger = logger.child({ component: 'performance' });
export const errorLogger = logger.child({ component: 'error' });

// Helper functions for common logging patterns
export const logLLMCall = (prompt, response, confidence, duration, cost) => {
  llmLogger.info({
    event: 'llm_call',
    prompt_length: prompt ? prompt.length : 0,
    response_length: response ? response.length : 0,
    confidence,
    duration_ms: duration,
    estimated_cost: cost,
  });
};

export const logJobProgress = (feedId, progress, status, message) => {
  jobLogger.info({
    event: 'job_progress',
    feed_id: feedId,
    progress,
    status,
    message,
  });
};

export const logPerformance = (operation, duration, metadata = {}) => {
  performanceLogger.info({
    event: 'performance',
    operation,
    duration_ms: duration,
    ...metadata,
  });
};

export const logError = (error, context = {}) => {
  errorLogger.error({
    event: 'error',
    error: error.message,
    stack: error.stack,
    ...context,
  });
};

export default logger; 