# Backend Crash Prevention and Fixes

## Issues Identified and Fixed

### 1. **Critical: Unhandled Promise Rejection Handler**
**Problem**: The unhandled rejection handler was throwing errors, causing crashes.
**Location**: `src/middlewares/errors/unhandledRejection.ts`

**Fix**: 
- Changed from throwing errors to logging them
- Added proper error logging with stack traces
- Only exit process in production to prevent infinite restart loops

### 2. **Memory Leaks in Transaction Processing**
**Problem**: Potential memory accumulation in transaction screening service.
**Location**: `src/services/transactionScreening.service.ts`

**Fix**:
- Added better error handling for individual address processing
- Prevented single address failures from stopping entire process
- Added garbage collection between batches
- Improved error boundaries

### 3. **Distributed Lock Service Crashes**
**Problem**: Database errors in lock acquisition could crash the server.
**Location**: `src/services/distributedLock.service.ts`

**Fix**:
- Added error logging instead of throwing
- Prevented lock errors from crashing the server
- Better error handling for MongoDB connection issues

### 4. **Process Monitoring and Graceful Shutdown**
**Problem**: No monitoring of server health and poor shutdown handling.
**Location**: `src/server.ts`

**Fix**:
- Added memory usage monitoring
- Added event loop lag detection
- Improved graceful shutdown with proper cleanup
- Added process monitoring with alerts

## New Monitoring Tools

### 1. **Server Monitor Script**
**File**: `monitor-server.js`
**Purpose**: Automatically detect and restart crashed servers
**Features**:
- Health checks every 30 seconds
- Automatic restart after 3 consecutive failures
- Logging of all monitoring activities
- Prevents multiple simultaneous restarts

### 2. **Process Monitoring**
**Features**:
- Memory usage tracking (alerts at 500MB)
- Event loop lag detection (alerts at 100ms)
- Automatic logging of performance issues

## Usage

### Start Server with Monitoring
```bash
# Start with automatic monitoring and restart
npm run dev:monitored

# Or run monitor separately
npm run monitor
```

### Manual Health Check
```bash
curl http://localhost:8004/api/v1/sot
```

## Prevention Measures

### 1. **Error Handling**
- All async operations now have proper try-catch blocks
- Unhandled rejections are logged, not thrown
- Individual service failures don't crash the entire server

### 2. **Memory Management**
- Regular garbage collection in batch operations
- Memory usage monitoring with alerts
- Proper cleanup of database connections

### 3. **Process Stability**
- Graceful shutdown handling
- Proper signal handling (SIGINT, SIGTERM)
- Prevention of multiple shutdown attempts

### 4. **Monitoring and Alerting**
- Automatic health checks
- Performance monitoring
- Automatic restart capabilities
- Comprehensive logging

## Configuration

### Environment Variables
- `ENABLE_CRON_JOBS`: Enable/disable cron jobs
- `ENABLE_PRODUCTION_CRON`: Enable cron jobs in production
- `NODE_ENV`: Environment (development/production)

### Monitoring Thresholds
- Memory usage: 500MB warning threshold
- Event loop lag: 100ms warning threshold
- Health check failures: 3 consecutive failures before restart

## Troubleshooting

### Check Server Status
```bash
lsof -i :8004
```

### View Monitor Logs
```bash
tail -f api/server-monitor.log
```

### Manual Restart
```bash
# Kill existing process
pkill -f "ts-node.*server.ts"

# Start fresh
npm run dev
```

## Future Improvements

1. **Add Metrics Collection**: Implement Prometheus metrics
2. **Enhanced Logging**: Structured logging with correlation IDs
3. **Circuit Breaker**: Add circuit breaker pattern for external services
4. **Health Endpoint**: Add dedicated health check endpoint
5. **Load Balancing**: Consider multiple server instances for high availability 