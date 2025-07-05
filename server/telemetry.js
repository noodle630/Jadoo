// OpenTelemetry instrumentation for observability
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import Resource from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

// Initialize OpenTelemetry
const sdk = new NodeSDK({
  resource: Resource.default({
    [SemanticResourceAttributes.SERVICE_NAME]: 'jadoo-feed-transformer',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
});

// Start the SDK
sdk.start();

// Helper function to create spans for LLM calls
function traceLLMCall(model, prompt, context = {}) {
  const tracer = trace.getTracer('jadoo-llm');
  return tracer.startActiveSpan('llm.call', {
    attributes: {
      'llm.model': model,
      'llm.prompt_length': prompt.length,
      'llm.context': JSON.stringify(context),
    }
  }, (span) => {
    return {
      span,
      end: (result, error) => {
        if (error) {
          span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
          span.recordException(error);
        } else {
          span.setStatus({ code: SpanStatusCode.OK });
          span.setAttributes({
            'llm.response_length': result ? result.length : 0,
          });
        }
        span.end();
      }
    };
  });
}

// Helper function to trace file operations
function traceFileOperation(operation, filePath, context = {}) {
  const tracer = trace.getTracer('jadoo-file');
  return tracer.startActiveSpan(`file.${operation}`, {
    attributes: {
      'file.path': filePath,
      'file.operation': operation,
      ...context
    }
  }, (span) => {
    return {
      span,
      end: (error) => {
        if (error) {
          span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
          span.recordException(error);
        } else {
          span.setStatus({ code: SpanStatusCode.OK });
        }
        span.end();
      }
    };
  });
}

// Helper function to trace database operations
function traceDatabaseOperation(operation, table, context = {}) {
  const tracer = trace.getTracer('jadoo-database');
  return tracer.startActiveSpan(`db.${operation}`, {
    attributes: {
      'db.table': table,
      'db.operation': operation,
      ...context
    }
  }, (span) => {
    return {
      span,
      end: (error) => {
        if (error) {
          span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
          span.recordException(error);
        } else {
          span.setStatus({ code: SpanStatusCode.OK });
        }
        span.end();
      }
    };
  });
}

// Helper function to trace Supabase operations
function traceSupabaseOperation(operation, bucket, context = {}) {
  const tracer = trace.getTracer('jadoo-supabase');
  return tracer.startActiveSpan(`supabase.${operation}`, {
    attributes: {
      'supabase.bucket': bucket,
      'supabase.operation': operation,
      ...context
    }
  }, (span) => {
    return {
      span,
      end: (error) => {
        if (error) {
          span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
          span.recordException(error);
        } else {
          span.setStatus({ code: SpanStatusCode.OK });
        }
        span.end();
      }
    };
  });
}

export { sdk, traceLLMCall, traceFileOperation, traceDatabaseOperation, traceSupabaseOperation }; 