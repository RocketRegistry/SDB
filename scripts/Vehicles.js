// Google Sheet Configuration
const SHEET_ID = '15G9qLpOQpApcYhtPQR9c9myXtR2Eh1pjRSZ8S3mEN3Q';

const SHIPS_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;

// Tab 2 (booster data)
const BOOSTER_GID = '1284937322';
const BOOSTER_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${BOOSTER_GID}`;

// Global data stores
let starshipData = [];
let boosterData = [];

document.addEventListener('DOMContentLoaded', () => {
    fetchVehicleData();
});

async function fetchVehicleData() {
    try {
        const [starships, boosters] = await Promise.all([
            loadCsvData(SHIPS_CSV_URL),
            loadCsvData(BOOSTER_CSV_URL)
        ]);

        starshipData = starships;
        boosterData = boosters;

        if (document.getElementById('current_vehicles')) {
            const currentEntries = [
                ...starshipData.filter(row => ['S40', 'S41', 'S42'].includes(normalizeName(getFirstValue(row, ['VEHICLE', 'Vehicle', 'vehicle', 'NAME', 'Name', 'name'])))),
                ...boosterData.filter(row => ['B21', 'B22', 'B23'].includes(normalizeName(getFirstValue(row, ['BOOSTER', 'Booster', 'booster', 'NAME', 'Name', 'name', 'VEHICLE', 'Vehicle', 'vehicle']))))
            ];

            displaySpecificVehicles(currentEntries, 'current_vehicles', 'current');
        }

        if (document.getElementById('current_test_articles')) {
            const testArticles = [
                ...starshipData.filter(row => ['S39.1', 'S43.1'].includes(normalizeName(getFirstValue(row, ['VEHICLE', 'Vehicle', 'vehicle', 'NAME', 'Name', 'name'])))),
                ...boosterData.filter(row => ['B18.1', 'B18.3', 'LOX LANDING TANK'].includes(normalizeName(getFirstValue(row, ['BOOSTER', 'Booster', 'booster', 'NAME', 'Name', 'name', 'VEHICLE', 'Vehicle', 'vehicle']))))
            ];

            displaySpecificVehicles(testArticles, 'current_test_articles', 'test-article');
        }

        if (document.getElementById('ship_cards')) {
            displaySpecificVehicles(starshipData, 'ship_cards', 'ship');
        }

        if (document.getElementById('booster_cards')) {
            displaySpecificVehicles(boosterData, 'booster_cards', 'booster');
        }
    } catch (error) {
        console.error('PapaParse Error:', error);
    }
}

function loadCsvData(url) {
    return new Promise((resolve, reject) => {
        Papa.parse(url, {
            download: true,
            header: true,
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

function displaySpecificVehicles(dataSource, containerId = 'ship_cards', entryType = 'ship') {
    const container = document.getElementById(containerId);

    if (!container) {
        console.error(`Container element with id "${containerId}" was not found in your HTML!`);
        return;
    }

    container.innerHTML = '';

    if (!Array.isArray(dataSource) || !dataSource.length) {
        container.innerHTML = '<p style="grid-column: 1/-1; color: var(--text-muted); text-align: center;">No data found.</p>';
        return;
    }

    dataSource.forEach(row => {
        const vehicle = getFirstValue(row, ['VEHICLE', 'Vehicle', 'vehicle', 'BOOSTER', 'Booster', 'booster', 'NAME', 'Name', 'name']) || 'Unknown';
        const status = getFirstValue(row, ['STATUS', 'Status', 'status']) || 'UNKNOWN';
        const pairedValue = getFirstValue(row, ['PAIRED BOOSTER', 'Paired Booster', 'PAIRED SHIP', 'Paired Ship', 'PAIRED VEHICLE', 'Paired Vehicle', 'PAIRING', 'Pairing']);
        // Automatically detect if the current vehicle is a booster by its designation (e.g., B21, B18.1)
        const isBooster = vehicle.toUpperCase().startsWith('B') || entryType === 'booster';

        const booster = pairedValue 
            ? `Paired: ${pairedValue}` 
            : (isBooster ? 'No paired ship' : 'No Booster');
        const location = getFirstValue(row, ['LOCATION (IF ACTIVE)', 'Location', 'location', 'SITE', 'Site', 'site']) ? ` | ${getFirstValue(row, ['LOCATION (IF ACTIVE)', 'Location', 'location', 'SITE', 'Site', 'site'])}` : '';
        const notes = getFirstValue(row, ['NOTES', 'Notes', 'notes']) || 'No telemetry notes recorded.';
        
        // Check for valid launch date
        const rawLaunch = getFirstValue(row, ['FIRST LAUNCH', 'First Launch', 'first launch']);
        const hasLaunchDate = rawLaunch && String(rawLaunch).trim() !== '' && !['N/A', 'AWAITING', 'PRECLUDED'].includes(String(rawLaunch).trim().toUpperCase());
        const launchStr = hasLaunchDate ? `First Launch: ${rawLaunch}` : '';

        // Check for valid cryo date
        const rawCryo = getFirstValue(row, ['FIRST CRYO', 'First Cryo', 'first cryo']);
        const hasCryoDate = rawCryo && String(rawCryo).trim() !== '' && !['N/A', 'AWAITING', 'PRECLUDED'].includes(String(rawCryo).trim().toUpperCase());
        const cryoStr = hasCryoDate ? `First Cryo: ${rawCryo}` : '';

        // Check for valid static fire date
        const rawStaticFire = getFirstValue(row, ['FIRST STATIC FIRE', 'First Static Fire', 'first static fire']);
        const hasStaticFireDate = rawStaticFire && String(rawStaticFire).trim() !== '' && !['N/A', 'AWAITING', 'PRECLUDED'].includes(String(rawStaticFire).trim().toUpperCase());
        const staticFireStr = hasStaticFireDate ? `First Static Fire: ${rawStaticFire}` : '';

        // Build array of bottom metadata lines so we can filter empty ones out
        const bottomLines = [
            `Status: ${status}`,
            cryoStr,
            staticFireStr,
            launchStr
        ].filter(Boolean); // Keeps only non-empty strings

        const card = document.createElement('a');
        card.className = 'card card-link';
        card.href = buildVehiclePageUrl(vehicle);
        card.style.display = 'block';
        card.style.textDecoration = 'none';
        card.style.color = 'inherit';
        card.innerHTML = `
            <div class="card-tag">${escapeHTML(status)} • ${escapeHTML(booster)}${escapeHTML(location)}</div>
            <h3>${escapeHTML(vehicle)}</h3>
            <p>${escapeHTML(notes)}</p>
            <div style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--accent-cyan); margin-top: auto;">
                ${bottomLines.map(line => escapeHTML(line)).join('<br>')}
            </div>
        `;

        container.appendChild(card);
    });
}

function buildVehiclePageUrl(vehicle) {
    const cleanVehicle = String(vehicle || '').trim();
    if (!cleanVehicle) {
        return '/vehicles/';
    }

    return `/vehicles/${encodeURIComponent(cleanVehicle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}/`;
}

function findMatchingRow(dataSource, candidateName) {
    return dataSource.find(item => {
        const rowValue = getFirstValue(item, ['VEHICLE', 'Vehicle', 'vehicle', 'BOOSTER', 'Booster', 'booster', 'NAME', 'Name', 'name']);
        return rowValue && normalizeName(rowValue) === candidateName;
    });
}

function normalizeName(value) {
    return String(value || '').toUpperCase().trim();
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

// Security Helper
function escapeHTML(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}