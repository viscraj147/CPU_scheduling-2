/**
 * Real-Time Simulation Page Controller
 * Manages dynamic process inputs, step-based execution,
 * and live visualization of arrays, queues, and CPU registers.
 */

(function () {
    let currentAlgorithm = 'fcfs';
    let simulationResult = null;
    let currentStepIdx = 0;
    let isPlaying = false;
    let playTimer = null;
    let playSpeed = 1000; // ms

    // DOM Elements
    const elements = {};

    function initDOMElements() {
        elements.tableBody = document.getElementById('process-table-body');
        elements.btnAddRow = document.getElementById('btn-add-row');
        elements.btnResetData = document.getElementById('btn-reset-data');
        elements.btnLoadSample = document.getElementById('btn-load-sample');
        
        elements.algoButtons = document.querySelectorAll('.algo-btn');
        elements.quantumContainer = document.getElementById('quantum-container');
        elements.inputQuantum = document.getElementById('input-quantum');
        elements.chkAging = document.getElementById('chk-aging');
        elements.inputAgingInterval = document.getElementById('input-aging-interval');
        elements.inputStarvation = document.getElementById('input-starvation');

        elements.btnPlay = document.getElementById('btn-play');
        elements.btnPause = document.getElementById('btn-pause');
        elements.btnNext = document.getElementById('btn-next');
        elements.btnPrev = document.getElementById('btn-prev');
        elements.btnResetSim = document.getElementById('btn-reset-sim');
        elements.btnReplay = document.getElementById('btn-replay');
        elements.selectSpeed = document.getElementById('select-speed');

        elements.clockDisplay = document.getElementById('cpu-clock');
        elements.cpuPid = document.getElementById('cpu-executing-pid');
        elements.cpuMeta = document.getElementById('cpu-executing-meta');

        elements.eventTitle = document.getElementById('event-title');
        elements.eventDesc = document.getElementById('event-desc');
        elements.eventTrace = document.getElementById('event-trace');

        elements.arrayContainer = document.getElementById('ds-array-container');
        elements.queueContainer = document.getElementById('ds-queue-container');
        elements.queueFrontLabel = document.getElementById('queue-front-val');
        elements.queueRearLabel = document.getElementById('queue-rear-val');

        elements.cqContainer = document.getElementById('circular-queue-section');
        elements.cqSlots = document.getElementById('cq-slots-track');

        elements.ganttChart = document.getElementById('gantt-chart-bar');
        elements.dashStatus = document.getElementById('dash-status');
        elements.dashAlgo = document.getElementById('dash-algo');
        elements.dashSwitches = document.getElementById('dash-switches');
    }

    function setupEventListeners() {
        // Add row
        elements.btnAddRow.addEventListener('click', () => {
            const rows = elements.tableBody.querySelectorAll('tr');
            const nextPid = rows.length + 1;
            addProcessRow({ id: nextPid, arrival: nextPid - 1, burst: 3, priority: 2 });
            prepareSimulation(true);
        });

        // Reset to default sample
        elements.btnResetData.addEventListener('click', () => {
            loadDataset(CPUStorage.DEFAULT_DATASET);
            prepareSimulation(true);
        });

        // Load sample
        elements.btnLoadSample.addEventListener('click', () => {
            loadDataset(CPUStorage.DEFAULT_DATASET);
            prepareSimulation(true);
        });

        // Algorithm switches
        elements.algoButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                elements.algoButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentAlgorithm = btn.getAttribute('data-algo');
                
                if (currentAlgorithm === 'rr') {
                    elements.quantumContainer.style.display = 'inline-flex';
                    elements.cqContainer.style.display = 'block';
                } else {
                    elements.quantumContainer.style.display = 'none';
                    elements.cqContainer.style.display = 'none';
                }

                if (elements.dashAlgo) {
                    elements.dashAlgo.textContent = currentAlgorithm.toUpperCase();
                }

                prepareSimulation(true);
            });
        });

        // Check for URL query param to pre-select algorithm (e.g. simulation.html?algo=srtf)
        const urlParams = new URLSearchParams(window.location.search);
        const algoParam = urlParams.get('algo');
        if (algoParam) {
            const targetBtn = document.querySelector(`.algo-btn[data-algo="${algoParam}"]`);
            if (targetBtn) {
                targetBtn.click();
            }
        }

        // Speed changes
        elements.selectSpeed.addEventListener('change', (e) => {
            playSpeed = parseInt(e.target.value, 10) || 1000;
            if (isPlaying) {
                clearInterval(playTimer);
                playTimer = setInterval(stepForward, playSpeed);
            }
        });

        // Controls
        elements.btnPlay.addEventListener('click', startPlay);
        elements.btnPause.addEventListener('click', pausePlay);
        elements.btnNext.addEventListener('click', () => {
            pausePlay();
            stepForward();
        });
        elements.btnPrev.addEventListener('click', () => {
            pausePlay();
            stepBackward();
        });
        elements.btnResetSim.addEventListener('click', () => {
            pausePlay();
            currentStepIdx = 0;
            renderCurrentSnapshot();
        });
        elements.btnReplay.addEventListener('click', () => {
            pausePlay();
            currentStepIdx = 0;
            renderCurrentSnapshot();
            startPlay();
        });

        // Table input changes auto-prepare simulation
        elements.tableBody.addEventListener('input', () => {
            prepareSimulation(false);
        });
    }

    function addProcessRow(data) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 700; color: var(--primary);">P${data.id}</td>
            <td><input type="number" class="input-at" min="0" value="${data.arrival}" data-pid="${data.id}"></td>
            <td><input type="number" class="input-bt" min="1" value="${data.burst}" data-pid="${data.id}"></td>
            <td><input type="number" class="input-pr" min="1" value="${data.priority}" data-pid="${data.id}"></td>
            <td>
                <button type="button" class="btn btn-secondary btn-sm btn-delete-row" title="Remove Process">&times;</button>
            </td>
        `;

        tr.querySelector('.btn-delete-row').addEventListener('click', () => {
            if (elements.tableBody.querySelectorAll('tr').length <= 1) {
                alert('At least one process is required.');
                return;
            }
            tr.remove();
            prepareSimulation(true);
        });

        elements.tableBody.appendChild(tr);
    }

    function loadDataset(dataset) {
        elements.tableBody.innerHTML = '';
        dataset.forEach(p => addProcessRow(p));
    }

    function getProcessesFromTable() {
        const rows = elements.tableBody.querySelectorAll('tr');
        const processes = [];
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const at = parseInt(row.querySelector('.input-at').value, 10);
            const bt = parseInt(row.querySelector('.input-bt').value, 10);
            const pr = parseInt(row.querySelector('.input-pr').value, 10);
            const pid = parseInt(row.querySelector('.input-at').getAttribute('data-pid'), 10) || (i + 1);

            if (isNaN(at) || at < 0 || isNaN(bt) || bt <= 0 || isNaN(pr) || pr < 1) {
                return null;
            }

            processes.push({
                id: pid,
                arrival: at,
                burst: bt,
                priority: pr
            });
        }
        return processes;
    }

    function prepareSimulation(resetIndex = true) {
        const processes = getProcessesFromTable();
        if (!processes || processes.length === 0) return;

        // Save active dataset
        CPUStorage.setActiveDataset(processes);

        const quantum = parseInt(elements.inputQuantum.value, 10) || 2;
        const agingEnabled = elements.chkAging.checked;
        const agingInterval = parseInt(elements.inputAgingInterval.value, 10) || 3;
        const starvationThreshold = parseInt(elements.inputStarvation.value, 10) || 10;

        simulationResult = CPUEngine.runSimulation(processes, {
            algo: currentAlgorithm,
            quantum: quantum,
            agingEnabled: agingEnabled,
            agingInterval: agingInterval,
            starvationThreshold: starvationThreshold
        });

        if (resetIndex || currentStepIdx >= simulationResult.snapshots.length) {
            currentStepIdx = 0;
        }

        renderCurrentSnapshot();
    }

    function startPlay() {
        if (!simulationResult) prepareSimulation();
        if (isPlaying) return;

        isPlaying = true;
        elements.btnPlay.disabled = true;
        elements.btnPause.disabled = false;
        if (elements.dashStatus) elements.dashStatus.textContent = 'Simulating...';

        playTimer = setInterval(() => {
            if (currentStepIdx < simulationResult.snapshots.length - 1) {
                stepForward();
            } else {
                pausePlay();
                // Auto-save completed run to history
                CPUStorage.addHistoryEntry({
                    algo: currentAlgorithm,
                    algoName: simulationResult.metadata.name,
                    quantum: parseInt(elements.inputQuantum.value, 10) || 2,
                    processes: simulationResult.processes,
                    metrics: simulationResult.metrics,
                    gantt: simulationResult.gantt
                });
            }
        }, playSpeed);
    }

    function pausePlay() {
        isPlaying = false;
        clearInterval(playTimer);
        playTimer = null;
        elements.btnPlay.disabled = false;
        elements.btnPause.disabled = true;
        if (elements.dashStatus) elements.dashStatus.textContent = 'Paused';
    }

    function stepForward() {
        if (!simulationResult) return;
        if (currentStepIdx < simulationResult.snapshots.length - 1) {
            currentStepIdx++;
            renderCurrentSnapshot();
        } else {
            pausePlay();
        }
    }

    function stepBackward() {
        if (!simulationResult) return;
        if (currentStepIdx > 0) {
            currentStepIdx--;
            renderCurrentSnapshot();
        }
    }

    /**
     * Render the active snapshot at currentStepIdx
     */
    function renderCurrentSnapshot() {
        if (!simulationResult || !simulationResult.snapshots[currentStepIdx]) return;
        const snap = simulationResult.snapshots[currentStepIdx];

        // 1. Clock Display
        elements.clockDisplay.textContent = `T = ${snap.time}`;
        if (elements.dashSwitches) elements.dashSwitches.textContent = snap.contextSwitches;

        // 2. CPU Register Core
        if (snap.runningId !== 'IDLE') {
            elements.cpuPid.textContent = `P${snap.runningId}`;
            elements.cpuPid.className = 'cpu-executing-pid';
            if (currentAlgorithm === 'rr') {
                elements.cpuMeta.textContent = `Remaining: ${snap.runningRemaining} | Slice: ${snap.runningSlice}/${snap.quantum}`;
            } else {
                elements.cpuMeta.textContent = `Remaining Burst: ${snap.runningRemaining}`;
            }
        } else {
            elements.cpuPid.textContent = 'IDLE';
            elements.cpuPid.className = 'cpu-executing-pid idle';
            elements.cpuMeta.textContent = 'No ready process dispatched';
        }

        // 3. Event Explanation & C++ Trace
        elements.eventTitle.textContent = snap.events.length > 0 ? snap.events[0].title : `Simulation Step at T=${snap.time}`;
        elements.eventDesc.textContent = snap.dsExplanation;
        elements.eventTrace.textContent = snap.codeTrace;

        // 4. Process Array Rendering (Contiguous Struct Array)
        renderProcessArray(snap.pArray, snap.runningId);

        // 5. FIFO Ready Queue Rendering
        renderReadyQueue(snap.readyQueue);

        // 6. Circular Queue Rendering (if Round Robin)
        if (currentAlgorithm === 'rr' && snap.circularQueue) {
            renderCircularQueue(snap.circularQueue);
        }

        // 7. Live Gantt Chart Rendering
        renderGanttChart(snap.gantt, snap.time);

        // Button states
        elements.btnPrev.disabled = (currentStepIdx === 0);
        elements.btnNext.disabled = (currentStepIdx === simulationResult.snapshots.length - 1);
    }

    function renderProcessArray(pArray, runningId) {
        elements.arrayContainer.innerHTML = pArray.map(p => {
            let stateClass = 'ready';
            if (p.status === 'RUNNING') stateClass = 'running';
            else if (p.status === 'COMPLETED') stateClass = 'completed';
            else if (p.status === 'NOT_ARRIVED') stateClass = 'not-arrived';

            return `
                <div class="process-cell ${stateClass}" data-pid="${p.id}" title="Click to inspect p[${p.index}]">
                    <div class="cell-header">
                        <span class="cell-index-tag">p[${p.index}]</span>
                        <span class="cell-pid-tag">P${p.id}</span>
                        <span class="pill ${stateClass === 'running' ? 'pill-running' : (stateClass === 'ready' ? 'pill-waiting' : 'pill-idle')}">${p.status}</span>
                    </div>
                    <div class="cell-grid-fields">
                        <span>Arrival: <strong>${p.arrival}</strong></span>
                        <span>Burst: <strong>${p.burst}</strong></span>
                        <span>Remaining: <strong>${p.remaining}</strong></span>
                        <span>Priority: <strong>${p.priority}</strong></span>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderReadyQueue(readyQueue) {
        if (!readyQueue || readyQueue.length === 0) {
            elements.queueContainer.innerHTML = `<span style="color: var(--text-muted); font-style: italic; font-size: 0.88rem;">[ Ready Queue is currently Empty ]</span>`;
            if (elements.queueFrontLabel) elements.queueFrontLabel.textContent = '0';
            if (elements.queueRearLabel) elements.queueRearLabel.textContent = '0';
            return;
        }

        if (elements.queueFrontLabel) elements.queueFrontLabel.textContent = '0';
        if (elements.queueRearLabel) elements.queueRearLabel.textContent = readyQueue.length.toString();

        elements.queueContainer.innerHTML = readyQueue.map((item, idx) => `
            <div class="queue-element-item">
                <span style="font-size: 0.72rem; color: #64748b;">[${idx}]</span>
                <span>P${item.id}</span>
                <span style="font-size: 0.75rem; color: #2563eb;">rem:${item.remaining}</span>
            </div>
        `).join('');
    }

    function renderCircularQueue(cq) {
        if (!elements.cqSlots) return;
        elements.cqSlots.innerHTML = cq.slots.map((slot, idx) => {
            const isFront = (idx === cq.front && cq.count > 0);
            const isRear = (idx === cq.rear);
            const isOccupied = slot !== null;

            let pointerBadge = '';
            if (isFront && isRear) {
                pointerBadge = `<span class="cq-pointer-badge badge-front">F,R</span>`;
            } else if (isFront) {
                pointerBadge = `<span class="cq-pointer-badge badge-front">FRONT</span>`;
            } else if (isRear) {
                pointerBadge = `<span class="cq-pointer-badge badge-rear">REAR</span>`;
            }

            return `
                <div class="cq-slot-cell ${isOccupied ? 'occupied' : ''} ${isFront ? 'is-front' : ''}">
                    <span class="cq-slot-index">[${idx}]</span>
                    <span>${isOccupied ? `P${slot.id}` : '&mdash;'}</span>
                    ${isOccupied ? `<small style="font-size: 0.65rem;">r:${slot.remaining}</small>` : ''}
                    ${pointerBadge}
                </div>
            `;
        }).join('');
    }

    function renderGanttChart(gantt, currentTime) {
        elements.ganttChart.innerHTML = '';
        if (!gantt || gantt.length === 0) return;

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

            elements.ganttChart.appendChild(seg);
        });
    }

    // Initialize on DOM load
    document.addEventListener('DOMContentLoaded', () => {
        initDOMElements();
        setupEventListeners();
        loadDataset(CPUStorage.getActiveDataset());
        prepareSimulation(true);
    });

})();
