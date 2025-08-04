// Debug Currency Issue Script
// This script helps identify where the currency update problem is occurring

console.log('🔍 Starting Currency Issue Debug...')

// Debug configuration
const DEBUG_CONFIG = {
  logAllStateChanges: true,
  logConnectionUpdates: true,
  logCanvasRedraws: true,
  monitorNetworkRequests: true
}

// State tracking
let debugState = {
  connectionUpdates: [],
  canvasRedraws: [],
  stateChanges: [],
  errors: []
}

// Utility functions
const log = (category, message, data = null) => {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    category,
    message,
    data
  }
  
  debugState[category].push(logEntry)
  
  console.log(`[${timestamp}] ${category.toUpperCase()}: ${message}`, data || '')
}

// Hook into console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn
}

console.log = (...args) => {
  const message = args.join(' ')
  if (message.includes('currency') || message.includes('Currency')) {
    log('currency', 'Console log', message)
  }
  originalConsole.log.apply(console, args)
}

console.error = (...args) => {
  const message = args.join(' ')
  log('errors', 'Console error', message)
  originalConsole.error.apply(console, args)
}

// Monitor connection state changes
const monitorConnectionState = () => {
  // Try to find the connections state in the React component
  const findConnectionsState = () => {
    // Look for React DevTools or component state
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      console.log('React DevTools found - can inspect component state')
    }
    
    // Look for any global state management
    if (window.store) {
      console.log('Global store found:', window.store)
    }
  }
  
  findConnectionsState()
}

// Monitor canvas redraws
const monitorCanvasRedraws = () => {
  const canvas = document.querySelector('canvas')
  if (canvas) {
    const originalGetContext = canvas.getContext
    canvas.getContext = function(type, attributes) {
      const context = originalGetContext.call(this, type, attributes)
      
      if (type === '2d') {
        const originalFillText = context.fillText
        context.fillText = function(text, x, y) {
          if (text && typeof text === 'string' && (text.includes('BTC') || text.includes('USD') || text.includes('EUR'))) {
            log('canvas', 'Drawing text with currency', { text, x, y })
          }
          return originalFillText.call(this, text, x, y)
        }
      }
      
      return context
    }
    
    log('canvas', 'Canvas monitoring enabled')
  }
}

// Monitor network requests
const monitorNetworkRequests = () => {
  if (window.fetch) {
    const originalFetch = window.fetch
    window.fetch = function(...args) {
      const url = args[0]
      if (typeof url === 'string' && url.includes('connection') || url.includes('currency')) {
        log('network', 'Fetch request', { url, args })
      }
      return originalFetch.apply(this, args)
    }
  }
  
  if (window.XMLHttpRequest) {
    const originalOpen = XMLHttpRequest.prototype.open
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      if (typeof url === 'string' && (url.includes('connection') || url.includes('currency'))) {
        log('network', 'XHR request', { method, url })
      }
      return originalOpen.call(this, method, url, ...args)
    }
  }
}

// Monitor DOM changes
const monitorDOMChanges = () => {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node
            if (element.textContent && element.textContent.includes('BTC')) {
              log('dom', 'BTC text found in DOM', element.textContent)
            }
            if (element.textContent && element.textContent.includes('USD')) {
              log('dom', 'USD text found in DOM', element.textContent)
            }
          }
        })
      }
    })
  })
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  })
  
  log('dom', 'DOM monitoring enabled')
}

// Monitor localStorage/sessionStorage
const monitorStorage = () => {
  const originalSetItem = Storage.prototype.setItem
  Storage.prototype.setItem = function(key, value) {
    if (key.includes('connection') || key.includes('currency')) {
      log('storage', 'Storage set', { key, value })
    }
    return originalSetItem.call(this, key, value)
  }
  
  const originalGetItem = Storage.prototype.getItem
  Storage.prototype.getItem = function(key) {
    const value = originalGetItem.call(this, key)
    if (key.includes('connection') || key.includes('currency')) {
      log('storage', 'Storage get', { key, value })
    }
    return value
  }
}

// Test currency update manually
const testCurrencyUpdate = async () => {
  console.log('\n🧪 Manual Currency Update Test')
  console.log('Follow these steps:')
  console.log('1. Click on an edge in the graph')
  console.log('2. Click "Edit Connection Data"')
  console.log('3. Change currency from BTC to USD')
  console.log('4. Click Save')
  console.log('5. Check the debug logs below')
  
  // Wait for user to complete the test
  await new Promise(resolve => {
    const checkComplete = () => {
      const input = prompt('Type "done" when you\'ve completed the currency change test:')
      if (input === 'done') {
        resolve()
      } else {
        console.log('Please type "done" when finished')
        checkComplete()
      }
    }
    checkComplete()
  })
  
  generateDebugReport()
}

// Generate debug report
const generateDebugReport = () => {
  console.log('\n📊 DEBUG REPORT')
  console.log('=' * 50)
  
  console.log('\n🔍 Connection Updates:')
  debugState.connectionUpdates.forEach(update => {
    console.log(`  [${update.timestamp}] ${update.message}`, update.data)
  })
  
  console.log('\n🎨 Canvas Redraws:')
  debugState.canvasRedraws.forEach(redraw => {
    console.log(`  [${redraw.timestamp}] ${redraw.message}`, redraw.data)
  })
  
  console.log('\n💰 Currency Logs:')
  debugState.currency.forEach(currency => {
    console.log(`  [${currency.timestamp}] ${currency.message}`, currency.data)
  })
  
  console.log('\n🌐 Network Requests:')
  debugState.network.forEach(network => {
    console.log(`  [${network.timestamp}] ${network.message}`, network.data)
  })
  
  console.log('\n💾 Storage Operations:')
  debugState.storage.forEach(storage => {
    console.log(`  [${storage.timestamp}] ${storage.message}`, storage.data)
  })
  
  console.log('\n❌ Errors:')
  debugState.errors.forEach(error => {
    console.log(`  [${error.timestamp}] ${error.message}`, error.data)
  })
  
  // Save to window for further analysis
  window.debugState = debugState
  
  console.log('\n💡 Analysis:')
  console.log('- Check if connection updates are being logged')
  console.log('- Check if canvas redraws show the correct currency')
  console.log('- Check if there are any errors during the update process')
  console.log('- Check if the state is being persisted correctly')
}

// Initialize debugging
const initDebugging = () => {
  console.log('🔧 Initializing currency debugging...')
  
  // Initialize state arrays
  Object.keys(debugState).forEach(key => {
    debugState[key] = []
  })
  
  // Set up monitoring
  monitorConnectionState()
  monitorCanvasRedraws()
  monitorNetworkRequests()
  monitorDOMChanges()
  monitorStorage()
  
  console.log('✅ Debugging initialized')
  console.log('All currency-related operations will be logged')
}

// Export functions
window.debugCurrencyIssue = {
  init: initDebugging,
  test: testCurrencyUpdate,
  report: generateDebugReport,
  state: debugState
}

// Auto-initialize
initDebugging()

// Start manual test after a delay
setTimeout(() => {
  testCurrencyUpdate()
}, 3000) 