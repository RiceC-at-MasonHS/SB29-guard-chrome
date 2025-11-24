let allEntries = [];      // The full dataset
let currentEntries = [];  // The currently filtered list
let currentIndex = 0;

/**
 * Determines the icon path based on DPA and T&L status.
 * Matches logic from background.js
 */
function getIconPath(tlStatus, dpaStatus) {
    const tl = (tlStatus || '').trim();
    let dpa = (dpaStatus || '').trim();
    if (dpa === 'Recieved') dpa = 'Received';

    if (tl === 'Approved' && (dpa === 'Received' || dpa === 'Not Required')) return 'images/icon-green-circle.png';
    if (tl === 'Not Required' && (dpa === 'Received' || dpa === 'Not Required')) return 'images/icon-green-circle.png';
    if (dpa === 'Denied') return 'images/icon-yellow-triangle.png';
    if (tl === 'Rejected') return 'images/icon-red-x.png';
    if (dpa === 'Requested') return 'images/icon-orange-square.png';
    
    return 'images/icon-neutral48.png';
}

/**
 * Returns a hex color matching the icon type.
 */
function getStatusColor(iconPath) {
    switch (iconPath) {
        case 'images/icon-green-circle.png':
            return '#2e7d32'; // Green
        case 'images/icon-red-x.png':
            return '#c62828'; // Red
        case 'images/icon-yellow-triangle.png':
            return '#f9a825'; // Dark Yellow/Amber (readable on white)
        case 'images/icon-orange-square.png':
            return '#ef6c00'; // Orange
        default:
            return '#607d8b'; // Blue Grey (Neutral)
    }
}

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

  // Determine Icon and Color
  const iconPath = getIconPath(entry.current_tl_status, entry.current_dpa_status);
  const headerColor = getStatusColor(iconPath);

  const entryDiv = document.createElement('div');
  entryDiv.className = 'entry';
  entryDiv.style.borderColor = headerColor;

  entryDiv.innerHTML = `
    <div class="entry-header" style="background-color: ${headerColor};">
        <div class="header-text">
            <h3>${entry.software_name || 'Unknown Software'}</h3>
            <p>${entry.vendor_name || 'Unknown Vendor'}</p>
        </div>
        <img src="${iconPath}" alt="Status Icon" class="header-icon">
    </div>
    <div class="entry-content">
        <span class="field-label">T&L Status</span>
        <span class="field-value">${entry.current_tl_status || '-'}</span>

        <span class="field-label">DPA Status</span>
        <span class="field-value">${entry.current_dpa_status || '-'}</span>

        <span class="field-label">Description</span>
        <span class="field-value">${entry.purpose || 'No description provided.'}</span>
        
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

function handleSearch(e) {
  const searchTerm = e.target.value.toLowerCase();
  
  if (!searchTerm) {
    currentEntries = [...allEntries];
  } else {
    currentEntries = allEntries.filter(entry => {
        const name = (entry.software_name || '').toLowerCase();
        const vendor = (entry.vendor_name || '').toLowerCase();
        return name.includes(searchTerm) || vendor.includes(searchTerm);
    });
  }

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