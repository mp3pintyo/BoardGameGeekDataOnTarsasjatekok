// Background script for BGG Rating Display

// Handle messages from content script
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openOptions') {
    browser.runtime.openOptionsPage();
  }
});