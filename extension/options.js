// Saves options to chrome.storage
function save_options() {
  const sheetUrl = document.getElementById('sheet-url').value;
  const formUrl = document.getElementById('form-url').value; // Get the new form URL
  chrome.storage.local.set({
    sheetUrl: sheetUrl,
    formUrl: formUrl // Save the new form URL
  }, function() {
    // Update status to let user know options were saved.
    const status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 750);
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  chrome.storage.local.get({
    sheetUrl: '',
    formUrl: '' // Restore the new form URL
  }, function(items) {
    document.getElementById('sheet-url').value = items.sheetUrl;
    document.getElementById('form-url').value = items.formUrl; // Set the new form URL
  });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);