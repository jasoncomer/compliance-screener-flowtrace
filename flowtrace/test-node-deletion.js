// Test script for node deletion functionality
// Run this in the browser console to test the delete button

console.log('🧪 Testing Node Deletion Functionality...')

// Test configuration
const TEST_CONFIG = {
  testDelay: 500,
  debugMode: true
}

// Utility functions
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

// Test scenarios
const TEST_SCENARIOS = [
  {
    name: 'Basic Node Deletion',
    description: 'Select a node and click the red X to delete it',
    steps: [
      { action: 'findCanvas' },
      { action: 'clickOnNode', nodeType: 'target' },
      { action: 'verifyNodeSelected' },
      { action: 'clickDeleteButton' },
      { action: 'verifyConfirmationDialog' },
      { action: 'confirmDeletion' },
      { action: 'verifyNodeDeleted' }
    ]
  },
  {
    name: 'Delete Node with Connections',
    description: 'Delete a node that has connections to other nodes',
    steps: [
      { action: 'findCanvas' },
      { action: 'clickOnNode', nodeType: 'exchange' },
      { action: 'verifyNodeSelected' },
      { action: 'clickDeleteButton' },
      { action: 'verifyConfirmationDialog' },
      { action: 'confirmDeletion' },
      { action: 'verifyNodeAndConnectionsDeleted' }
    ]
  },
  {
    name: 'Cancel Deletion',
    description: 'Click delete button but cancel the confirmation',
    steps: [
      { action: 'findCanvas' },
      { action: 'clickOnNode', nodeType: 'hacker' },
      { action: 'verifyNodeSelected' },
      { action: 'clickDeleteButton' },
      { action: 'verifyConfirmationDialog' },
      { action: 'cancelDeletion' },
      { action: 'verifyNodeStillExists' }
    ]
  }
]

// Test actions
const actions = {
  async findCanvas() {
    log('Finding canvas element')
    const canvas = await findElement('canvas')
    log('Canvas found', canvas)
    return canvas
  },

  async clickOnNode(nodeType) {
    log(`Clicking on ${nodeType} node`)
    
    const canvas = await findElement('canvas')
    const rect = canvas.getBoundingClientRect()
    
    // Click in the middle of the canvas to find a node
    const clickEvent = new MouseEvent('click', {
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      bubbles: true
    })
    canvas.dispatchEvent(clickEvent)
    
    await wait(TEST_CONFIG.testDelay)
    log(`Clicked on canvas to find ${nodeType} node`)
    return true
  },

  async verifyNodeSelected() {
    log('Verifying node is selected')
    
    // Check if any node has the selected state by looking for console logs
    const consoleLogs = window.testConsoleLogs || []
    const selectionLog = consoleLogs.find(log => 
      log.includes('selectedNode') || log.includes('node selected')
    )
    
    if (selectionLog) {
      log('✅ Node selection verified')
      return true
    }
    
    log('❌ Node selection not verified')
    return false
  },

  async clickDeleteButton() {
    log('Clicking delete button (red X)')
    
    const canvas = await findElement('canvas')
    const rect = canvas.getBoundingClientRect()
    
    // Click in the top-left area where delete button should be
    const clickEvent = new MouseEvent('click', {
      clientX: rect.left + 50,
      clientY: rect.top + 50,
      bubbles: true
    })
    canvas.dispatchEvent(clickEvent)
    
    await wait(TEST_CONFIG.testDelay)
    log('Clicked in delete button area')
    return true
  },

  async verifyConfirmationDialog() {
    log('Verifying confirmation dialog appears')
    
    const dialog = await findElement('[role="dialog"]')
    const dialogTitle = dialog.querySelector('[data-radix-dialog-title]')
    
    if (dialogTitle && dialogTitle.textContent?.includes('Delete Node')) {
      log('✅ Confirmation dialog verified')
      return true
    }
    
    log('❌ Confirmation dialog not found')
    return false
  },

  async confirmDeletion() {
    log('Confirming deletion')
    
    const confirmButton = await findElement('button:contains("Delete Node")')
    confirmButton.click()
    
    await wait(TEST_CONFIG.testDelay)
    log('Deletion confirmed')
    return true
  },

  async cancelDeletion() {
    log('Canceling deletion')
    
    const cancelButton = await findElement('button:contains("Cancel")')
    cancelButton.click()
    
    await wait(TEST_CONFIG.testDelay)
    log('Deletion canceled')
    return true
  },

  async verifyNodeDeleted() {
    log('Verifying node was deleted')
    
    // Check console logs for deletion confirmation
    const consoleLogs = window.testConsoleLogs || []
    const deletionLog = consoleLogs.find(log => 
      log.includes('🗑️') && log.includes('Deleting node')
    )
    
    if (deletionLog) {
      log('✅ Node deletion verified')
      return true
    }
    
    log('❌ Node deletion not verified')
    return false
  },

  async verifyNodeAndConnectionsDeleted() {
    log('Verifying node and connections were deleted')
    
    const consoleLogs = window.testConsoleLogs || []
    const connectionDeletionLog = consoleLogs.find(log => 
      log.includes('Connections after deletion')
    )
    
    if (connectionDeletionLog) {
      log('✅ Node and connections deletion verified')
      return true
    }
    
    log('❌ Node and connections deletion not verified')
    return false
  },

  async verifyNodeStillExists() {
    log('Verifying node still exists after cancellation')
    
    // Check that no deletion occurred
    const consoleLogs = window.testConsoleLogs || []
    const deletionLog = consoleLogs.find(log => 
      log.includes('🗑️') && log.includes('Deleting node')
    )
    
    if (!deletionLog) {
      log('✅ Node still exists after cancellation')
      return true
    }
    
    log('❌ Node was deleted despite cancellation')
    return false
  }
}

