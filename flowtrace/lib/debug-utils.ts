// Debug utility for better console message handling

interface DebugMessage {
  type: 'error' | 'warn' | 'info' | 'log';
  message: string;
  timestamp: string;
  context?: string;
}

class DebugLogger {
  private messages: DebugMessage[] = [];
  private maxMessages = 50;

  log(message: string, context?: string) {
    this.addMessage('log', message, context);
  }

  error(message: string, context?: string) {
    this.addMessage('error', message, context);
  }

  warn(message: string, context?: string) {
    this.addMessage('warn', message, context);
  }

  info(message: string, context?: string) {
    this.addMessage('info', message, context);
  }

  private addMessage(type: DebugMessage['type'], message: string, context?: string) {
    const debugMessage: DebugMessage = {
      type,
      message: this.truncateMessage(message),
      timestamp: new Date().toISOString(),
      context
    };

    this.messages.push(debugMessage);
    
    // Keep only the last maxMessages
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages);
    }

    // Also log to console for immediate visibility
    console[type](`[${context || 'DEBUG'}] ${message}`);
  }

  private truncateMessage(message: string): string {
    if (message.length > 200) {
      return message.substring(0, 200) + '...';
    }
    return message;
  }

  getRecentMessages(count: number = 10): DebugMessage[] {
    return this.messages.slice(-count);
  }

  getErrors(): DebugMessage[] {
    return this.messages.filter(msg => msg.type === 'error');
  }

  getWarnings(): DebugMessage[] {
    return this.messages.filter(msg => msg.type === 'warn');
  }

  clear() {
    this.messages = [];
  }

  export(): string {
    return JSON.stringify(this.messages, null, 2);
  }
}

// Global debug logger instance
export const debugLogger = new DebugLogger();

// Helper function to capture React key errors specifically
export const captureReactKeyError = (error: string) => {
  const keyMatch = error.match(/Encountered two children with the same key, `([^`]+)`/);
  if (keyMatch) {
    debugLogger.error(`React Key Error: ${keyMatch[1]}`, 'React');
  } else {
    debugLogger.error(error, 'React');
  }
};

// Helper function to capture API errors specifically
export const captureApiError = (error: any, context: string) => {
  if (error?.message) {
    debugLogger.error(`API Error: ${error.message}`, context);
  } else {
    debugLogger.error(`API Error: ${JSON.stringify(error)}`, context);
  }
};

// Helper function to get a summary of recent issues
export const getDebugSummary = (): string => {
  const errors = debugLogger.getErrors();
  const warnings = debugLogger.getWarnings();
  
  let summary = `Debug Summary (${new Date().toLocaleString()})\n`;
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