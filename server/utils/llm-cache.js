import { createClient } from '@supabase/supabase-js';
import { logLLMCall, logError } from '../logger.js';

// Initialize Supabase client for caching
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// In-memory cache for hot data (faster than DB for repeated calls)
const memoryCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms

class LLMCache {
  constructor() {
    this.retryAttempts = 3;
    this.retryDelay = 1000; // Start with 1 second
  }

  // Generate cache key from prompt and context
  generateKey(prompt, context = {}) {
    const contextStr = JSON.stringify(context);
    return `${prompt.substring(0, 100)}_${contextStr}`.replace(/[^a-zA-Z0-9]/g, '_');
  }

  // Get from memory cache first, then DB
  async get(prompt, context = {}) {
    const key = this.generateKey(prompt, context);
    
    // Check memory cache first
    const memoryResult = memoryCache.get(key);
    if (memoryResult && Date.now() - memoryResult.timestamp < CACHE_TTL) {
      return memoryResult.data;
    }

    // Check database cache
    try {
      const { data, error } = await supabase
        .from('llm_cache')
        .select('response, confidence, created_at')
        .eq('prompt_hash', key)
        .gte('created_at', new Date(Date.now() - CACHE_TTL).toISOString())
        .single();

      if (data && !error) {
        // Update memory cache
        memoryCache.set(key, {
          data: data.response,
          timestamp: Date.now()
        });
        return data.response;
      }
    } catch (error) {
      logError(error, { context: 'llm_cache_get', key });
    }

    return null;
  }

  // Store in both memory and DB
  async set(prompt, response, confidence = 0.8, context = {}) {
    const key = this.generateKey(prompt, context);
    
    // Store in memory cache
    memoryCache.set(key, {
      data: response,
      timestamp: Date.now()
    });

    // Store in database for persistence
    try {
      await supabase.from('llm_cache').upsert({
        prompt_hash: key,
        prompt: prompt.substring(0, 1000), // Limit prompt size
        response: response,
        confidence: confidence,
        context: context,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      logError(error, { context: 'llm_cache_set', key });
    }
  }

  // Retry logic for LLM calls
  async retryLLMCall(llmFunction, ...args) {
    let lastError;
    const prompt = args[0] || '';
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const startTime = Date.now();
        const result = await llmFunction(...args);
        const duration = Date.now() - startTime;
        logLLMCall(prompt, result, 0.8, duration, 0.01); // Estimate cost
        return result;
      } catch (error) {
        lastError = error;
        logError(
          error instanceof Error ? error : { message: String(error), stack: '' },
          { context: 'llm_retry', attempt, maxAttempts: this.retryAttempts }
        );
        if (attempt < this.retryAttempts) {
          // Exponential backoff
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }

  // Wrapper for OpenAI calls with caching and retry
  async callWithCache(openaiClient, prompt, options = {}) {
    const context = {
      model: options.model || 'gpt-4',
      temperature: options.temperature || 0.1,
      max_tokens: options.max_tokens || 1000
    };

    // Try cache first
    const cached = await this.get(prompt, context);
    if (cached) {
      return cached;
    }

    // Call OpenAI with retry logic
    const llmCall = async () => {
      const response = await openaiClient.chat.completions.create({
        model: context.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: context.temperature,
        max_tokens: context.max_tokens
      });
      return response.choices[0]?.message?.content || '';
    };

    const result = await this.retryLLMCall(llmCall);
    
    // Cache the result
    await this.set(prompt, result, 0.8, context);
    
    return result;
  }

  // Clear old cache entries
  async cleanup() {
    try {
      // Clear old DB entries
      await supabase
        .from('llm_cache')
        .delete()
        .lt('created_at', new Date(Date.now() - CACHE_TTL).toISOString());
      
      // Clear old memory entries
      const now = Date.now();
      for (const [key, value] of memoryCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          memoryCache.delete(key);
        }
      }
    } catch (error) {
      logError(error, { context: 'llm_cache_cleanup' });
    }
  }
}

export default new LLMCache(); 