// Test runner
class NodeDeletionTestRunner {
  constructor() {
    this.results = []
  }
  
  async runAllTests() {
    console.log('🚀 Starting node deletion tests...')
    
    for (const scenario of TEST_SCENARIOS) {
      await this.runTest(scenario)
    }
    
    this.generateReport()
  }
  
  async runTest(scenario) {
    console.log(`\n📋 Running test: ${scenario.name}`)
    console.log(`📝 Description: ${scenario.description}`)
    
    const testResult = {
      name: scenario.name,
      description: scenario.description,
      steps: [],
      passed: true,
      errors: []
    }
    
    try {
      for (const step of scenario.steps) {
        await this.runStep(step, testResult)
      }
    } catch (error) {
      testResult.passed = false
      testResult.errors.push(error.message)
      console.error(`❌ Test failed: ${error.message}`)
    }
    
    this.results.push(testResult)
    
    const status = testResult.passed ? '✅ PASSED' : '❌ FAILED'
    console.log(`${status}: ${scenario.name}`)
    
    if (testResult.errors.length > 0) {
      console.log('Errors:', testResult.errors)
    }
  }
  
  async runStep(step, testResult) {
    console.log(`  🔄 Executing: ${step.action}`)
    
    const startTime = Date.now()
    
    try {
      const result = await actions[step.action](...(step.data || []))
      
      const duration = Date.now() - startTime
      testResult.steps.push({
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
      testResult.steps.push({
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
    console.log('\n📊 NODE DELETION TEST REPORT')
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
    window.nodeDeletionTestResults = this.results
  }
}

// Initialize and run tests
const runNodeDeletionTests = async () => {
  console.log('🎯 Node Deletion Test Suite Initialized')
  
  // Set up console log capture
  const originalLog = console.log
  window.testConsoleLogs = []
  
  console.log = (...args) => {
    window.testConsoleLogs.push(args.join(' '))
    originalLog.apply(console, args)
  }
  
  // Wait for page to load
  await wait(2000)
  
  const runner = new NodeDeletionTestRunner()
  await runner.runAllTests()
  
  console.log('\n🎉 Node deletion test suite completed!')
  console.log('Check window.nodeDeletionTestResults for detailed results')
}

// Auto-run when script is loaded
if (typeof window !== 'undefined') {
  runNodeDeletionTests()
} else {
  console.log('This test suite must be run in a browser environment')
}

// Export for manual execution
window.runNodeDeletionTests = runNodeDeletionTests 