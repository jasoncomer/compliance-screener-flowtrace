// Debug Capture Script - Run this in browser console to capture errors
// Usage: Copy and paste this into browser console, then call captureErrors()

(function() {
  let capturedErrors = [];
  let originalConsoleError = console.error;
  let originalConsoleWarn = console.warn;
  
  // Override console.error
  console.error = function(...args) {
    const errorMessage = args.join(' ');
    capturedErrors.push({
      type: 'error',
      message: errorMessage,
      timestamp: new Date().toISOString(),
      stack: new Error().stack
    });
    originalConsoleError.apply(console, args);
  };
  
  // Override console.warn
  console.warn = function(...args) {
    const warnMessage = args.join(' ');
    capturedErrors.push({
      type: 'warn',
      message: warnMessage,
      timestamp: new Date().toISOString(),
      stack: new Error().stack
    });
    originalConsoleWarn.apply(console, args);
  };
  
  // Function to get captured errors
  window.captureErrors = function() {
    return capturedErrors;
  };
  
  // Function to get error summary
  window.getErrorSummary = function() {
    const errors = capturedErrors.filter(e => e.type === 'error');
    const warnings = capturedErrors.filter(e => e.type === 'warn');
    
    let summary = `Error Summary (${new Date().toLocaleString()})\n`;
    summary += `Errors: ${errors.length}\n`;
    summary += `Warnings: ${warnings.length}\n\n`;
    
    if (errors.length > 0) {
      summary += 'Recent Errors:\n';
      errors.slice(-5).forEach(error => {
        summary += `- ${error.message}\n`;
      });
      summary += '\n';
    }
    
    if (warnings.length > 0) {
      summary += 'Recent Warnings:\n';
      warnings.slice(-5).forEach(warning => {
        summary += `- ${warning.message}\n`;
      });
    }
    
    return summary;
  };
  
  // Function to clear captured errors
  window.clearCapturedErrors = function() {
    capturedErrors = [];
    console.log('Captured errors cleared');
  };
  
  // Function to export errors as JSON
  window.exportErrors = function() {
    return JSON.stringify(capturedErrors, null, 2);
  };
  
  console.log('Debug capture script loaded!');
  console.log('Available functions:');
  console.log('- captureErrors() - Get all captured errors');
  console.log('- getErrorSummary() - Get formatted error summary');
  console.log('- clearCapturedErrors() - Clear captured errors');
  console.log('- exportErrors() - Export errors as JSON');
})(); 