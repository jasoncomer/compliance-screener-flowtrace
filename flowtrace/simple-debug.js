const puppeteer = require('puppeteer');

(async () => {
  console.log('🔍 Starting simple edge detection debug...');
  
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to the app
    await page.goto('http://localhost:3001');
    console.log('✅ App loaded');
    
    // Wait for the page to load
    await page.waitForSelector('canvas', { timeout: 10000 });
    console.log('✅ Canvas found');
    
    // Wait a bit more for everything to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Simple debug - check what's on the page
    const pageInfo = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const buttons = document.querySelectorAll('button');
      const selects = document.querySelectorAll('select');
      const dialogs = document.querySelectorAll('[role="dialog"]');
      
      // Get button texts
      const buttonTexts = Array.from(buttons).map(btn => btn.textContent.trim()).filter(text => text.length > 0);
      
      // Get select options
      const selectOptions = Array.from(selects).map(select => {
        const options = Array.from(select.options).map(opt => opt.value);
        return { value: select.value, options };
      });
      
      return {
        canvas: canvas ? { width: canvas.width, height: canvas.height } : null,
        buttons: buttonTexts,
        selects: selectOptions,
        dialogs: dialogs.length
      };
    });
    
    console.log('📊 Page Info:', JSON.stringify(pageInfo, null, 2));
    
    // Try clicking on the canvas at different positions
    console.log('🖱️ Testing canvas clicks...');
    
    const clickPositions = [
      { x: 400, y: 300, name: 'center' },
      { x: 200, y: 200, name: 'top-left' },
      { x: 600, y: 400, name: 'bottom-right' }
    ];
    
    for (const pos of clickPositions) {
      console.log(`Clicking at ${pos.name} (${pos.x}, ${pos.y})`);
      
      // Click on the canvas
      await page.mouse.click(pos.x, pos.y);
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check for dialogs
      const dialogsAfterClick = await page.evaluate(() => {
        const dialogs = document.querySelectorAll('[role="dialog"]');
        const buttons = document.querySelectorAll('button');
        
        return {
          dialogs: dialogs.length,
          buttonTexts: Array.from(buttons).map(btn => btn.textContent.trim()).filter(text => text.length > 0)
        };
      });
      
      console.log(`After click at ${pos.name}:`, dialogsAfterClick);
      
      if (dialogsAfterClick.dialogs > 0) {
        console.log('🎉 Found dialog!');
        break;
      }
    }
    
    // If no dialogs found, try to find any interactive elements
    console.log('🔍 Looking for interactive elements...');
    
    const interactiveElements = await page.evaluate(() => {
      const elements = [];
      
      // Look for any elements with data attributes
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
        const dataAttrs = Array.from(el.attributes).filter(attr => attr.name.startsWith('data-'));
        if (dataAttrs.length > 0) {
          elements.push({
            tagName: el.tagName,
            className: el.className,
            id: el.id,
            dataAttrs: dataAttrs.map(attr => `${attr.name}="${attr.value}"`)
          });
        }
      });
      
      return elements;
    });
    
    console.log(`Found ${interactiveElements.length} elements with data attributes`);
    if (interactiveElements.length > 0) {
      console.log('First few:', interactiveElements.slice(0, 3));
    }
    
    // Try to find any edge-related elements
    const edgeElements = await page.evaluate(() => {
      const elements = [];
      
      // Look for elements that might be edges
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
        const text = el.textContent || '';
        const className = el.className || '';
        const id = el.id || '';
        
        if (text.includes('BTC') || text.includes('USD') || text.includes('connection') || 
            className.includes('edge') || className.includes('connection') ||
            id.includes('edge') || id.includes('connection')) {
          elements.push({
            tagName: el.tagName,
            text: text.substring(0, 50),
            className,
            id
          });
        }
      });
      
      return elements;
    });
    
    console.log(`Found ${edgeElements.length} potential edge elements`);
    if (edgeElements.length > 0) {
      console.log('Edge elements:', edgeElements);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    // Keep browser open for a bit to see results
    await new Promise(resolve => setTimeout(resolve, 5000));
    await browser.close();
    console.log('✅ Debug completed');
  }
})(); 