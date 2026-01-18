# Deployment Guide: Intent-Driven Cold Outreach Agent

## Pre-Production Build (preprod-v1)

This document outlines the deployment process for the Intent-Driven Cold Outreach Agent in pre-production environment.

### Build Status
- ✅ All 116 tests passing (100% success rate)
- ✅ All 36 property-based tests validated
- ✅ Code locked at preprod-v1 tag
- ✅ Production build configuration ready

### Environment Configuration

#### Required Files
- `.env.example` - Template configuration file
- `.env.preprod` - Pre-production environment configuration

#### Environment Variables
```bash
# Core Configuration
PORT=3000
NODE_ENV=preprod
MASUMI_NETWORK=preprod

# Processing Configuration
PROCESSING_TIMEOUT=30000
MAX_REVISION_ATTEMPTS=3

# Performance Configuration
MAX_CONCURRENT_REQUESTS=10
CACHE_TTL_SECONDS=300
```

### Build Process

#### 1. Install Dependencies
```bash
npm install
```

#### 2. Run Production Build
```bash
npm run build:prod
```
This command:
- Runs linting checks
- Executes all 116 tests
- Compiles TypeScript to JavaScript
- Generates type declarations

#### 3. Start Application
```bash
# Pre-production environment
npm run start:preprod

# Or directly with Node.js
NODE_ENV=preprod node dist/index.js
```

### Verification Steps

#### 1. Health Check
The application should start without errors and display:
```
Intent-Driven Cold Outreach Agent v1.0.0
Environment: preprod
Port: 3000
Status: Ready
```

#### 2. API Validation
Test the main API endpoint:
```bash
# Example API call (adjust based on your API structure)
curl -X POST http://localhost:3000/api/process-outreach \
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

#### 3. Test Suite Validation
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# CI-friendly test run
npm run test:ci
```

### System Requirements

#### Runtime Requirements
- Node.js 16+ (recommended: Node.js 18+)
- Memory: 512MB minimum, 1GB recommended
- CPU: 1 core minimum, 2 cores recommended
- Disk: 100MB for application, 500MB for logs

#### Development Requirements
- TypeScript 5.0+
- Jest 29.5+
- ESLint 8.0+
- Prettier 3.0+

### Performance Characteristics

#### Processing Performance
- Average processing time: 50-200ms per request
- Memory usage: ~50MB baseline, ~100MB under load
- Concurrent request handling: Up to 10 simultaneous requests

#### Test Performance
- Full test suite: ~25 seconds
- Property-based tests: 100 iterations per property
- Coverage: 100% line coverage target

### Monitoring & Logging

#### Log Levels
- `error`: Critical errors requiring immediate attention
- `warn`: Warning conditions that should be monitored
- `info`: General operational information
- `debug`: Detailed debugging information (disabled in production)

#### Key Metrics to Monitor
- Request processing time
- Error rates by step in the 7-step workflow
- Memory usage trends
- Test execution results

### Troubleshooting

#### Common Issues

**Build Failures**
```bash
# Clean and rebuild
npm run clean
npm install
npm run build:prod
```

**Test Failures**
```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test suite
npm test -- --testPathPattern="integration"
```

**Runtime Errors**
- Check environment variables are properly set
- Verify Node.js version compatibility
- Review application logs for specific error details

### Security Considerations

#### Environment Security
- Never commit actual API keys to version control
- Use `.env.preprod` template for reviewers
- Rotate credentials regularly

#### Application Security
- Input validation on all API endpoints
- Rate limiting configured (100 requests per 15 minutes)
- CORS properly configured
- No sensitive data in logs

### Rollback Procedure

If issues are discovered:

1. **Immediate Rollback**
   ```bash
   git checkout previous-stable-tag
   npm run build:prod
   npm run start:preprod
   ```

2. **Investigate Issues**
   - Review logs
   - Run test suite
   - Check environment configuration

3. **Fix and Redeploy**
   - Apply fixes
   - Run full test suite
   - Create new tag
   - Deploy with verification

### Support Information

#### System Information
- Application: Intent-Driven Cold Outreach Agent
- Version: 1.0.0
- Build Tag: preprod-v1
- Node.js Target: ES2020
- TypeScript Version: 5.0+

#### Contact Information
- Technical Issues: Check logs and run diagnostics
- Build Issues: Verify Node.js version and dependencies
- Test Failures: Review test output and system requirements

---

**Deployment Checklist:**
- [ ] Git repository initialized
- [ ] Code tagged as preprod-v1
- [ ] Environment files created (.env.example, .env.preprod)
- [ ] All tests passing (116/116)
- [ ] Production build successful
- [ ] Application starts without errors
- [ ] API endpoints responding correctly
- [ ] Monitoring configured
- [ ] Documentation updated