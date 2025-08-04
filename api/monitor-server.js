#!/usr/bin/env node

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class ServerMonitor {
  constructor() {
    this.serverUrl = 'http://localhost:8004/api/v1/sot';
    this.checkInterval = 30000; // 30 seconds
    this.maxFailures = 3;
    this.failureCount = 0;
    this.isRestarting = false;
    this.logFile = path.join(__dirname, 'server-monitor.log');
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(logMessage.trim());
    fs.appendFileSync(this.logFile, logMessage);
  }

  async checkServerHealth() {
    return new Promise((resolve) => {
      const req = http.get(this.serverUrl, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          resolve(false);
        }
      });

      req.on('error', () => {
        resolve(false);
      });

      req.setTimeout(5000, () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  async restartServer() {
    if (this.isRestarting) {
      this.log('Server restart already in progress...');
      return;
    }

    this.isRestarting = true;
    this.log('Restarting API server...');

    try {
      // Kill existing server process
      const { exec } = require('child_process');
      exec('pkill -f "ts-node.*server.ts"', (error) => {
        if (error) {
          this.log(`Error killing server: ${error.message}`);
        }
      });

      // Wait a moment for the process to be killed
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Start the server again
      const serverProcess = spawn('npm', ['run', 'dev'], {
        cwd: __dirname,
        stdio: 'inherit'
      });

      serverProcess.on('error', (error) => {
        this.log(`Error starting server: ${error.message}`);
      });

      // Wait for server to start
      await new Promise(resolve => setTimeout(resolve, 10000));

      this.log('Server restart completed');
      this.failureCount = 0;
    } catch (error) {
      this.log(`Error during server restart: ${error.message}`);
    } finally {
      this.isRestarting = false;
    }
  }

  async startMonitoring() {
    this.log('Starting API server monitoring...');

    setInterval(async () => {
      const isHealthy = await this.checkServerHealth();

      if (isHealthy) {
        if (this.failureCount > 0) {
          this.log(`Server recovered after ${this.failureCount} failures`);
          this.failureCount = 0;
        }
      } else {
        this.failureCount++;
        this.log(`Server health check failed (${this.failureCount}/${this.maxFailures})`);

        if (this.failureCount >= this.maxFailures) {
          this.log('Server appears to be down, attempting restart...');
          await this.restartServer();
        }
      }
    }, this.checkInterval);
  }
}

// Start monitoring if this script is run directly
if (require.main === module) {
  const monitor = new ServerMonitor();
  monitor.startMonitoring();
}

module.exports = ServerMonitor; 