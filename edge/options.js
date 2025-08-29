// BGG Rating Display - Options

document.addEventListener('DOMContentLoaded', () => {
  const showRating = document.getElementById('showRating');
  const showWeight = document.getElementById('showWeight');
  const showAge = document.getElementById('showAge');
  const showLanguage = document.getElementById('showLanguage');
  const hideComplexity = document.getElementById('hideComplexity');
  const hidePublisherAge = document.getElementById('hidePublisherAge');
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

  // Save settings
  document.getElementById('settingsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    chrome.storage.sync.set({
      showRating: showRating.checked,
      showWeight: showWeight.checked,
      showAge: showAge.checked,
      showLanguage: showLanguage.checked,
      hideComplexity: hideComplexity.checked,
      hidePublisherAge: hidePublisherAge.checked
    }, () => {
      status.textContent = 'Beállítások elmentve!';
      setTimeout(() => status.textContent = '', 2000);
    });
  });
});