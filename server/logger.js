// Minimal logger for development
// Replace with real implementation as needed

function logPerformance(...args) {
  console.log('[PERFORMANCE]', ...args);
}

function logLLMCall(...args) {
  console.log('[LLM CALL]', ...args);
}

function logError(...args) {
  console.error('[ERROR]', ...args);
}

function logJobProgress(feedId, percent, status, message) {
  console.log(`[JOB_PROGRESS] feedId=${feedId} percent=${percent} status=${status} message=${message}`);
}

export {
  logPerformance,
  logLLMCall,
  logError,
  logJobProgress,
}; 