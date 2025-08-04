// Simple Manual Currency Test
// Copy and paste this into the browser console on the FlowTrace app page

console.log('🧪 Simple Manual Currency Test')
console.log('=' * 40)

// Test state
let testLogs = []

const log = (message) => {
  const timestamp = new Date().toISOString()
  testLogs.push(`[${timestamp}] ${message}`)
  console.log(`[${timestamp}] ${message}`)
}

// Step 1: Check if we can find the canvas
log('Step 1: Checking for canvas element...')
const canvas = document.querySelector('canvas')
if (canvas) {
  log('✅ Canvas found')
  log(`Canvas size: ${canvas.width} x ${canvas.height}`)
} else {
  log('❌ Canvas not found - make sure you are on the FlowTrace app page')
}

// Step 2: Check for any existing dialogs
log('Step 2: Checking for existing dialogs...')
const dialogs = document.querySelectorAll('[role="dialog"]')
log(`Found ${dialogs.length} dialogs`)

// Step 3: Instructions for manual testing
log('Step 3: Manual Testing Instructions')
console.log(`
📋 MANUAL TEST INSTRUCTIONS:

1. Click on any edge (connection line) in the graph
   - This should open a popup with connection details

2. Look for an "Edit Connection Data" button in the popup
   - Click it to open the edit modal

3. In the modal, find the currency dropdown (should show "BTC")
   - Change it to "USD" or any other currency

4. Click "Save" to save the changes

5. Check if the edge label on the graph shows the new currency

6. Type "done" in the console when finished
`)

// Step 4: Wait for user to complete the test
const waitForUser = () => {
  return new Promise((resolve) => {
    const checkInput = () => {
      const input = prompt('Type "done" when you\'ve completed the currency change test, or "help" for instructions:')
      if (input === 'done') {
        resolve()
      } else if (input === 'help') {
        console.log(`
🆘 HELP - How to test:

1. Look for connection lines (edges) between nodes in the graph
2. Click on one of these lines
3. A popup should appear showing connection details
4. Look for an "Edit Connection Data" button and click it
5. In the modal that opens, find the currency dropdown
6. Change it from "BTC" to "USD" (or any other currency)
7. Click "Save"
8. Check if the edge label on the graph now shows the new currency
9. Type "done" in the console
        `)
        checkInput()
      } else {
        console.log('Please type "done" when finished or "help" for instructions')
        checkInput()
      }
    }
    checkInput()
  })
}

// Step 5: Analyze results
const analyzeResults = () => {
  log('Step 5: Analyzing test results...')
  
  console.log(`
📊 TEST ANALYSIS:

Based on your manual test:

1. Did the popup open when you clicked on an edge?
   - If NO: There might be an issue with edge click detection

2. Did you see an "Edit Connection Data" button?
   - If NO: The edit functionality might not be implemented

3. Did the modal open when you clicked the edit button?
   - If NO: There might be an issue with the modal component

4. Could you change the currency in the dropdown?
   - If NO: There might be an issue with the form controls

5. Did the save button work?
   - If NO: There might be an issue with the save functionality

6. Did the edge label update to show the new currency?
   - If NO: This is the main issue - the currency update isn't being reflected

Please answer these questions to help identify where the problem is occurring.
  `)
  
  // Check for any currency-related console logs
  const currencyLogs = testLogs.filter(log => 
    log.includes('currency') || log.includes('Currency') || log.includes('BTC') || log.includes('USD')
  )
  
  if (currencyLogs.length > 0) {
    log(`Found ${currencyLogs.length} currency-related logs:`)
    currencyLogs.forEach(log => console.log(`  ${log}`))
  } else {
    log('No currency-related logs found')
  }
  
  // Check for any errors
  const errorLogs = testLogs.filter(log => log.includes('error') || log.includes('Error'))
  if (errorLogs.length > 0) {
    log(`Found ${errorLogs.length} error logs:`)
    errorLogs.forEach(log => console.log(`  ${log}`))
  }
}

// Step 6: Generate report
const generateReport = () => {
  log('Step 6: Generating test report...')
  
  console.log(`
📋 MANUAL TEST REPORT
Generated: ${new Date().toISOString()}

Test Logs:
${testLogs.join('\n')}

Next Steps:
1. If the edge label didn't update, the issue is likely in:
   - Connection state management
   - Canvas redraw logic
   - Data persistence

2. If you couldn't find the edit button, the issue is likely in:
   - Modal component implementation
   - UI rendering

3. If the save didn't work, the issue is likely in:
   - Form submission logic
   - State update handlers

To get more detailed debugging information, run the full test suite by copying and pasting the currency-test-console.js script.
  `)
  
  // Save results to window
  window.manualTestResults = {
    logs: testLogs,
    timestamp: new Date().toISOString()
  }
}

// Run the manual test
const runManualTest = async () => {
  try {
    await waitForUser()
    analyzeResults()
    generateReport()
    console.log('✅ Manual test completed!')
  } catch (error) {
    console.error('❌ Manual test failed:', error)
  }
}

// Export for manual execution
window.runManualCurrencyTest = runManualTest

// Auto-start the test
runManualTest() 