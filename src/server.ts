/**
 * Intent-Driven Cold Outreach Agent - HTTP Server
 * 
 * Production-ready HTTP server with single public endpoint for outreach processing.
 * Provides comprehensive error handling, request validation, and response formatting.
 */

import * as http from 'http';
import * as url from 'url';
import { IntentDrivenOutreachAgent, ProspectData, IntentSignal } from './index';

// Server configuration from environment variables
const PORT = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const ENABLE_VERBOSE_LOGGING = process.env.ENABLE_VERBOSE_LOGGING === 'true';
const PROCESSING_TIMEOUT = parseInt(process.env.PROCESSING_TIMEOUT || '30000', 10);

// Initialize the agent with environment configuration
const agent = new IntentDrivenOutreachAgent({
  enableVerboseLogging: ENABLE_VERBOSE_LOGGING,
  processingTimeout: PROCESSING_TIMEOUT,
});

/**
 * HTTP request handler for the outreach agent
 */
async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url || '', true);
  const pathname = parsedUrl.pathname;

  try {
    // Health check endpoint
    if (req.method === 'GET' && pathname === '/health') {
      const health = agent.getHealthStatus();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        service: 'Intent-Driven Cold Outreach Agent',
        version: health.version,
        environment: NODE_ENV,
        timestamp: new Date().toISOString(),
        health: health.status
      }, null, 2));
      return;
    }

    // Main outreach processing endpoint
    if (req.method === 'POST' && pathname === '/agent/outreach') {
      await handleOutreachRequest(req, res);
      return;
    }

    // 404 for unknown endpoints
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Not Found',
      message: 'Endpoint not found',
      availableEndpoints: [
        'GET /health - Health check',
        'POST /agent/outreach - Process outreach request'
      ]
    }, null, 2));

  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    }, null, 2));
  }
}

/**
 * Handles outreach processing requests
 */
async function handleOutreachRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  try {
    // Parse request body
    const body = await parseRequestBody(req);
    
    if (!body) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Bad Request',
        message: 'Request body is required',
        expectedFormat: {
          prospectData: {
            role: 'string',
            companyContext: {
              name: 'string',
              industry: 'string',
              size: 'startup|small|medium|large|enterprise'
            },
            contactDetails: {
              name: 'string',
              email: 'string'
            }
          },
          intentSignals: [{
            type: 'job_change|funding_event|technology_adoption|company_growth|industry_trend',
            description: 'string',
            timestamp: 'ISO date string',
            relevanceScore: 'number (0-1)',
            source: 'string'
          }]
        }
      }, null, 2));
      return;
    }

    // Validate request structure
    const { prospectData, intentSignals } = body;
    
    if (!prospectData || !intentSignals) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Bad Request',
        message: 'Both prospectData and intentSignals are required',
        received: {
          prospectData: !!prospectData,
          intentSignals: !!intentSignals
        }
      }, null, 2));
      return;
    }

    // Convert timestamp strings to Date objects
    const processedSignals: IntentSignal[] = intentSignals.map((signal: any) => ({
      ...signal,
      timestamp: new Date(signal.timestamp)
    }));

    // Process the outreach request
    const startTime = Date.now();
    const result = await agent.processOutreachRequest(prospectData, processedSignals);
    const processingTime = Date.now() - startTime;

    // Handle processing errors
    if ('code' in result) {
      const statusCode = getErrorStatusCode(result.code);
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: {
          code: result.code,
          message: result.message,
          step: result.step,
          remediation: result.remediation,
          context: result.context
        },
        processingTime,
        timestamp: new Date().toISOString()
      }, null, 2));
      return;
    }

    // Return successful result
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      data: {
        intentConfidence: result.intentConfidence,
        reasoningSummary: result.reasoningSummary,
        recommendedMessage: result.recommendedMessage,
        alternativeMessages: result.alternativeMessages,
        suggestedFollowUpTiming: result.suggestedFollowUpTiming,
        processingMetadata: {
          ...result.processingMetadata,
          serverProcessingTime: processingTime
        }
      },
      timestamp: new Date().toISOString()
    }, null, 2));

  } catch (error) {
    console.error('Outreach processing error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Internal server error during processing',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      timestamp: new Date().toISOString()
    }, null, 2));
  }
}

/**
 * Parses JSON request body
 */
function parseRequestBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        if (!body.trim()) {
          resolve(null);
          return;
        }
        const parsed = JSON.parse(body);
        resolve(parsed);
      } catch (error) {
        reject(new Error('Invalid JSON in request body'));
      }
    });
    
    req.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Maps error codes to HTTP status codes
 */
function getErrorStatusCode(errorCode: string): number {
  const statusMap: Record<string, number> = {
    'VALIDATION_FAILED': 400,
    'PROCESSING_TIMEOUT': 408,
    'SIGNAL_INTERPRETATION_ERROR': 422,
    'HYPOTHESIS_FORMATION_ERROR': 422,
    'CONFIDENCE_SCORING_ERROR': 422,
    'STRATEGY_SELECTION_ERROR': 422,
    'MESSAGE_GENERATION_ERROR': 422,
    'AUTHENTICITY_FILTER_ERROR': 422,
    'OUTPUT_ASSEMBLY_ERROR': 422,
  };
  
  return statusMap[errorCode] || 500;
}

/**
 * Graceful shutdown handler
 */
function gracefulShutdown(server: http.Server): void {
  console.log('Received shutdown signal, closing server gracefully...');
  
  server.close((err) => {
    if (err) {
      console.error('Error during server shutdown:', err);
      process.exit(1);
    }
    
    console.log('Server closed successfully');
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

/**
 * Start the HTTP server
 */
function startServer(): void {
  const server = http.createServer(handleRequest);
  
  server.listen(PORT, () => {
    console.log(`🚀 Intent-Driven Cold Outreach Agent Server`);
    console.log(`📡 Listening on port ${PORT}`);
    console.log(`🌍 Environment: ${NODE_ENV}`);
    console.log(`📋 Available endpoints:`);
    console.log(`   GET  /health - Health check`);
    console.log(`   POST /agent/outreach - Process outreach request`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
    
    if (ENABLE_VERBOSE_LOGGING) {
      console.log(`🔍 Verbose logging: enabled`);
      console.log(`⏱️  Processing timeout: ${PROCESSING_TIMEOUT}ms`);
    }
  });
  
  server.on('error', (error) => {
    console.error('Server error:', error);
    process.exit(1);
  });
  
  // Handle graceful shutdown
  process.on('SIGTERM', () => gracefulShutdown(server));
  process.on('SIGINT', () => gracefulShutdown(server));
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

export { startServer };