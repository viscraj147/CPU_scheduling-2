/**
 * Results & Analytics Page Controller
 * Reads the active dataset, computes metrics, renders charts,
 * compares all 6 algorithms, and generates CSV exports.
 */

(function () {
    let currentDataset = null;
    let selectedAlgo = 'fcfs';
    let currentResult = null;

    function init() {
        currentDataset = CPUStorage.getActiveDataset();
        
        // Algorithm selector dropdown in header
        const algoSelect = document.getElementById('select-result-algo');
        if (algoSelect) {
            algoSelect.addEventListener('change', (e) => {
                selectedAlgo = e.target.value;
                calculateAndRender();
            });
        }

        // CSV Export button
        document.getElementById('btn-export-csv').addEventListener('click', () => {
            if (currentResult) {
                CPUStorage.exportToCSV(currentResult.processes, currentResult.metrics, currentResult.metadata.name);
            }
        });

        // Print Report button
        document.getElementById('btn-print-report').addEventListener('click', () => {
            window.print();
        });

        calculateAndRender();
    }

    function calculateAndRender() {
        if (!currentDataset || currentDataset.length === 0) return;

        // Run simulation on active dataset
        currentResult = CPUEngine.runSimulation(currentDataset, {
            algo: selectedAlgo,
            quantum: 2,
            agingEnabled: true,
            agingInterval: 3
        });

        const p = currentResult.processes;
        const m = currentResult.metrics;

        // 1. Metric tiles
        document.getElementById('res-avg-wt').textContent = m.avgWT.toFixed(2);
        document.getElementById('res-avg-tat').textContent = m.avgTAT.toFixed(2);
        document.getElementById('res-avg-rt').textContent = m.avgRT.toFixed(2);
        document.getElementById('res-cpu-util').textContent = `${m.cpuUtilization.toFixed(1)}%`;
        document.getElementById('res-switches').textContent = m.contextSwitches;
        document.getElementById('res-throughput').textContent = m.throughput.toFixed(3);
        document.getElementById('res-total-time').textContent = m.totalTimeline;

        // 2. Process Results Table
        renderProcessTable(p);

        // 3. Gantt Chart
        renderGantt(currentResult.gantt);

        // 4. CPU Utilization Bar Chart
        renderUtilChart(p, m.totalBusy, m.totalTimeline, m.cpuUtilization);

        // 5. Starvation Alert
        renderStarvationAlert(m.starved);

        // 6. Multi-Algorithm Comparison Matrix
        renderComparisonMatrix(currentDataset);
    }

    function renderProcessTable(processes) {
        const tbody = document.getElementById('results-table-body');
        tbody.innerHTML = processes.map(p => {
            const isStarved = p.waiting >= 10 || (p.waiting > p.burst * 2.5 && p.waiting >= 6);
            return `
                <tr>
                    <td><strong>P${p.id}</strong></td>
                    <td>${p.arrival}</td>
                    <td>${p.burst}</td>
                    <td>${p.priority}</td>
                    <td>${p.completion}</td>
                    <td>${p.turnaround}</td>
                    <td><strong>${p.waiting}</strong></td>
                    <td>${p.responseTime}</td>
                    <td>${isStarved ? '<span class="pill pill-starved">Starvation</span>' : '<span class="pill pill-running">Completed</span>'}</td>
                </tr>
            `;
        }).join('');
    }

    function renderGantt(gantt) {
        const wrapper = document.getElementById('results-gantt-chart');
        wrapper.innerHTML = '';

        gantt.forEach((block, idx) => {
            const duration = block.end - block.start;
            const seg = document.createElement('div');
            seg.className = 'gantt-segment';

            if (block.id === 'IDLE') {
                seg.classList.add('idle');
                seg.textContent = 'Idle';
            } else {
                const colorIdx = ((block.id - 1) % 8) + 1;
                seg.classList.add(`pid-${colorIdx}`);
                seg.textContent = `P${block.id}`;
            }

            seg.style.flex = `${duration} 0 ${Math.max(duration * 24, 38)}px`;

            if (idx === 0) {
                const startMarker = document.createElement('span');
                startMarker.className = 'time-marker-start';
                startMarker.textContent = block.start;
                seg.appendChild(startMarker);
            }

            const endMarker = document.createElement('span');
            endMarker.className = 'time-marker-end';
            endMarker.textContent = block.end;
            seg.appendChild(endMarker);

            wrapper.appendChild(seg);
        });
    }

    function renderUtilChart(processes, totalBusy, totalTimeline, overallUtil) {
        const barsArea = document.getElementById('results-util-bars');
        if (!barsArea) return;
        barsArea.innerHTML = '';

        const effectiveTimeline = totalTimeline > 0 ? totalTimeline : 1;

        // Process columns
        processes.forEach(p => {
            const pct = ((p.burst / effectiveTimeline) * 100).toFixed(1);
            const col = document.createElement('div');
            col.className = 'chart-bar-col';
            col.innerHTML = `
                <div class="chart-bar-fill" style="height: ${Math.max(pct, 4)}%;">
                    <span class="chart-bar-val">${pct}%</span>
                </div>
                <span class="chart-bar-label">P${p.id}</span>
            `;
            barsArea.appendChild(col);
        });

        // Idle column
        const idle = Math.max(0, effectiveTimeline - totalBusy);
        const idlePct = ((idle / effectiveTimeline) * 100).toFixed(1);
        const idleCol = document.createElement('div');
        idleCol.className = 'chart-bar-col';
        idleCol.innerHTML = `
            <div class="chart-bar-fill bar-idle" style="height: ${Math.max(idlePct, 4)}%;">
                <span class="chart-bar-val">${idlePct}%</span>
            </div>
            <span class="chart-bar-label">Idle</span>
        `;
        barsArea.appendChild(idleCol);

        // Overall total column
        const totalCol = document.createElement('div');
        totalCol.className = 'chart-bar-col';
        totalCol.innerHTML = `
            <div class="chart-bar-fill bar-total" style="height: ${Math.max(overallUtil.toFixed(1), 4)}%;">
                <span class="chart-bar-val">${overallUtil.toFixed(1)}%</span>
            </div>
            <span class="chart-bar-label">Total</span>
        `;
        barsArea.appendChild(totalCol);
    }

    function renderStarvationAlert(starvedList) {
        const box = document.getElementById('results-starvation-box');
        if (!box) return;

        if (starvedList && starvedList.length > 0) {
            box.style.display = 'block';
            box.innerHTML = `
                <strong>⚠️ Potential Starvation Detected:</strong>
                <p style="margin-top: 4px; font-size: 0.88rem;">
                    The following process(es) experienced high waiting times: 
                    ${starvedList.map(p => `<strong>P${p.id}</strong> (Waiting: ${p.waiting} units)`).join(', ')}. 
                    Consider enabling the Aging Mechanism in Priority scheduling.
                </p>
            `;
        } else {
            box.style.display = 'none';
        }
    }

    function renderComparisonMatrix(dataset) {
        const comp = CPUEngine.compareAll(dataset, 2, true, 3);
        const tbody = document.getElementById('results-comparison-tbody');
        if (!tbody) return;

        tbody.innerHTML = comp.results.map(r => {
            const isBest = (r.key === comp.best.key);
            return `
                <tr class="${isBest ? 'row-winner' : ''}">
                    <td><strong>${r.shortName}</strong> ${isBest ? '🏆' : ''}</td>
                    <td>${r.type}</td>
                    <td><strong>${r.avgWT.toFixed(2)}</strong></td>
                    <td>${r.avgTAT.toFixed(2)}</td>
                    <td>${r.avgRT.toFixed(2)}</td>
                    <td>${r.contextSwitches}</td>
                    <td>${r.cpuUtil.toFixed(1)}%</td>
                    <td>${isBest ? '<span class="pill pill-running">Optimal</span>' : 'Standard'}</td>
                </tr>
            `;
        }).join('');

        // Recommendation card
        const recCard = document.getElementById('results-winner-card');
        if (recCard) {
            recCard.innerHTML = `
                <div style="font-size: 1.6rem;">🏆</div>
                <div>
                    <strong style="color: #1e40af; font-size: 1.05rem;">Recommended Algorithm: ${comp.best.name}</strong>
                    <p style="font-size: 0.9rem; color: #1e293b; margin-top: 2px;">
                        Achieves minimal Average Waiting Time (${comp.best.avgWT.toFixed(2)} units) and Average Turnaround Time (${comp.best.avgTAT.toFixed(2)} units) with ${comp.best.contextSwitches} context switches.
                    </p>
                </div>
            `;
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})();
