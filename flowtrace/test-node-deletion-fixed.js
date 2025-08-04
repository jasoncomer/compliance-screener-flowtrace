// Test script for node deletion functionality
// Run this in the browser console to test the fixed delete button

console.log('🧪 Testing Node Deletion Functionality')
console.log('=====================================')

// Test 1: Check if nodes exist
const canvas = document.querySelector('canvas')
if (!canvas) {
  console.error('❌ Canvas not found')
} else {
  console.log('✅ Canvas found')
}

// Test 2: Check if there are nodes to delete
const nodes = window.nodes || []
console.log(`📊 Found ${nodes.length} nodes`)

if (nodes.length === 0) {
  console.log('⚠️  No nodes to test deletion with')
} else {
  console.log('✅ Nodes available for testing')
  
  // Test 3: Select first node
  const firstNode = nodes[0]
  console.log(`🎯 Testing with node: ${firstNode.id} (${firstNode.label})`)
  
  // Simulate node selection
  if (window.setSelectedNode) {
    window.setSelectedNode(firstNode.id)
    console.log('✅ Node selected')
  } else {
    console.log('⚠️  setSelectedNode function not available')
  }
  
  // Test 4: Check delete button visibility
  console.log('🔍 Delete button should now be visible on the selected node')
  console.log('📍 Look for a red circle with × in the top-right area of the node')
  console.log('🎯 Click on the red × to test deletion')
  
  // Test 5: Provide instructions
  console.log('')
  console.log('📋 Test Instructions:')
  console.log('1. Look for the selected node (should have a thicker border)')
  console.log('2. Look for a red circle with × in the top-right corner')
  console.log('3. Click on the red ×')
  console.log('4. Confirm deletion in the dialog that appears')
  console.log('5. Verify the node disappears from the graph')
  console.log('')
  console.log('🔧 If deletion fails:')
  console.log('- Check console for error messages')
  console.log('- Verify the click is within the red circle')
  console.log('- Try clicking closer to the center of the ×')
}

// Test 6: Check for excessive logging
console.log('')
console.log('📝 Console Log Check:')
console.log('- You should see minimal logging during normal operation')
console.log('- Only deletion-related logs should appear when deleting')
console.log('- No repeated "Drawing node" logs should spam the console')

console.log('')
console.log('✅ Test script completed')
console.log('🎯 Ready to test node deletion!') 