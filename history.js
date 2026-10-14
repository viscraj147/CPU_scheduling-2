/**
 * Execution History Page Controller
 * Persistent history inspection, replay launcher, side-by-side comparison,
 * entry deletion, and storage clearance.
 */

(function () {
    let history = [];
    let selectedForCompare = [];

    function init() {
        loadAndRender();

        document.getElementById('btn-clear-history').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all simulation history records? This action cannot be undone.')) {
                CPUStorage.clearAllHistory();
                loadAndRender();
            }
        });

        document.getElementById('btn-compare-selected').addEventListener('click', () => {
            if (selectedForCompare.length !== 2) {
                alert('Please select exactly 2 simulation runs using the checkboxes to compare.');
                return;
            }
            renderSideBySideComparison(selectedForCompare[0], selectedForCompare[1]);
        });
    }

    function loadAndRender() {
        history = CPUStorage.getHistory();
        selectedForCompare = [];

        const tbody = document.getElementById('history-table-body');
        const emptyAlert = document.getElementById('history-empty-alert');
        const compareBtn = document.getElementById('btn-compare-selected');
        const compareView = document.getElementById('history-comparison-view');

        if (compareView) compareView.style.display = 'none';

        if (!history || history.length === 0) {
            tbody.innerHTML = '';
            emptyAlert.style.display = 'block';
            compareBtn.disabled = true;
            return;
        }

        emptyAlert.style.display = 'none';
        compareBtn.disabled = false;

        tbody.innerHTML = history.map((entry, idx) => `
            <tr>
                <td>
                    <input type="checkbox" class="compare-checkbox" data-id="${entry.id}">
                </td>
                <td>#${history.length - idx}</td>
                <td style="font-size: 0.82rem; color: var(--text-muted);">${entry.timestamp}</td>
                <td><strong>${entry.algoName}</strong></td>
                <td>${entry.processes.length} procs</td>
                <td><strong>${entry.metrics.avgWT ? entry.metrics.avgWT.toFixed(2) : '0.00'}</strong></td>
                <td>${entry.metrics.avgTAT ? entry.metrics.avgTAT.toFixed(2) : '0.00'}</td>
                <td>${entry.metrics.cpuUtilization ? `${entry.metrics.cpuUtilization.toFixed(1)}%` : '100%'}</td>
                <td>${entry.metrics.contextSwitches || 0}</td>
                <td>
                    <div style="display: flex; gap: 4px; justify-content: center;">
                        <button type="button" class="btn btn-secondary btn-sm btn-replay-entry" data-id="${entry.id}">Replay</button>
                        <button type="button" class="btn btn-danger btn-sm btn-delete-entry" data-id="${entry.id}">&times;</button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Attach action handlers
        tbody.querySelectorAll('.btn-replay-entry').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const entry = CPUStorage.getHistoryEntry(id);
                if (entry) {
                    CPUStorage.setActiveDataset(entry.processes);
                    window.location.href = `simulation.html?algo=${entry.algo}`;
                }
            });
        });

        tbody.querySelectorAll('.btn-delete-entry').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                CPUStorage.deleteHistoryEntry(id);
                loadAndRender();
            });
        });

        tbody.querySelectorAll('.compare-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const id = e.target.getAttribute('data-id');
                if (e.target.checked) {
                    selectedForCompare.push(id);
                } else {
                    selectedForCompare = selectedForCompare.filter(item => item !== id);
                }
            });
        });
    }

    function renderSideBySideComparison(id1, id2) {
        const e1 = CPUStorage.getHistoryEntry(id1);
        const e2 = CPUStorage.getHistoryEntry(id2);
        if (!e1 || !e2) return;

        const compareView = document.getElementById('history-comparison-view');
        compareView.style.display = 'block';
        compareView.scrollIntoView({ behavior: 'smooth' });

        document.getElementById('comp-sim1-title').textContent = `${e1.algoName} (${e1.timestamp})`;
        document.getElementById('comp-sim2-title').textContent = `${e2.algoName} (${e2.timestamp})`;

        document.getElementById('comp-sim1-wt').textContent = e1.metrics.avgWT.toFixed(2);
        document.getElementById('comp-sim2-wt').textContent = e2.metrics.avgWT.toFixed(2);

        document.getElementById('comp-sim1-tat').textContent = e1.metrics.avgTAT.toFixed(2);
        document.getElementById('comp-sim2-tat').textContent = e2.metrics.avgTAT.toFixed(2);

        document.getElementById('comp-sim1-util').textContent = `${e1.metrics.cpuUtilization.toFixed(1)}%`;
        document.getElementById('comp-sim2-util').textContent = `${e2.metrics.cpuUtilization.toFixed(1)}%`;

        document.getElementById('comp-sim1-switches').textContent = e1.metrics.contextSwitches;
        document.getElementById('comp-sim2-switches').textContent = e2.metrics.contextSwitches;
    }

    document.addEventListener('DOMContentLoaded', init);
})();
