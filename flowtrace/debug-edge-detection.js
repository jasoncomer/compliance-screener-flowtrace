const puppeteer = require('puppeteer');

(async () => {
  console.log('🔍 Starting edge detection debug...');
  
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
    
    // Debug the canvas and edge detection
    const debugResults = await page.evaluate(() => {
      console.log('🔍 Debugging edge detection...');
      
      const canvas = document.querySelector('canvas');
      if (!canvas) {
        return { error: 'Canvas not found' };
      }
      
      // Check canvas properties
      const canvasInfo = {
        width: canvas.width,
        height: canvas.height,
        offsetWidth: canvas.offsetWidth,
        offsetHeight: canvas.offsetHeight,
        style: {
          width: canvas.style.width,
          height: canvas.style.height
        }
      };
      
      // Check for any event listeners
      const eventListeners = getEventListeners ? getEventListeners(canvas) : 'getEventListeners not available';
      
      // Try different click positions
      const clickPositions = [
        { x: 400, y: 300, name: 'center' },
        { x: 200, y: 200, name: 'top-left' },
        { x: 600, y: 400, name: 'bottom-right' },
        { x: 100, y: 300, name: 'left' },
        { x: 700, y: 300, name: 'right' }
      ];
      
      const clickResults = [];
      
      clickPositions.forEach(pos => {
        console.log(`Clicking at ${pos.name} (${pos.x}, ${pos.y})`);
        
        // Create click event
        const clickEvent = new MouseEvent('click', {
          clientX: pos.x,
          clientY: pos.y,
          bubbles: true,
          cancelable: true
        });
        
        // Dispatch the event
        const result = canvas.dispatchEvent(clickEvent);
        
        // Check for dialogs after click
        setTimeout(() => {
          const dialogs = document.querySelectorAll('[role="dialog"]');
          const popups = document.querySelectorAll('[data-radix-popper-content-wrapper]');
          const tooltips = document.querySelectorAll('[data-radix-tooltip-content]');
          
          clickResults.push({
            position: pos.name,
            eventDispatched: result,
            dialogs: dialogs.length,
            popups: popups.length,
            tooltips: tooltips.length,
            dialogTexts: Array.from(dialogs).map(d => d.textContent.substring(0, 100))
          });
          
          console.log(`Click at ${pos.name}: ${dialogs.length} dialogs, ${popups.length} popups`);
        }, 500);
      });
      
      // Wait for all click results
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            canvasInfo,
            eventListeners: typeof eventListeners === 'string' ? eventListeners : 'Available',
            clickResults
          });
        }, 3000);
      });
    });
    
    console.log('📊 Debug Results:', JSON.stringify(debugResults, null, 2));
    
    // Try to find any edge-related elements
    const edgeElements = await page.evaluate(() => {
      // Look for any elements that might be edges
      const allElements = document.querySelectorAll('*');
      const edgeCandidates = [];
      
      allElements.forEach(el => {
        const style = window.getComputedStyle(el);
        const classes = el.className;
        const id = el.id;
        const dataAttrs = Array.from(el.attributes).filter(attr => attr.name.startsWith('data-'));
        
        // Look for elements that might be edges
        if (
          style.borderTopWidth !== '0px' ||
          style.borderBottomWidth !== '0px' ||
          style.borderLeftWidth !== '0px' ||
          style.borderRightWidth !== '0px' ||
          classes.includes('edge') ||
          classes.includes('connection') ||
          classes.includes('line') ||
          id.includes('edge') ||
          id.includes('connection') ||
          dataAttrs.some(attr => attr.name.includes('edge') || attr.name.includes('connection'))
        ) {
          edgeCandidates.push({
            tagName: el.tagName,
            className: classes,
            id: id,
            dataAttrs: dataAttrs.map(attr => `${attr.name}="${attr.value}"`),
            style: {
              border: style.border,
              backgroundColor: style.backgroundColor,
              width: style.width,
              height: style.height
            }
          });
        }
      });
      
      return edgeCandidates;
    });
    
    console.log('🔍 Edge Candidates:', edgeElements.length);
    if (edgeElements.length > 0) {
      console.log('First few edge candidates:', edgeElements.slice(0, 3));
    }
    
    // Check if there are any React components or state
    const reactInfo = await page.evaluate(() => {
      // Try to access React DevTools
      if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        return { reactDevTools: 'Available' };
      }
      
      // Look for any global state
      const globalState = {};
      for (const key in window) {
        if (key.includes('state') || key.includes('store') || key.includes('data')) {
          try {
            globalState[key] = typeof window[key];
          } catch (e) {
            globalState[key] = 'Error accessing';
          }
        }
      }
      
      return { globalState };
    });
    
    console.log('⚛️ React Info:', reactInfo);
    
    // Try to manually trigger edge selection by looking for any clickable areas
    const clickableAreas = await page.evaluate(() => {
      const areas = [];
      
      // Look for SVG elements (common for graphs)
      const svgs = document.querySelectorAll('svg');
      svgs.forEach((svg, index) => {
        areas.push({
          type: 'svg',
          index,
          width: svg.width,
          height: svg.height,
          children: svg.children.length
        });
      });
      
      // Look for any elements with click handlers
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
        const onclick = el.onclick;
        const addEventListener = el.addEventListener;
        
        if (onclick || (addEventListener && typeof addEventListener === 'function')) {
          areas.push({
            type: 'clickable',
            tagName: el.tagName,
            className: el.className,
            id: el.id,
            hasOnClick: !!onclick,
            hasAddEventListener: typeof addEventListener === 'function'
          });
        }
      });
      
      return areas;
    });
    
    console.log('🖱️ Clickable Areas:', clickableAreas.length);
    if (clickableAreas.length > 0) {
      console.log('First few clickable areas:', clickableAreas.slice(0, 5));
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    // Keep browser open for a bit to see results
    await new Promise(resolve => setTimeout(resolve, 10000));
    await browser.close();
    console.log('✅ Debug completed');
  }
})(); 