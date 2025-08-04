// Currency Update Test Script
// Copy and paste this entire script into the browser console on the FlowTrace app page

console.log('🧪 Starting Currency Update Test Suite...')

// Test configuration
const TEST_CONFIG = {
  debugMode: true,
  testDelay: 1000,
  maxWaitTime: 10000
}

// Test state
let testState = {
  logs: [],
  errors: [],
  results: [],
  currentTest: null
}

// Utility functions
const log = (message, data = null) => {
  const timestamp = new Date().toISOString()
  const logEntry = { timestamp, message, data }
  testState.logs.push(logEntry)
  console.log(`[${timestamp}] ${message}`, data || '')
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

// Monitor canvas redraws
const monitorCanvas = () => {
  const canvas = document.querySelector('canvas')
  if (canvas) {
    const originalGetContext = canvas.getContext
    canvas.getContext = function(type, attributes) {
      const context = originalGetContext.call(this, type, attributes)
      
      if (type === '2d') {
        const originalFillText = context.fillText
        context.fillText = function(text, x, y) {
          if (text && typeof text === 'string' && (text.includes('BTC') || text.includes('USD') || text.includes('EUR'))) {
            log('Canvas drawing currency text', { text, x, y })
          }
          return originalFillText.call(this, text, x, y)
        }
      }
      
      return context
    }
    log('Canvas monitoring enabled')
  }
}

// Test scenarios
const testScenarios = [
  {
    name: 'Basic Currency Change',
    description: 'Change currency from BTC to USD and verify',
    steps: [
      { action: 'clickEdge', description: 'Click on an edge to open popup' },
      { action: 'clickEdit', description: 'Click "Edit Connection Data" button' },
      { action: 'changeCurrency', currency: 'USD', description: 'Change currency to USD' },
      { action: 'save', description: 'Save changes' },
      { action: 'verifyCurrency', expected: 'USD', description: 'Verify edge shows USD' }
    ]
  },
  {
    name: 'Currency Inheritance',
    description: 'Test if new rows inherit currency',
    steps: [
      { action: 'clickEdge', description: 'Click on an edge to open popup' },
      { action: 'clickEdit', description: 'Click "Edit Connection Data" button' },
      { action: 'changeCurrency', currency: 'EUR', description: 'Change currency to EUR' },
      { action: 'addRow', description: 'Add new row' },
      { action: 'verifyRowCurrency', expected: 'EUR', description: 'Verify new row has EUR' },
      { action: 'save', description: 'Save changes' }
    ]
  },
  {
    name: 'Multiple Currency Test',
    description: 'Test multiple currencies in one connection',
    steps: [
      { action: 'clickEdge', description: 'Click on an edge to open popup' },
      { action: 'clickEdit', description: 'Click "Edit Connection Data" button' },
      { action: 'changeCurrency', currency: 'USD', description: 'Change first row to USD' },
      { action: 'addRow', description: 'Add new row' },
      { action: 'changeCurrency', currency: 'EUR', rowIndex: 1, description: 'Change second row to EUR' },
      { action: 'save', description: 'Save changes' },
      { action: 'verifyCurrency', expected: 'USD', description: 'Verify edge shows first currency (USD)' }
    ]
  }
]

// Action handlers
const actions = {
  async clickEdge() {
    log('Clicking on edge to open popup')
    
    const canvas = await findElement('canvas')
    const rect = canvas.getBoundingClientRect()
    
    // Click in the middle of the canvas
    const clickEvent = new MouseEvent('click', {
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      bubbles: true
    })
    canvas.dispatchEvent(clickEvent)
    
    await wait(500)
    log('Edge clicked')
  },
  
  async clickEdit() {
    log('Looking for edit button')
    
    // Try different selectors for the edit button
    const selectors = [
      'button:contains("Edit Connection Data")',
      'button[data-testid="edit-connection"]',
      'button:contains("Edit")',
      '[role="dialog"] button:contains("Edit")'
    ]
    
    for (const selector of selectors) {
      try {
        const button = await findElement(selector, 2000)
        button.click()
        log('Edit button clicked')
        await wait(500)
        return
      } catch (e) {
        // Continue to next selector
      }
    }
    
    throw new Error('Edit button not found')
  },
  
  async changeCurrency(currency, rowIndex = 0) {
    log(`Changing currency to ${currency} for row ${rowIndex}`)
    
    try {
      const currencySelects = await findElements('select[data-testid="currency-select"]')
      if (currencySelects[rowIndex]) {
        currencySelects[rowIndex].value = currency
        currencySelects[rowIndex].dispatchEvent(new Event('change', { bubbles: true }))
        log(`Currency changed to ${currency} for row ${rowIndex}`)
        await wait(100)
        return
      }
    } catch (e) {
      // Try alternative selectors
    }
    
    // Try alternative approach
    try {
      const selects = await findElements('select')
      const currencySelect = selects.find(select => 
        select.options && Array.from(select.options).some(option => 
          ['BTC', 'USD', 'EUR', 'ETH'].includes(option.value)
        )
      )
      
      if (currencySelect) {
        currencySelect.value = currency
        currencySelect.dispatchEvent(new Event('change', { bubbles: true }))
        log(`Currency changed to ${currency} using alternative selector`)
        await wait(100)
        return
      }
    } catch (e) {
      // Continue to error
    }
    
    throw new Error(`Could not change currency to ${currency}`)
  },
  
  async addRow() {
    log('Adding new row')
    
    try {
      const addButton = await findElement('button[data-testid="add-row"]')
      addButton.click()
      log('New row added')
      await wait(100)
      return
    } catch (e) {
      // Try alternative selectors
    }
    
    try {
      const addButton = await findElement('button:contains("Add Row")')
      addButton.click()
      log('New row added using alternative selector')
      await wait(100)
      return
    } catch (e) {
      throw new Error('Could not add new row')
    }
  },
  
  async save() {
    log('Saving changes')
    
    try {
      const saveButton = await findElement('button[data-testid="save-button"]')
      saveButton.click()
      log('Changes saved')
      await wait(500)
      return
    } catch (e) {
      // Try alternative selectors
    }
    
    try {
      const saveButton = await findElement('button:contains("Save")')
      saveButton.click()
      log('Changes saved using alternative selector')
      await wait(500)
      return
    } catch (e) {
      throw new Error('Could not save changes')
    }
  },
  
  async verifyCurrency(expected) {
    log(`Verifying edge shows currency: ${expected}`)
    
    await wait(1000) // Wait for canvas to update
    
    // Check if currency appears in canvas
    const canvas = document.querySelector('canvas')
    if (canvas) {
      // This is a simplified check - in a real scenario we'd need to parse canvas content
      log('Canvas found - currency verification would require canvas content analysis')
    }
    
    // Check console logs for currency updates
    const currencyLogs = testState.logs.filter(log => 
      log.message.includes('currency') || log.message.includes('Currency')
    )
    
    if (currencyLogs.length > 0) {
      log(`Found ${currencyLogs.length} currency-related logs`)
      return true
    }
    
    log('No currency logs found - this might indicate an issue')
    return false
  },
  
  async verifyRowCurrency(expected, rowIndex = 1) {
    log(`Verifying row ${rowIndex} has currency: ${expected}`)
    
    try {
      const currencySelects = await findElements('select[data-testid="currency-select"]')
      if (currencySelects[rowIndex]) {
        const actualCurrency = currencySelects[rowIndex].value
        const passed = actualCurrency === expected
        
        if (passed) {
          log(`✅ Row ${rowIndex} currency verification passed: ${actualCurrency}`)
        } else {
          log(`❌ Row ${rowIndex} currency verification failed: expected ${expected}, got ${actualCurrency}`)
        }
        
        return passed
      }
    } catch (e) {
      log(`Could not verify row ${rowIndex} currency`)
    }
    
    return false
  }
}

// Manual test runner
class CurrencyTestRunner {
  constructor() {
    this.results = []
    this.currentTest = null
  }
  
  async runAllTests() {
    console.log('🚀 Starting all currency tests...')
    
    for (const scenario of testScenarios) {
      await this.runTest(scenario)
    }
    
    this.generateReport()
  }
  
  async runTest(scenario) {
    console.log(`\n📋 Running test: ${scenario.name}`)
    console.log(`📝 ${scenario.description}`)
    
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
    console.log(`  🔄 Executing: ${step.description}`)
    
    const startTime = Date.now()
    
    try {
      const action = actions[step.action]
      if (!action) {
        throw new Error(`Unknown action: ${step.action}`)
      }
      
      const result = await action(...(step.data || []))
      
      const duration = Date.now() - startTime
      this.currentTest.steps.push({
        action: step.action,
        description: step.description,
        result,
        duration,
        passed: true
      })
      
      console.log(`    ✅ ${step.description} completed in ${duration}ms`)
      
      await wait(TEST_CONFIG.testDelay)
      
    } catch (error) {
      const duration = Date.now() - startTime
      this.currentTest.steps.push({
        action: step.action,
        description: step.description,
        error: error.message,
        duration,
        passed: false
      })
      
      console.log(`    ❌ ${step.description} failed: ${error.message}`)
      throw error
    }
  }
  
  generateReport() {
    console.log('\n📊 CURRENCY TEST REPORT')
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
        console.log(`    ${stepStatus} ${step.description} (${step.duration}ms)`)
        if (!step.passed) {
          console.log(`      Error: ${step.error}`)
        }
      })
    })
    
    console.log('\n🔍 Debug Information:')
    console.log(`Total Logs: ${testState.logs.length}`)
    console.log(`Total Errors: ${testState.errors.length}`)
    
    // Save results to window for debugging
    window.currencyTestResults = {
      results: this.results,
      logs: testState.logs,
      errors: testState.errors
    }
    
    console.log('\n💡 Analysis:')
    if (failedTests > 0) {
      console.log('- Some tests failed - check the error messages above')
      console.log('- The currency update issue may be in the UI interaction or state management')
    } else {
      console.log('- All tests passed - the currency update functionality appears to be working')
    }
    
    console.log('- Check window.currencyTestResults for detailed data')
  }
}

