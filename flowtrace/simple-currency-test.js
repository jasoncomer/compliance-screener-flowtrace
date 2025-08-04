// Simple Currency Test Script
// Run this in the browser console to test currency updates

console.log('🧪 Starting Simple Currency Test...')

// Test configuration
const TEST_DELAY = 2000 // 2 seconds between actions

// Utility functions
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

// Test scenarios
const testScenarios = [
  {
    name: 'Basic Currency Change',
    description: 'Change currency from BTC to USD and verify',
    steps: [
      'Click on an edge to open popup',
      'Click "Edit Connection Data"',
      'Change currency to USD',
      'Save changes',
      'Verify edge shows USD'
    ]
  },
  {
    name: 'Currency Inheritance',
    description: 'Test if new rows inherit currency',
    steps: [
      'Open modal',
      'Change currency to EUR',
      'Add new row',
      'Verify new row has EUR',
      'Save changes'
    ]
  },
  {
    name: 'Multiple Currency Test',
    description: 'Test multiple currencies in one connection',
    steps: [
      'Open modal',
      'Change first row to USD',
      'Add row and set to EUR',
      'Add row and set to ETH',
      'Save and verify first currency shows'
    ]
  }
]

// Manual test runner
class SimpleCurrencyTest {
  constructor() {
    this.currentStep = 0
    this.results = []
  }

  async runManualTest() {
    console.log('🎯 Manual Currency Test Started')
    console.log('Follow the instructions in the console...')
    
    for (const scenario of testScenarios) {
      await this.runScenario(scenario)
    }
    
    this.generateReport()
  }

  async runScenario(scenario) {
    console.log(`\n📋 Scenario: ${scenario.name}`)
    console.log(`📝 ${scenario.description}`)
    console.log('\nSteps:')
    scenario.steps.forEach((step, index) => {
      console.log(`${index + 1}. ${step}`)
    })
    
    console.log('\n⏳ Waiting for you to complete the scenario...')
    console.log('Press Enter in console when done, or type "skip" to skip this scenario')
    
    // Wait for user input
    await this.waitForUserInput()
    
    console.log('✅ Scenario completed')
  }

  async waitForUserInput() {
    return new Promise((resolve) => {
      const checkInput = () => {
        const input = prompt('Type "done" when finished, "skip" to skip, or "help" for instructions:')
        if (input === 'done') {
          resolve()
        } else if (input === 'skip') {
          console.log('⏭️ Skipping scenario')
          resolve()
        } else if (input === 'help') {
          this.showHelp()
          checkInput()
        } else {
          console.log('Invalid input. Type "done", "skip", or "help"')
          checkInput()
        }
      }
      checkInput()
    })
  }

  showHelp() {
    console.log('\n🆘 HELP - How to test:')
    console.log('1. Click on any edge (connection line) in the graph')
    console.log('2. Click "Edit Connection Data" button')
    console.log('3. Change the currency dropdown from BTC to USD (or any other)')
    console.log('4. Click "Save"')
    console.log('5. Check if the edge label shows the new currency')
    console.log('6. Type "done" in console when finished')
  }

  generateReport() {
    console.log('\n📊 Test Report')
    console.log('=' * 40)
    console.log('Manual testing completed!')
    console.log('\nTo verify currency updates:')
    console.log('1. Check if edge labels show the correct currency')
    console.log('2. Check browser console for any errors')
    console.log('3. Try refreshing the page to see if changes persist')
  }
}

// Auto-run test
const runTest = async () => {
  console.log('🚀 Starting Simple Currency Test...')
  
  // Wait for page to load
  await wait(2000)
  
  const test = new SimpleCurrencyTest()
  await test.runManualTest()
}

// Export for manual execution
window.runSimpleCurrencyTest = runTest

// Auto-start
runTest() 