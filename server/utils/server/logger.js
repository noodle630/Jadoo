"use strict";
// Minimal logger for development
// Replace with real implementation as needed
Object.defineProperty(exports, "__esModule", { value: true });
exports.logPerformance = logPerformance;
exports.logLLMCall = logLLMCall;
exports.logError = logError;
exports.logJobProgress = logJobProgress;
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