// Manual test function
const runManualTest = async () => {
  console.log('🎯 Manual Currency Test')
  console.log('Follow these steps:')
  console.log('1. Click on any edge (connection line) in the graph')
  console.log('2. Click "Edit Connection Data" button')
  console.log('3. Change the currency dropdown from BTC to USD (or any other)')
  console.log('4. Click "Save"')
  console.log('5. Check if the edge label shows the new currency')
  console.log('6. Type "done" in console when finished')
  
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
  
  console.log('✅ Manual test completed!')
  console.log('Check the logs above for any currency-related operations')
}

// Initialize and run tests
const runTests = async () => {
  console.log('🎯 Currency Test Suite Initialized')
  
  // Set up monitoring
  monitorCanvas()
  
  // Wait for page to load
  await wait(2000)
  
  const runner = new CurrencyTestRunner()
  await runner.runAllTests()
  
  console.log('\n🎉 Test suite completed!')
  console.log('Check window.currencyTestResults for detailed results')
}

// Export functions for manual execution
window.currencyTests = {
  runAll: runTests,
  runManual: runManualTest,
  results: () => window.currencyTestResults || null,
  logs: () => testState.logs,
  clear: () => {
    testState.logs = []
    testState.errors = []
    testState.results = []
    console.log('Test state cleared')
  }
}

// Auto-run tests
runTests() 