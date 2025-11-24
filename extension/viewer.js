let allEntries = [];      // The full dataset
let currentEntries = [];  // The currently filtered list
let currentIndex = 0;

// Function to render a single DPA entry
function renderEntry() {
  const container = document.getElementById('data-container');
  const positionSpan = document.getElementById('position');
  container.innerHTML = '';

  if (currentEntries.length === 0) {
    container.innerHTML = '<p style="text-align:center; color: #666;">No data available.</p>';
    positionSpan.textContent = '0 / 0';
    return;
  }

  const entry = currentEntries[currentIndex];
  positionSpan.textContent = `${currentIndex + 1} / ${currentEntries.length}`;

  // Determine colors based on status
  let headerColor = '#607d8b'; // Neutral Grey
  if (entry.current_tl_status === 'Approved') headerColor = '#2e7d32'; // Green
  else if (entry.current_tl_status === 'Rejected') headerColor = '#c62828'; // Red
  else if (entry.current_dpa_status === 'Pending' || entry.current_dpa_status === 'Requested') headerColor = '#ef6c00'; // Orange

  const entryDiv = document.createElement('div');
  entryDiv.className = 'entry';
  // FIX: Using inline styles instead of Tailwind JIT classes
  entryDiv.style.borderColor = headerColor;

  entryDiv.innerHTML = `
    <div class="entry-header" style="background-color: ${headerColor};">
        <h3>${entry.software_name || 'Unknown Software'}</h3>
        <p>${entry.vendor_name || 'Unknown Vendor'}</p>
    </div>
    <div class="entry-content">
        <span class="field-label">T&L Status</span>
        <span class="field-value">${entry.current_tl_status || '-'}</span>

        <span class="field-label">DPA Status</span>
        <span class="field-value">${entry.current_dpa_status || '-'}</span>

        <span class="field-label">Description</span>
        <span class="field-value">${entry.software_description || 'No description provided.'}</span>
        
        <span class="field-label">Resource Type</span>
        <span class="field-value">${entry.resource_type || '-'}</span>

        <span class="field-label">Privacy Policy</span>
        <span class="field-value">
            ${entry.privacy_policy_link ? `<a href="${entry.privacy_policy_link}" target="_blank">Link</a>` : 'N/A'}
        </span>
    </div>
  `;

  container.appendChild(entryDiv);

  // Update button states
  document.getElementById('prev').disabled = (currentIndex === 0);
  document.getElementById('next').disabled = (currentIndex === currentEntries.length - 1);
}

function showPrev() {
  if (currentIndex > 0) {
    currentIndex--;
    renderEntry();
  }
}

function showNext() {
  if (currentIndex < currentEntries.length - 1) {
    currentIndex++;
    renderEntry();
  }
}

// FIX: Improved Search Logic
function handleSearch(e) {
  const searchTerm = e.target.value.toLowerCase();
  
  if (!searchTerm) {
    // Reset to full list
    currentEntries = [...allEntries];
  } else {
    // Filter list
    currentEntries = allEntries.filter(entry => {
        const name = (entry.software_name || '').toLowerCase();
        const vendor = (entry.vendor_name || '').toLowerCase();
        return name.includes(searchTerm) || vendor.includes(searchTerm);
    });
  }

  // FIX: Reset index to 0 so we don't end up out of bounds in the new list
  currentIndex = 0;
  renderEntry();
}

async function init() {
  const result = await chrome.storage.local.get(['dpaList']);
  if (result.dpaList) {
    allEntries = result.dpaList;
    currentEntries = [...allEntries];

    // Check for ID in URL query parameter (e.g. from popup click)
    const urlParams = new URLSearchParams(window.location.search);
    const dpaId = urlParams.get('id');

    if (dpaId) {
      // Find the index of the specific ID in the CURRENT list
      const entryIndex = currentEntries.findIndex(entry => entry.id === dpaId);
      if (entryIndex !== -1) {
        currentIndex = entryIndex;
      }
    }

    renderEntry();
  }

  // Event listeners
  document.getElementById('prev').addEventListener('click', showPrev);
  document.getElementById('next').addEventListener('click', showNext);
  document.getElementById('dpa-search-input').addEventListener('input', handleSearch);
}

init();