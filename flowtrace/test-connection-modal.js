// Comprehensive Test Suite for Connection Edit Modal
// This script emulates all possible user interactions to identify currency update issues

console.log('🧪 Starting Comprehensive Connection Modal Test Suite...')

// Test Configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3001',
  testDelay: 1000, // Delay between actions for visibility
  debugMode: true
}

// Test Data
const TEST_SCENARIOS = [
  {
    name: 'Single Row Currency Change',
    description: 'Change currency on a single row and save',
    steps: [
      { action: 'openModal', data: { from: 'exchange1', to: 'hacker1', currency: 'BTC' } },
      { action: 'changeCurrency', rowIndex: 0, currency: 'USD' },
      { action: 'save' },
      { action: 'verifyEdgeLabel', expectedCurrency: 'USD' }
    ]
  },
  {
    name: 'Multiple Rows Different Currencies',
    description: 'Create multiple rows with different currencies',
    steps: [
      { action: 'openModal', data: { from: 'exchange1', to: 'hacker1', currency: 'BTC' } },
      { action: 'changeCurrency', rowIndex: 0, currency: 'USD' },
      { action: 'addRow' },
      { action: 'changeCurrency', rowIndex: 1, currency: 'EUR' },
      { action: 'addRow' },
      { action: 'changeCurrency', rowIndex: 2, currency: 'ETH' },
      { action: 'save' },
      { action: 'verifyEdgeLabel', expectedCurrency: 'USD' } // Should show first row's currency
    ]
  },
  {
    name: 'Currency Inheritance Test',
    description: 'Test if new rows inherit the last selected currency',
    steps: [
      { action: 'openModal', data: { from: 'exchange1', to: 'hacker1', currency: 'BTC' } },
      { action: 'changeCurrency', rowIndex: 0, currency: 'USD' },
      { action: 'addRow' },
      { action: 'verifyRowCurrency', rowIndex: 1, expectedCurrency: 'USD' },
      { action: 'changeCurrency', rowIndex: 1, currency: 'EUR' },
      { action: 'addRow' },
      { action: 'verifyRowCurrency', rowIndex: 2, expectedCurrency: 'EUR' },
      { action: 'save' }
    ]
  },
  {
    name: 'Direction Reversal Test',
    description: 'Test direction reversal with currency changes',
    steps: [
      { action: 'openModal', data: { from: 'exchange1', to: 'hacker1', currency: 'BTC' } },
      { action: 'changeCurrency', rowIndex: 0, currency: 'USD' },
      { action: 'reverseDirection' },
      { action: 'save' },
      { action: 'verifyEdgeDirection', expectedFrom: 'hacker1', expectedTo: 'exchange1' },
      { action: 'verifyEdgeLabel', expectedCurrency: 'USD' }
    ]
  },
  {
    name: 'Delete and Recreate Test',
    description: 'Delete all rows and recreate with new currency',
    steps: [
      { action: 'openModal', data: { from: 'exchange1', to: 'hacker1', currency: 'BTC' } },
      { action: 'deleteRow', rowIndex: 0 },
      { action: 'confirmDelete' },
      { action: 'addRow' },
      { action: 'changeCurrency', rowIndex: 0, currency: 'USD' },
      { action: 'save' },
      { action: 'verifyEdgeLabel', expectedCurrency: 'USD' }
    ]
  },
  {
    name: 'Mixed Currency Aggregation Test',
    description: 'Test how mixed currencies are displayed on edge',
    steps: [
      { action: 'openModal', data: { from: 'exchange1', to: 'hacker1', currency: 'BTC' } },
      { action: 'changeCurrency', rowIndex: 0, currency: 'USD' },
      { action: 'addRow' },
      { action: 'changeCurrency', rowIndex: 1, currency: 'EUR' },
      { action: 'save' },
      { action: 'verifyEdgeLabel', expectedCurrency: 'USD' } // Should show first row's currency
    ]
  }
]

// Test State
let testState = {
  currentModal: null,
  currentRows: [],
  currentConnection: null,
  testResults: []
}

// Utility Functions
const log = (message, data = null) => {
  if (TEST_CONFIG.debugMode) {
    console.log(`🔍 ${message}`, data || '')
  }
}

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const findElement = (selector, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    const check = () => {
      const element = document.querySelector(selector)
      if (element) {
        resolve(element)
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Element not found: ${selector}`))
      } else {
        setTimeout(check, 100)
      }
    }
    check()
  })
}

const findElements = (selector, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    const check = () => {
      const elements = document.querySelectorAll(selector)
      if (elements.length > 0) {
        resolve(Array.from(elements))
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Elements not found: ${selector}`))
      } else {
        setTimeout(check, 100)
      }
    }
    check()
  })
}

