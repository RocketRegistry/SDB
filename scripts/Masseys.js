// Google Sheet Configuration
const SHEET_ID = '1jwQrr9pXKyQb61iD28_am0f8QBntckPi9Cit8SDwSn4';
const MASSEYS_GID = '0'; // Replace with your tab GID
const MASSEYS_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${MASSEYS_GID}`;

let rawMasseysData = [];
let totalTestsFromH2 = null;

document.addEventListener('DOMContentLoaded', () => {
    fetchMasseysData();
});

async function fetchMasseysData() {
    const factCardElement = document.getElementById('masseys_total_tests');

    try {
        // Single fetch: parse as raw arrays to safely grab Cell H2 (Row 2, Column H)
        const rawRows = await loadCsvData(MASSEYS_CSV_URL, false);

        if (!rawRows || rawRows.length < 2) {
            throw new Error("No data returned from Google Sheet");
        }

        // Check Cell H2 (Row 2 [index 1], Column H [index 7])
        if (rawRows[1] && rawRows[1][7] && String(rawRows[1][7]).trim() !== '') {
            totalTestsFromH2 = String(rawRows[1][7]).trim();
        }

        // Convert raw rows into header-keyed objects for the table and filters
        const headers = rawRows[0].map(h => String(h).trim());
        rawMasseysData = rawRows.slice(1).map(row => {
            const rowObj = {};
            headers.forEach((header, index) => {
                rowObj[header] = row[index] || '';
            });
            return rowObj;
        });

        // Determine final total count
        const finalCount = totalTestsFromH2 || rawMasseysData.length;

        // Update the fact card on the Masseys page
        if (factCardElement) {
            factCardElement.textContent = `${finalCount} Total Tests`;
        }

        // Initialize table and filters if on the /masseystest/ page
        if (document.getElementById('masseys_test_cards')) {
            populateFilterDropdowns(rawMasseysData);
            attachFilterListeners();
            renderFilteredTable();
        }

    } catch (error) {
        console.error('Masseys Data Fetch Error:', error);
        if (factCardElement) {
            factCardElement.textContent = 'Error Loading Data';
        }
        const container = document.getElementById('masseys_test_cards');
        if (container) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">Unable to connect to Google Sheet.</p>';
        }
    }
}

function loadCsvData(url, hasHeader = false) {
    return new Promise((resolve, reject) => {
        // Guard check: Ensure PapaParse CDN has finished loading
        if (typeof Papa === 'undefined') {
            reject(new Error("PapaParse library not loaded yet. Check your script tags in HTML."));
            return;
        }

        Papa.parse(url, {
            download: true,
            header: hasHeader,
            skipEmptyLines: true,
            complete: function(results) {
                resolve(results.data || []);
            },
            error: function(err) {
                reject(err);
            }
        });
    });
}

function populateFilterDropdowns(data) {
    const vehicles = new Set();
    const testTypes = new Set();
    const outcomes = new Set();

    data.forEach(row => {
        const v = getFirstValue(row, ['VEHICLE', 'Vehicle', 'vehicle']);
        const t = getFirstValue(row, ['TEST TYPE', 'Test Type', 'test type']);
        const o = getFirstValue(row, ['OUTCOME', 'Outcome', 'outcome']);

        if (v) vehicles.add(v.trim());
        if (t) testTypes.add(t.trim());
        if (o) outcomes.add(o.trim().toUpperCase());
    });

    populateSelect('vehicle_filter', Array.from(vehicles).sort());
    populateSelect('type_filter', Array.from(testTypes).sort());
    populateSelect('outcome_filter', Array.from(outcomes).sort());
}

function populateSelect(selectId, optionsArray) {
    const select = document.getElementById(selectId);
    if (!select) return;

    // Clear existing options except the default "ALL"
    select.innerHTML = select.children[0] ? select.children[0].outerHTML : '<option value="ALL">All</option>';

    optionsArray.forEach(opt => {
        const el = document.createElement('option');
        el.value = opt;
        el.textContent = opt;
        select.appendChild(el);
    });
}

function attachFilterListeners() {
    ['search_filter', 'vehicle_filter', 'type_filter', 'outcome_filter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', renderFilteredTable);
            el.addEventListener('change', renderFilteredTable);
        }
    });
}

function renderFilteredTable() {
    const searchTerm = (document.getElementById('search_filter')?.value || '').toLowerCase();
    const selectedVehicle = document.getElementById('vehicle_filter')?.value || 'ALL';
    const selectedType = document.getElementById('type_filter')?.value || 'ALL';
    const selectedOutcome = document.getElementById('outcome_filter')?.value || 'ALL';

    const filteredData = rawMasseysData.filter(row => {
        const vehicle = getFirstValue(row, ['VEHICLE', 'Vehicle', 'vehicle']) || '';
        const testType = getFirstValue(row, ['TEST TYPE', 'Test Type', 'test type']) || '';
        const outcome = (getFirstValue(row, ['OUTCOME', 'Outcome', 'outcome']) || '').toUpperCase();
        const notes = getFirstValue(row, ['NOTES', 'Notes', 'notes']) || '';

        const matchesSearch = !searchTerm || 
            vehicle.toLowerCase().includes(searchTerm) || 
            notes.toLowerCase().includes(searchTerm);

        const matchesVehicle = selectedVehicle === 'ALL' || vehicle.trim() === selectedVehicle;
        const matchesType = selectedType === 'ALL' || testType.trim() === selectedType;
        const matchesOutcome = selectedOutcome === 'ALL' || outcome.trim() === selectedOutcome;

        return matchesSearch && matchesVehicle && matchesType && matchesOutcome;
    });

    const totalCountElement = document.getElementById('total_tests_count');
    if (totalCountElement) {
        totalCountElement.textContent = totalTestsFromH2 ? `${totalTestsFromH2} (${filteredData.length} shown)` : filteredData.length;
    }

    displayMasseysTests(filteredData, 'masseys_test_cards');
}

function displayMasseysTests(dataSource, containerId = 'masseys_test_cards') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    if (!Array.isArray(dataSource) || !dataSource.length) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No matching test records found.</p>';
        return;
    }

    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'sheet-table-wrapper';

    let tableHTML = `
        <table class="sheet-table">
            <thead>
                <tr>
                    <th>VEHICLE</th>
                    <th>TEST TYPE</th>
                    <th>DATE</th>
                    <th>TEST NUMBER</th>
                    <th>OUTCOME</th>
                    <th>NOTES</th>
                </tr>
            </thead>
            <tbody>
    `;

    dataSource.forEach(row => {
        const vehicle = getFirstValue(row, ['VEHICLE', 'Vehicle', 'vehicle']) || '—';
        const testType = getFirstValue(row, ['TEST TYPE', 'Test Type', 'test type']) || '—';
        const date = getFirstValue(row, ['DATE', 'Date', 'date']) || '—';
        const testNumber = getFirstValue(row, ['TEST NUMBER', 'Test Number', 'test number']) || '—';
        const outcome = (getFirstValue(row, ['OUTCOME', 'Outcome', 'outcome']) || 'UNKNOWN').trim().toUpperCase();
        const notes = getFirstValue(row, ['NOTES', 'Notes', 'notes']) || '';

        let outcomeClass = 'outcome-unknown';
        if (outcome.includes('SUCCESS') || outcome.includes('PASSED')) {
            outcomeClass = 'outcome-success';
        } else if (outcome.includes('FAIL') || outcome.includes('ABORT') || outcome.includes('ANOMALY')) {
            outcomeClass = 'outcome-failure';
        } else if (outcome.includes('PARTIAL')) {
            outcomeClass = 'outcome-warning';
        }

        const isBooster = vehicle.toUpperCase().startsWith('B');
        const vehicleClass = isBooster ? 'vehicle-tag booster' : 'vehicle-tag ship';

        tableHTML += `
            <tr>
                <td><a href="${buildVehiclePageUrl(vehicle)}" class="${vehicleClass}">${escapeHTML(vehicle)}</a></td>
                <td><span class="pill pill-blue">${escapeHTML(testType)}</span></td>
                <td class="font-mono">${escapeHTML(date)}</td>
                <td class="font-mono text-center">${escapeHTML(testNumber)}</td>
                <td><span class="outcome-badge ${outcomeClass}">${escapeHTML(outcome)}</span></td>
                <td class="table-notes">${escapeHTML(notes)}</td>
            </tr>
        `;
    });

    tableHTML += `</tbody></table>`;
    tableWrapper.innerHTML = tableHTML;
    container.appendChild(tableWrapper);
}

function buildVehiclePageUrl(vehicle) {
    const cleanVehicle = String(vehicle || '').trim();
    if (!cleanVehicle) return '/vehicles/';
    return `/vehicles/${encodeURIComponent(cleanVehicle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}/`;
}

function getFirstValue(row, keys) {
    for (const key of keys) {
        const value = row?.[key];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
            return value;
        }
    }
    return null;
}

function escapeHTML(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}