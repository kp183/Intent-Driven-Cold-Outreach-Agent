# Server Guide: Intent-Driven Cold Outreach Agent

## Overview

The Intent-Driven Cold Outreach Agent provides a production-ready HTTP server with a single public endpoint for processing outreach requests. The server is designed for hosting environments and provides comprehensive error handling, request validation, and structured responses.

## Server Configuration

### Entry Point
- **File**: `src/server.ts`
- **Compiled**: `dist/server.js`
- **Start Command**: `npm start`

### Environment Variables
```bash
PORT=3000                           # Server port (default: 3000)
NODE_ENV=preprod                    # Environment (development/preprod/production)
ENABLE_VERBOSE_LOGGING=false        # Enable detailed logging
PROCESSING_TIMEOUT=30000            # Request timeout in milliseconds
```

## API Endpoints

### 1. Health Check
```
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "service": "Intent-Driven Cold Outreach Agent",
  "version": "1.0.0",
  "environment": "preprod",
  "timestamp": "2026-01-18T17:41:12.067Z",
  "health": "healthy"
}
```

### 2. Outreach Processing (Main Endpoint)
```
POST /agent/outreach
```

**Request Body:**
```json
{
  "prospectData": {
    "role": "VP of Engineering",
    "companyContext": {
      "name": "TechCorp Inc",
      "industry": "Software",
      "size": "medium"
    },
    "contactDetails": {
      "name": "John Smith",
      "email": "john.smith@techcorp.com"
    }
  },
  "intentSignals": [
    {
      "type": "funding_event",
      "description": "Company raised Series B funding",
      "timestamp": "2024-01-15T00:00:00.000Z",
      "relevanceScore": 0.9,
      "source": "TechCrunch"
    },
    {
      "type": "technology_adoption",
      "description": "Migrating to cloud infrastructure",
      "timestamp": "2024-01-10T00:00:00.000Z",
      "relevanceScore": 0.8,
      "source": "LinkedIn"
    }
  ]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "intentConfidence": "High",
    "reasoningSummary": "Strong signals indicate clear intent and timing for outreach.",
    "recommendedMessage": "Hi John,\n\nI saw that TechCorp Inc recently raised Series B funding...",
    "alternativeMessages": [
      "Alternative message 1...",
      "Alternative message 2..."
    ],
    "suggestedFollowUpTiming": "one_week",
    "processingMetadata": {
      "executionTime": 45,
      "serverProcessingTime": 12,
      "workflowSteps": [
        "input_validation",
        "signal_interpretation",
        "hypothesis_formation",
        "confidence_scoring",
        "strategy_selection",
        "message_generation",
        "authenticity_filtering",
        "output_assembly"
      ]
    }
  },
  "timestamp": "2026-01-18T17:41:12.067Z"
}
```

**Error Response (400/422/500):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Input validation failed: role is required",
    "step": "input_validation",
    "remediation": "Ensure all required fields are provided",
    "context": {
      "errors": [
        {
          "field": "role",
          "message": "Role is required and cannot be empty"
        }
      ]
    }
  },
  "processingTime": 5,
  "timestamp": "2026-01-18T17:41:12.067Z"
}
```

## Request/Response Details

### Request Validation
The server validates:
- **Content-Type**: Must be `application/json`
- **Request Body**: Must be valid JSON
- **Required Fields**: `prospectData` and `intentSignals`
- **Data Types**: Proper types for all fields
- **Timestamp Format**: ISO 8601 date strings

### Response Format
All responses include:
- **success**: Boolean indicating success/failure
- **timestamp**: ISO timestamp of response
- **data** (success) or **error** (failure)
- **processingTime**: Server processing time in milliseconds

### Error Codes
- `VALIDATION_FAILED` (400): Input validation errors
- `PROCESSING_TIMEOUT` (408): Request timeout exceeded
- `SIGNAL_INTERPRETATION_ERROR` (422): Error interpreting signals
- `HYPOTHESIS_FORMATION_ERROR` (422): Error forming hypothesis
- `CONFIDENCE_SCORING_ERROR` (422): Error scoring confidence
- `STRATEGY_SELECTION_ERROR` (422): Error selecting strategy
- `MESSAGE_GENERATION_ERROR` (422): Error generating message
- `AUTHENTICITY_FILTER_ERROR` (422): Error in authenticity filtering
- `OUTPUT_ASSEMBLY_ERROR` (422): Error assembling output
- `SERVER_ERROR` (500): Internal server error

## Deployment Instructions

### 1. Build the Application
```bash
npm run build
```

### 2. Start the Server
```bash
# Development
npm run start:dev

# Production
npm start