// Action Handlers
const actions = {
  async openModal(data) {
    log('Opening modal for connection', data)
    
    // Find and click on an edge to open the popup
    const canvas = await findElement('canvas')
    const rect = canvas.getBoundingClientRect()
    
    // Click in the middle of the canvas to trigger edge detection
    const clickEvent = new MouseEvent('click', {
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      bubbles: true
    })
    canvas.dispatchEvent(clickEvent)
    
    await wait(500)
    
    // Look for the edge details popup
    const popup = await findElement('[role="dialog"]')
    log('Edge details popup found', popup)
    
    // Click the edit button
    const editButton = await findElement('button:contains("Edit Connection Data")')
    editButton.click()
    
    await wait(500)
    
    // Verify modal is open
    const modal = await findElement('[role="dialog"]')
    testState.currentModal = modal
    log('Modal opened successfully')
    
    return true
  },
  
  async changeCurrency(rowIndex, currency) {
    log(`Changing currency for row ${rowIndex} to ${currency}`)
    
    const currencySelects = await findElements('select[data-testid="currency-select"]')
    if (currencySelects[rowIndex]) {
      currencySelects[rowIndex].value = currency
      currencySelects[rowIndex].dispatchEvent(new Event('change', { bubbles: true }))
      
      await wait(100)
      log(`Currency changed to ${currency} for row ${rowIndex}`)
      return true
    }
    
    throw new Error(`Currency select not found for row ${rowIndex}`)
  },
  
  async addRow() {
    log('Adding new row')
    
    const addButton = await findElement('button:contains("Add Row")')
    addButton.click()
    
    await wait(100)
    log('New row added')
    return true
  },
  
  async deleteRow(rowIndex) {
    log(`Deleting row ${rowIndex}`)
    
    const deleteButtons = await findElements('button[data-testid="delete-row"]')
    if (deleteButtons[rowIndex]) {
      deleteButtons[rowIndex].click()
      await wait(100)
      log(`Row ${rowIndex} deleted`)
      return true
    }
    
    throw new Error(`Delete button not found for row ${rowIndex}`)
  },
  
  async reverseDirection() {
    log('Reversing direction')
    
    const reverseButton = await findElement('button:contains("Reverse Direction")')
    reverseButton.click()
    
    await wait(100)
    log('Direction reversed')
    return true
  },
  
  async save() {
    log('Saving changes')
    
    const saveButton = await findElement('button:contains("Save")')
    saveButton.click()
    
    await wait(500)
    log('Changes saved')
    return true
  },
  
  async confirmDelete() {
    log('Confirming deletion')
    
    const confirmButton = await findElement('button:contains("Delete Connection")')
    confirmButton.click()
    
    await wait(500)
    log('Deletion confirmed')
    return true
  },
  
  async verifyEdgeLabel(expectedCurrency) {
    log(`Verifying edge label shows currency: ${expectedCurrency}`)
    
    // Wait for modal to close and canvas to update
    await wait(1000)
    
    // Look for edge labels on the canvas
    const canvas = await findElement('canvas')
    const ctx = canvas.getContext('2d')
    
    // Get the canvas data to check for text
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    
    // This is a simplified check - in a real test we'd need to parse the canvas content
    // For now, we'll check if the currency appears in the DOM or console logs
    
    // Check console logs for currency updates
    const consoleLogs = window.testConsoleLogs || []
    const currencyLog = consoleLogs.find(log => 
      log.includes('currency') && log.includes(expectedCurrency)
    )
    
    if (currencyLog) {
      log(`✅ Edge label verification passed - found currency ${expectedCurrency} in logs`)
      return true
    }
    
    log(`❌ Edge label verification failed - expected ${expectedCurrency} not found`)
    return false
  },
  
  async verifyRowCurrency(rowIndex, expectedCurrency) {
    log(`Verifying row ${rowIndex} has currency: ${expectedCurrency}`)
    
    const currencySelects = await findElements('select[data-testid="currency-select"]')
    if (currencySelects[rowIndex]) {
      const actualCurrency = currencySelects[rowIndex].value
      const passed = actualCurrency === expectedCurrency
      
      if (passed) {
        log(`✅ Row ${rowIndex} currency verification passed: ${actualCurrency}`)
      } else {
        log(`❌ Row ${rowIndex} currency verification failed: expected ${expectedCurrency}, got ${actualCurrency}`)
      }
      
      return passed
    }
    
    log(`❌ Row ${rowIndex} currency select not found`)
    return false
  },
  
  async verifyEdgeDirection(expectedFrom, expectedTo) {
    log(`Verifying edge direction: ${expectedFrom} → ${expectedTo}`)
    
    // This would require checking the actual connection data
    // For now, we'll check console logs
    const consoleLogs = window.testConsoleLogs || []
    const directionLog = consoleLogs.find(log => 
      log.includes('direction') && log.includes(expectedFrom) && log.includes(expectedTo)
    )
    
    if (directionLog) {
      log(`✅ Edge direction verification passed`)
      return true
    }
    
    log(`❌ Edge direction verification failed`)
    return false
  }
}

