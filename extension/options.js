// Saves options to chrome.storage
function save_options() {
  const sheetUrl = document.getElementById('sheet-url').value;
  const formUrl = document.getElementById('form-url').value;
  
  chrome.storage.local.set({
    sheetUrl: sheetUrl,
    formUrl: formUrl,
    lastUpdated: 0 // Reset cache when URL changes to force fresh fetch
  }, function() {
    const status = document.getElementById('status');
    status.textContent = 'Options saved. Cache cleared.';
    setTimeout(function() {
      status.textContent = '';
    }, 1500);
  });
}

// Restores input state
function restore_options() {
  chrome.storage.local.get({
    sheetUrl: '',
    formUrl: ''
  }, function(items) {
    document.getElementById('sheet-url').value = items.sheetUrl;
    document.getElementById('form-url').value = items.formUrl;
  });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);