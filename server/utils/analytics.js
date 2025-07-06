import { createClient } from '@supabase/supabase-js';
import { logPerformance } from '../logger.js';

// Initialize Supabase client
const REMOVED_SECRET= createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

class AnalyticsService {
  constructor() {
    this.batchSize = 10;
    this.pendingMetrics = [];
  }

  // Record job analytics
  async recordJobAnalytics(jobData) {
    try {
      console.log('[Analytics] Attempting to record job analytics:', jobData);
      const {
        feedId,
        jobId,
        platform,
        category,
        totalRows,
        processingTime,
        transformTime,
        llmCalls = 0,
        llmErrors = 0,
        cacheHits = 0,
        successRate = 0,
        avgConfidence = 0,
        blankFieldsCount = 0,
        warnings = [],
        suggestions = []
      } = jobData;

      const { error } = await supabase
        .from('job_analytics')
        .insert({
          feed_id: feedId,
          job_id: jobId,
          platform,
          category,
          total_rows: totalRows,
          processing_time_ms: processingTime,
          transform_time_ms: transformTime,
          llm_calls: llmCalls,
          llm_errors: llmErrors,
          cache_hits: cacheHits,
          success_rate: successRate,
          avg_confidence: avgConfidence,
          blank_fields_count: blankFieldsCount,
          warnings,
          suggestions
        });

      if (error) {
        console.error('[Analytics] Failed to record job analytics:', error, jobData);
      } else {
        console.log(`[Analytics] Successfully recorded job analytics for ${feedId}`);
      }
    } catch (error) {
      console.error('[Analytics] Error recording job analytics:', error, jobData);
    }
  }

  // Record field analytics
  async recordFieldAnalytics(feedId, fieldStats) {
    try {
      const fieldRecords = Object.entries(fieldStats).map(([fieldName, stats]) => ({
        feed_id: feedId,
        field_name: fieldName,
        field_type: stats.type || 'unknown',
        total_occurrences: stats.total || 0,
        successful_mappings: stats.successful || 0,
        blank_count: stats.blanks || 0,
        avg_confidence: stats.confidence || 0,
        common_values: stats.common_values || {}
      }));

      const { error } = await supabase
        .from('field_analytics')
        .insert(fieldRecords);

      if (error) {
        console.error('Failed to record field analytics:', error);
      } else {
        console.log(`Recorded field analytics for ${feedId}: ${fieldRecords.length} fields`);
      }
    } catch (error) {
      console.error('Error recording field analytics:', error);
    }
  }

  // Record LLM call analytics
  async recordLLMAnalytics(feedId, llmData) {
    try {
      const {
        promptHash,
        promptLength,
        responseLength,
        confidence,
        duration,
        estimatedCost,
        model,
        temperature,
        maxTokens,
        success = true,
        errorMessage = null
      } = llmData;

      const { error } = await supabase
        .from('llm_analytics')
        .insert({
          feed_id: feedId,
          prompt_hash: promptHash,
          prompt_length: promptLength,
          response_length: responseLength,
          confidence,
          duration_ms: duration,
          estimated_cost: estimatedCost,
          model,
          temperature,
          max_tokens: maxTokens,
          success,
          error_message: errorMessage
        });

      if (error) {
        console.error('Failed to record LLM analytics:', error);
      }
    } catch (error) {
      console.error('Error recording LLM analytics:', error);
    }
  }

  // Record performance metrics
  async recordPerformanceMetric(operation, duration, metadata = {}, feedId = null) {
    try {
      // Add to pending batch
      this.pendingMetrics.push({
        operation,
        duration_ms: duration,
        metadata,
        feed_id: feedId
      });

      // Flush batch if it's full
      if (this.pendingMetrics.length >= this.batchSize) {
        await this.flushPerformanceMetrics();
      }
    } catch (error) {
      console.error('Error recording performance metric:', error);
    }
  }

  // Flush pending performance metrics
  async flushPerformanceMetrics() {
    if (this.pendingMetrics.length === 0) return;

    try {
      const { error } = await supabase
        .from('performance_metrics')
        .insert(this.pendingMetrics);

      if (error) {
        console.error('Failed to flush performance metrics:', error);
      } else {
        console.log(`Flushed ${this.pendingMetrics.length} performance metrics`);
      }

      this.pendingMetrics = [];
    } catch (error) {
      console.error('Error flushing performance metrics:', error);
    }
  }

  // Get job performance summary
  async getJobPerformanceSummary(platform = null, category = null) {
    try {
      let query = supabase
        .from('job_performance_summary')
        .select('*');

      if (platform) {
        query = query.eq('platform', platform);
      }
      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to get job performance summary:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting job performance summary:', error);
      return [];
    }
  }

  // Get field performance summary
  async getFieldPerformanceSummary() {
    try {
      const { data, error } = await supabase
        .from('field_performance_summary')
        .select('*')
        .limit(50);

      if (error) {
        console.error('Failed to get field performance summary:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting field performance summary:', error);
      return [];
    }
  }

  // Get LLM performance summary
  async getLLMPerformanceSummary() {
    try {
      const { data, error } = await supabase
        .from('llm_performance_summary')
        .select('*');

      if (error) {
        console.error('Failed to get LLM performance summary:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting LLM performance summary:', error);
      return [];
    }
  }

  // Get recent job analytics
  async getRecentJobAnalytics(limit = 10) {
    try {
      const { data, error } = await supabase
        .from('job_analytics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to get recent job analytics:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting recent job analytics:', error);
      return [];
    }
  }

  // Get analytics dashboard data
  async getDashboardData() {
    try {
      const [jobSummary, fieldSummary, llmSummary, recentJobs] = await Promise.all([
        this.getJobPerformanceSummary(),
        this.getFieldPerformanceSummary(),
        this.getLLMPerformanceSummary(),
        this.getRecentJobAnalytics(5)
      ]);

      return {
        jobSummary,
        fieldSummary,
        llmSummary,
        recentJobs
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      return {
        jobSummary: [],
        fieldSummary: [],
        llmSummary: [],
        recentJobs: []
      };
    }
  }
}

export default new AnalyticsService(); 