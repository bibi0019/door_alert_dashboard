const API_BASE = window.location.origin;

const REFRESH_INTERVAL = 2000;
let autoRefreshTimer = null;
let isAutoRefreshEnabled = true;
let lastUpdateTime = null;

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/api/stats`);
        const stats = await response.json();

        document.getElementById('totalEvents').textContent = stats.totalEvents;
        document.getElementById('todayEvents').textContent = stats.todayEvents;

        const statusDisplay = document.getElementById('currentStatus');
        const statusIcon = statusDisplay.querySelector('.status-icon');
        const statusText = statusDisplay.querySelector('.status-text');
        const statusTime = statusDisplay.querySelector('.status-time');

        if (stats.currentStatus === 'open') {
            statusIcon.textContent = '';
            statusText.textContent = 'Door is Open';
            statusDisplay.className = 'status-display open';
        } else if (stats.currentStatus === 'closed') {
            statusIcon.textContent = '';
            statusText.textContent = 'Door is Closed';
            statusDisplay.className = 'status-display closed';
        } else {
            statusIcon.textContent = '';
            statusText.textContent = 'Unknown Status';
            statusDisplay.className = 'status-display';
        }

        if (stats.lastUpdate) {
            statusTime.textContent = `Last updated: ${formatRelativeTime(stats.lastUpdate)}`;
        } else {
            statusTime.textContent = 'No events recorded';
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadEvents() {
    try {
        const response = await fetch(`${API_BASE}/api/events?limit=50`);
        const events = await response.json();

        const tbody = document.getElementById('eventsTableBody');

        if (events.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="loading-cell">No events recorded yet</td></tr>';
            return;
        }

        tbody.innerHTML = events.map(event => {
            const statusClass = event.status === 'open' ? 'open' : 'closed';
            const statusLabel = event.status === 'open' ? 'Open' : 'Closed';

            return `
        <tr>
          <td>
            <span class="status-badge ${statusClass}">
              <span class="status-dot"></span>
              ${statusLabel}
            </span>
          </td>
          <td>${formatTime(event.timestamp)}</td>
          <td>${formatDate(event.timestamp)}</td>
        </tr>
      `;
        }).join('');

        updateChart(events);
    } catch (error) {
        console.error('Error loading events:', error);
        const tbody = document.getElementById('eventsTableBody');
        tbody.innerHTML = '<tr><td colspan="3" class="loading-cell">Error loading events</td></tr>';
    }
}

let activityChart = null;

function updateChart(events) {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;

    const now = Date.now();
    const last24Hours = now - (24 * 60 * 60 * 1000);

    const hourlyData = new Array(24).fill(0);
    const labels = [];

    for (let i = 23; i >= 0; i--) {
        const hourTime = new Date(now - (i * 60 * 60 * 1000));
        labels.push(hourTime.getHours() + ':00');
    }

    events.forEach(event => {
        if (event.timestamp >= last24Hours) {
            const hoursAgo = Math.floor((now - event.timestamp) / (60 * 60 * 1000));
            if (hoursAgo < 24) {
                hourlyData[23 - hoursAgo]++;
            }
        }
    });

    if (activityChart) {
        activityChart.destroy();
    }

    activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Events per Hour',
                data: hourlyData,
                borderColor: '#0d6efd',
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: 3,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        color: '#6c757d'
                    },
                    grid: {
                        color: '#dee2e6'
                    }
                },
                x: {
                    ticks: {
                        color: '#6c757d',
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 12
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

async function refreshData() {
    const refreshBtn = document.getElementById('refreshBtn');
    refreshBtn.style.pointerEvents = 'none';

    await Promise.all([loadStats(), loadEvents()]);

    lastUpdateTime = Date.now();
    updateLastUpdateDisplay();

    setTimeout(() => {
        refreshBtn.style.pointerEvents = 'auto';
    }, 1000);

    if (isAutoRefreshEnabled) {
        startAutoRefresh();
    }
}

function updateLastUpdateDisplay() {
    const lastUpdateEl = document.getElementById('lastUpdate');
    if (lastUpdateEl && lastUpdateTime) {
        lastUpdateEl.textContent = `Last updated: ${formatRelativeTime(lastUpdateTime)}`;
    }
}

function startAutoRefresh() {
    if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
    }

    autoRefreshTimer = setInterval(async () => {
        if (isAutoRefreshEnabled) {
            await refreshData();
        }
    }, REFRESH_INTERVAL);
}

function stopAutoRefresh() {
    if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
        autoRefreshTimer = null;
    }
}

function toggleAutoRefresh() {
    isAutoRefreshEnabled = !isAutoRefreshEnabled;
    const toggleBtn = document.getElementById('autoRefreshToggle');
    const statusText = toggleBtn.querySelector('.toggle-status');

    if (isAutoRefreshEnabled) {
        startAutoRefresh();
        toggleBtn.classList.remove('paused');
        statusText.textContent = 'Auto-refresh: ON';
    } else {
        stopAutoRefresh();
        toggleBtn.classList.add('paused');
        statusText.textContent = 'Auto-refresh: OFF';
    }
}


async function init() {
    await refreshData();

    document.getElementById('refreshBtn').addEventListener('click', refreshData);

    const toggleBtn = document.getElementById('autoRefreshToggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleAutoRefresh);
    }

    startAutoRefresh();

    setInterval(updateLastUpdateDisplay, 1000);
}

init();
