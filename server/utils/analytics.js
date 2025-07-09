// Minimal analytics service to get backend running
const analyticsService = {
  async recordJobAnalytics(data) {
    console.log('[ANALYTICS] Record job analytics:', data);
    return { success: true };
  },

  async recordFieldAnalytics(feedId, fieldStats) {
    console.log('[ANALYTICS] Record field analytics for', feedId, fieldStats);
    return { success: true };
  },

  async getDashboardData() {
    console.log('[ANALYTICS] Get dashboard data');
    return { jobs: [], fields: [], llm: [] };
  },

  async getJobPerformanceSummary(platform, category) {
    console.log('[ANALYTICS] Get job performance summary:', platform, category);
    return { total: 0, success: 0, failed: 0 };
  },

  async getFieldPerformanceSummary() {
    console.log('[ANALYTICS] Get field performance summary');
    return { fields: [] };
  },

  async getLLMPerformanceSummary() {
    console.log('[ANALYTICS] Get LLM performance summary');
    return { calls: 0, success: 0, failed: 0 };
  },

  async getRecentJobAnalytics(limit) {
    console.log('[ANALYTICS] Get recent job analytics:', limit);
    return [];
  }
};

export default analyticsService; 