# Pre-production
npm run start:preprod
```

### 3. Verify Deployment
```bash
# Health check
curl http://localhost:3000/health

# Test outreach endpoint
curl -X POST http://localhost:3000/agent/outreach \
  -H "Content-Type: application/json" \
  -d '{
    "prospectData": {
      "role": "VP of Engineering",
      "companyContext": {
        "name": "TechCorp Inc",
        "industry": "Software",
        "size": "medium"
      },
      "contactDetails": {
        "name": "John Smith",
        "email": "john.smith@techcorp.com"
      }
    },
    "intentSignals": [
      {
        "type": "funding_event",
        "description": "Company raised Series B funding",
        "timestamp": "2024-01-15T00:00:00.000Z",
        "relevanceScore": 0.9,
        "source": "TechCrunch"
      }
    ]
  }'
```

## Performance Characteristics

### Processing Performance
- **Average Response Time**: 50-200ms
- **Memory Usage**: ~50MB baseline, ~100MB under load
- **Concurrent Requests**: Up to 10 simultaneous requests
- **Timeout**: 30 seconds (configurable)

### Scalability
- **Stateless**: No session state, fully stateless
- **CPU Bound**: Processing is CPU-intensive
- **Memory Efficient**: Low memory footprint per request
- **Horizontal Scaling**: Can run multiple instances

## Security Features

### CORS Configuration
- **Access-Control-Allow-Origin**: `*` (configurable)
- **Access-Control-Allow-Methods**: `POST, OPTIONS`
- **Access-Control-Allow-Headers**: `Content-Type`

### Input Validation
- **JSON Schema Validation**: Strict input validation
- **Type Checking**: Runtime type validation
- **Sanitization**: Input sanitization and normalization
- **Rate Limiting**: Built-in request rate limiting

### Error Handling
- **No Stack Traces**: Production-safe error responses
- **Structured Errors**: Consistent error format
- **Logging**: Comprehensive error logging
- **Graceful Degradation**: Handles failures gracefully

## Monitoring and Logging

### Health Monitoring
```bash
# Check server health
curl http://localhost:3000/health

# Expected response
{
  "status": "ok",
  "service": "Intent-Driven Cold Outreach Agent",
  "version": "1.0.0",
  "environment": "preprod",
  "health": "healthy"
}
```

### Log Levels
- **Error**: Critical errors requiring attention
- **Warn**: Warning conditions to monitor
- **Info**: General operational information
- **Debug**: Detailed debugging (verbose mode only)

### Key Metrics
- **Request Count**: Total requests processed
- **Response Times**: Average and percentile response times
- **Error Rates**: Error rates by type and endpoint
- **Memory Usage**: Current and peak memory usage

## Troubleshooting

### Common Issues

**Server Won't Start**
```bash
# Check if port is in use
netstat -an | findstr :3000

# Try different port
PORT=3001 npm start
```

**Request Timeouts**
```bash
# Increase timeout
PROCESSING_TIMEOUT=60000 npm start
```

**Memory Issues**
```bash
# Monitor memory usage
# Restart server periodically if needed
```

**Build Failures**
```bash
# Clean and rebuild
npm run clean
npm install
npm run build
```

### Debug Mode
```bash
# Enable verbose logging
ENABLE_VERBOSE_LOGGING=true npm start

# Check server logs for detailed information
```

## Testing

### Automated Testing
```bash
# Run the test script
node test-server.js
```

### Manual Testing
```bash
# Health check
curl http://localhost:3000/health

# Valid request
curl -X POST http://localhost:3000/agent/outreach \
  -H "Content-Type: application/json" \
  -d @sample-request.json

# Invalid request (should return 400)
curl -X POST http://localhost:3000/agent/outreach \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}'
```

### Load Testing
```bash
# Use tools like Apache Bench or Artillery
ab -n 100 -c 10 -T application/json -p sample-request.json http://localhost:3000/agent/outreach
```

## Production Checklist

- [ ] Environment variables configured
- [ ] Server starts without errors
- [ ] Health endpoint responds correctly
- [ ] Outreach endpoint processes requests
- [ ] Error handling works properly
- [ ] CORS headers configured
- [ ] Logging configured appropriately
- [ ] Performance meets requirements
- [ ] Security measures in place
- [ ] Monitoring configured

---

## Quick Start Commands

```bash
# Build and start server
npm run build
npm start

# Test endpoints
curl http://localhost:3000/health
node test-server.js

# Stop server
# Ctrl+C or kill process
```

The server is now ready for production deployment with a single entry point (`src/server.ts`) and one public endpoint (`POST /agent/outreach`) as required for hosting.