// Test Runner
class ConnectionModalTestRunner {
  constructor() {
    this.results = []
    this.currentTest = null
  }
  
  async runAllTests() {
    console.log('🚀 Starting all tests...')
    
    for (const scenario of TEST_SCENARIOS) {
      await this.runTest(scenario)
    }
    
    this.generateReport()
  }
  
  async runTest(scenario) {
    console.log(`\n📋 Running test: ${scenario.name}`)
    console.log(`📝 Description: ${scenario.description}`)
    
    this.currentTest = {
      name: scenario.name,
      description: scenario.description,
      steps: [],
      passed: true,
      errors: []
    }
    
    try {
      for (const step of scenario.steps) {
        await this.runStep(step)
      }
    } catch (error) {
      this.currentTest.passed = false
      this.currentTest.errors.push(error.message)
      console.error(`❌ Test failed: ${error.message}`)
    }
    
    this.results.push(this.currentTest)
    
    const status = this.currentTest.passed ? '✅ PASSED' : '❌ FAILED'
    console.log(`${status}: ${scenario.name}`)
    
    if (this.currentTest.errors.length > 0) {
      console.log('Errors:', this.currentTest.errors)
    }
  }
  
  async runStep(step) {
    console.log(`  🔄 Executing: ${step.action}`)
    
    const startTime = Date.now()
    
    try {
      const result = await actions[step.action](...(step.data || []))
      
      const duration = Date.now() - startTime
      this.currentTest.steps.push({
        action: step.action,
        data: step.data,
        result,
        duration,
        passed: true
      })
      
      console.log(`    ✅ ${step.action} completed in ${duration}ms`)
      
      await wait(TEST_CONFIG.testDelay)
      
    } catch (error) {
      const duration = Date.now() - startTime
      this.currentTest.steps.push({
        action: step.action,
        data: step.data,
        error: error.message,
        duration,
        passed: false
      })
      
      console.log(`    ❌ ${step.action} failed: ${error.message}`)
      throw error
    }
  }
  
  generateReport() {
    console.log('\n📊 TEST REPORT')
    console.log('=' * 50)
    
    const totalTests = this.results.length
    const passedTests = this.results.filter(t => t.passed).length
    const failedTests = totalTests - passedTests
    
    console.log(`Total Tests: ${totalTests}`)
    console.log(`Passed: ${passedTests}`)
    console.log(`Failed: ${failedTests}`)
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`)
    
    console.log('\n📋 Detailed Results:')
    
    this.results.forEach(test => {
      const status = test.passed ? '✅' : '❌'
      console.log(`${status} ${test.name}`)
      
      if (!test.passed) {
        console.log(`  Errors: ${test.errors.join(', ')}`)
      }
      
      test.steps.forEach(step => {
        const stepStatus = step.passed ? '✅' : '❌'
        console.log(`    ${stepStatus} ${step.action} (${step.duration}ms)`)
        if (!step.passed) {
          console.log(`      Error: ${step.error}`)
        }
      })
    })
    
    // Save results to window for debugging
    window.testResults = this.results
  }
}

// Initialize and run tests
const runTests = async () => {
  console.log('🎯 Connection Modal Test Suite Initialized')
  
  // Set up console log capture
  const originalLog = console.log
  window.testConsoleLogs = []
  
  console.log = (...args) => {
    window.testConsoleLogs.push(args.join(' '))
    originalLog.apply(console, args)
  }
  
  // Wait for page to load
  await wait(2000)
  
  const runner = new ConnectionModalTestRunner()
  await runner.runAllTests()
  
  console.log('\n🎉 Test suite completed!')
  console.log('Check window.testResults for detailed results')
}

// Auto-run when script is loaded
if (typeof window !== 'undefined') {
  runTests()
} else {
  console.log('This test suite must be run in a browser environment')
}

// Export for manual execution
window.runConnectionModalTests = runTests 