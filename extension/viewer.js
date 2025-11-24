let dpaList = [];
let currentIndex = 0;
let filteredDpaList = []; // New array to hold search results

// Function to render a single DPA entry
function renderEntry(index, listToRender = dpaList) {
  const container = document.getElementById('data-container');
  container.innerHTML = '';

  if (listToRender.length === 0) {
    container.textContent = 'No data available.';
    document.getElementById('position').textContent = '';
    return;
  }

  const entry = listToRender[index];
  const entryDiv = document.createElement('div');
  entryDiv.className = 'entry';

  // Render the example HTML card using the entry data
  // This is a simplified version and would need proper templating
  // or a more robust rendering function for the full card structure.
  // For now, let's just display key fields from the example card.

  const headerColor = entry.current_tl_status === 'Approved' ? '#008a00' : '#FF9800'; // Example colors
  const headerTextColor = 'white';

  entryDiv.innerHTML = `
    <div class="rounded-lg bg-card text-card-foreground shadow-sm w-full hover:shadow-lg transition-shadow duration-200 border-2 border-[${headerColor}]">
      <div class="flex flex-col space-y-1.5 relative bg-[${headerColor}] p-4">
        <h3 class="tracking-tight text-lg font-semibold text-[${headerTextColor}]">${entry.software_name}</h3>
        <p class="text-sm text-[${headerTextColor}]/90">Requested by ${entry.requester_name || 'N/A'}</p>
      </div>
      <div class="p-4">
        <div class="grid gap-4">
          <div class="flex justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="text-sm">T&amp;L: ${entry.current_tl_status || 'N/A'}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm">DPA: ${entry.current_dpa_status || 'N/A'}</span>
            </div>
          </div>
          <div>
            <h3 class="font-medium mb-2">Description:</h3>
            <p class="text-sm text-gray-600">${entry.purpose || 'N/A'}</p>
          </div>
          <div class="border-l-4 border-[${headerColor}] pl-3 bg-green-50 p-2 rounded-r">
            <h3 class="font-medium text-[${headerColor}] mb-1">Usage Instructions:</h3>
            <p class="text-sm text-gray-700">${entry.use_instructions || 'N/A'}</p>
          </div>
          <div>
            <a href="${entry.resource_link || '#'}" target="_blank" rel="noopener noreferrer" class="text-sm text-blue-600 hover:underline">Visit Website →</a>
          </div>
        </div>
      </div>
    </div>
  `;

  container.appendChild(entryDiv);
  document.getElementById('position').textContent = `${index + 1} of ${listToRender.length}`;
}

// Existing navigation functions
function showPrev() {
  if (currentIndex > 0) {
    currentIndex--;
    renderEntry(currentIndex);
  }
}

function showNext() {
  if (currentIndex < dpaList.length - 1) {
    currentIndex++;
    renderEntry(currentIndex);
  }
}

// New search functions
function handleSearch() {
  const searchTerm = document.getElementById('dpa-search-input').value.toLowerCase();
  const searchResultsContainer = document.getElementById('dpa-search-results');
  searchResultsContainer.innerHTML = ''; // Clear previous results

  if (searchTerm.length > 0) {
    filteredDpaList = dpaList.filter(entry =>
      entry.software_name && entry.software_name.toLowerCase().includes(searchTerm)
    );

    if (filteredDpaList.length > 0) {
      filteredDpaList.forEach((entry, index) => {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item'; // Add a class for styling
        resultItem.textContent = entry.software_name;
        resultItem.addEventListener('click', () => {
          renderEntry(index, filteredDpaList); // Render selected filtered entry
          searchResultsContainer.innerHTML = ''; // Clear results after selection
          // Optionally, hide search results container or clear search input
          document.getElementById('dpa-search-input').value = entry.software_name; // Show selected name in input
        });
        searchResultsContainer.appendChild(resultItem);
      });
    } else {
      searchResultsContainer.textContent = 'No matching software found.';
    }
    // Temporarily disable prev/next buttons if search results are displayed
    document.getElementById('prev').disabled = true;
    document.getElementById('next').disabled = true;

  } else {
    // If search term is empty, revert to original list view
    filteredDpaList = [];
    renderEntry(currentIndex); // Render the current item from the original list
    // Re-enable prev/next buttons
    document.getElementById('prev').disabled = false;
    document.getElementById('next').disabled = false;
  }
}


async function init() {
  const result = await chrome.storage.local.get(['dpaList']);
  if (result.dpaList) {
    dpaList = result.dpaList;

    // Check for ID in URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const dpaId = urlParams.get('id');

    if (dpaId) {
      const entryIndex = dpaList.findIndex(entry => entry.id === dpaId);
      if (entryIndex !== -1) {
        currentIndex = entryIndex;
      }
    }

    renderEntry(currentIndex);
  }

  // Event listeners for navigation
  document.getElementById('prev').addEventListener('click', showPrev);
  document.getElementById('next').addEventListener('click', showNext);

  // Event listener for search input
  document.getElementById('dpa-search-input').addEventListener('input', handleSearch);
}

init();