// BGG Rating Display - Options (Edge)

document.addEventListener('DOMContentLoaded', () => {
  const showRating = document.getElementById('showRating');
  const showWeight = document.getElementById('showWeight');
  const showAge = document.getElementById('showAge');
  const showLanguage = document.getElementById('showLanguage');
  const hideComplexity = document.getElementById('hideComplexity');
  const hidePublisherAge = document.getElementById('hidePublisherAge');
  const saveButton = document.getElementById('saveButton');
  const status = document.getElementById('status');

  // Load settings
  chrome.storage.sync.get({
    showRating: true,
    showWeight: true,
    showAge: true,
    showLanguage: true,
    hideComplexity: false,
    hidePublisherAge: false
  }, (items) => {
    showRating.checked = items.showRating;
    showWeight.checked = items.showWeight;
    showAge.checked = items.showAge;
    showLanguage.checked = items.showLanguage;
    hideComplexity.checked = items.hideComplexity;
    hidePublisherAge.checked = items.hidePublisherAge;
  });

  // Save settings function
  function saveSettings() {
    chrome.storage.sync.set({
      showRating: showRating.checked,
      showWeight: showWeight.checked,
      showAge: showAge.checked,
      showLanguage: showLanguage.checked,
      hideComplexity: hideComplexity.checked,
      hidePublisherAge: hidePublisherAge.checked
    }, () => {
      // Show success message
      status.textContent = '✓ Beállítások sikeresen elmentve!';
      status.className = 'status-message show success';
      
      // Hide message after 3 seconds
      setTimeout(() => {
        status.className = 'status-message';
        status.textContent = '';
      }, 3000);
    });
  }

  // Save button click handler
  saveButton.addEventListener('click', saveSettings);

  // Auto-save on checkbox change (optional)
  [showRating, showWeight, showAge, showLanguage, hideComplexity, hidePublisherAge].forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      // Add a small delay to avoid too frequent saves
      clearTimeout(window.autoSaveTimeout);
      window.autoSaveTimeout = setTimeout(saveSettings, 500);
    });
  });
});