const puppeteer = require('puppeteer');

(async () => {
  console.log('🧪 Starting automated currency test...');
  
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
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Inject our test script
    const results = await page.evaluate(() => {
      console.log('🎯 Starting currency test...');
      
      // Test state
      let testLogs = [];
      
      const log = (message) => {
        const timestamp = new Date().toISOString();
        testLogs.push(`[${timestamp}] ${message}`);
        console.log(`[${timestamp}] ${message}`);
      };
      
      // Check canvas
      const canvas = document.querySelector('canvas');
      if (canvas) {
        log('✅ Canvas found');
        log(`Canvas size: ${canvas.width} x ${canvas.height}`);
      } else {
        log('❌ Canvas not found');
      }
      
      // Check for dialogs
      const dialogs = document.querySelectorAll('[role="dialog"]');
      log(`Found ${dialogs.length} dialogs`);
      
      // Check for any buttons
      const buttons = document.querySelectorAll('button');
      log(`Found ${buttons.length} buttons`);
      
      // Look for edit buttons specifically
      const editButtons = Array.from(buttons).filter(btn => 
        btn.textContent.includes('Edit') || btn.textContent.includes('edit')
      );
      log(`Found ${editButtons.length} edit buttons`);
      
      // Check for currency selects
      const currencySelects = document.querySelectorAll('select');
      log(`Found ${currencySelects.length} select elements`);
      
      // Look for currency options
      const currencyOptions = Array.from(currencySelects).filter(select => 
        Array.from(select.options).some(option => 
          ['BTC', 'USD', 'EUR', 'ETH'].includes(option.value)
        )
      );
      log(`Found ${currencyOptions.length} currency select elements`);
      
      // Try to click on the canvas to see if we can trigger edge selection
      log('Attempting to click on canvas...');
      const rect = canvas.getBoundingClientRect();
      const clickEvent = new MouseEvent('click', {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        bubbles: true
      });
      canvas.dispatchEvent(clickEvent);
      
      // Wait a bit and check for dialogs again
      setTimeout(() => {
        const dialogsAfterClick = document.querySelectorAll('[role="dialog"]');
        log(`Found ${dialogsAfterClick.length} dialogs after click`);
        
        if (dialogsAfterClick.length > 0) {
          log('✅ Dialog appeared after click!');
          
          // Look for edit button in the dialog
          const dialogButtons = dialogsAfterClick[0].querySelectorAll('button');
          const editButton = Array.from(dialogButtons).find(btn => 
            btn.textContent.includes('Edit') || btn.textContent.includes('edit')
          );
          
          if (editButton) {
            log('✅ Edit button found in dialog!');
            log(`Edit button text: "${editButton.textContent}"`);
          } else {
            log('❌ No edit button found in dialog');
            log(`Dialog buttons: ${Array.from(dialogButtons).map(btn => btn.textContent).join(', ')}`);
          }
        } else {
          log('❌ No dialog appeared after click');
        }
      }, 1000);
      
      // Save results
      return {
        canvas: !!canvas,
        dialogs: dialogs.length,
        buttons: buttons.length,
        editButtons: editButtons.length,
        currencySelects: currencySelects.length,
        currencyOptions: currencyOptions.length,
        logs: testLogs
      };
    });
    
    console.log('📊 Initial Test Results:', results);
    
    // Wait for the click test to complete
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check for dialogs after click
    const dialogsAfterClick = await page.evaluate(() => {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs.length > 0) {
        const buttons = dialogs[0].querySelectorAll('button');
        return {
          dialogCount: dialogs.length,
          buttonTexts: Array.from(buttons).map(btn => btn.textContent),
          hasEditButton: Array.from(buttons).some(btn => 
            btn.textContent.includes('Edit') || btn.textContent.includes('edit')
          )
        };
      }
      return { dialogCount: 0, buttonTexts: [], hasEditButton: false };
    });
    
    console.log('📊 After Click Results:', dialogsAfterClick);
    
    if (dialogsAfterClick.hasEditButton) {
      console.log('🎉 Found edit button! Attempting to click it...');
      
      // Click the edit button
      await page.evaluate(() => {
        const dialogs = document.querySelectorAll('[role="dialog"]');
        const buttons = dialogs[0].querySelectorAll('button');
        const editButton = Array.from(buttons).find(btn => 
          btn.textContent.includes('Edit') || btn.textContent.includes('edit')
        );
        if (editButton) {
          editButton.click();
          console.log('✅ Edit button clicked!');
        }
      });
      
      // Wait for the edit modal to open
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check for the edit modal
      const editModal = await page.evaluate(() => {
        const dialogs = document.querySelectorAll('[role="dialog"]');
        console.log(`Found ${dialogs.length} dialogs after edit click`);
        
        if (dialogs.length > 0) {
          const currencySelects = dialogs[0].querySelectorAll('select[data-testid="currency-select"]');
          const saveButtons = dialogs[0].querySelectorAll('button[data-testid="save-button"]');
          
          return {
            dialogCount: dialogs.length,
            currencySelects: currencySelects.length,
            saveButtons: saveButtons.length,
            hasCurrencySelect: currencySelects.length > 0,
            hasSaveButton: saveButtons.length > 0
          };
        }
        return { dialogCount: 0, currencySelects: 0, saveButtons: 0, hasCurrencySelect: false, hasSaveButton: false };
      });
      
      console.log('📊 Edit Modal Results:', editModal);
      
      if (editModal.hasCurrencySelect) {
        console.log('🎉 Found currency select! Testing currency change...');
        
        // Change the currency
        await page.evaluate(() => {
          const currencySelect = document.querySelector('select[data-testid="currency-select"]');
          if (currencySelect) {
            console.log(`Current currency: ${currencySelect.value}`);
            currencySelect.value = 'USD';
            currencySelect.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('✅ Currency changed to USD');
          }
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Click save
        await page.evaluate(() => {
          const saveButton = document.querySelector('button[data-testid="save-button"]');
          if (saveButton) {
            saveButton.click();
            console.log('✅ Save button clicked!');
          }
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('🎉 Currency change test completed!');
        console.log('Check the graph to see if the edge label updated to show USD instead of BTC');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Keep browser open for a bit to see results
    await new Promise(resolve => setTimeout(resolve, 5000));
    await browser.close();
    console.log('✅ Test completed');
  }
})(); 