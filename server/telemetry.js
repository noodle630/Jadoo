// Minimal telemetry service to get backend running
export const traceLLMCall = (operation, data) => {
  console.log('[TELEMETRY] LLM call:', operation, data);
};

export const traceFileOperation = (operation, data) => {
  console.log('[TELEMETRY] File operation:', operation, data);
};

export const traceDatabaseOperation = (operation, data) => {
  console.log('[TELEMETRY] Database operation:', operation, data);
};

export const traceSupabaseOperation = (operation, data) => {
  console.log('[TELEMETRY] Supabase operation:', operation, data);
}; 