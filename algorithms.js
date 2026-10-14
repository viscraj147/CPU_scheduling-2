/**
 * Algorithms Page Controller
 * Reuses CPUEngine to dynamically compute examples, Gantt charts,
 * and comparative metrics for all 6 CPU Scheduling algorithms.
 */

(function () {
    const SAMPLE_WORKLOAD = [
        { id: 1, arrival: 0, burst: 5, priority: 2 },
        { id: 2, arrival: 1, burst: 3, priority: 1 },
        { id: 3, arrival: 2, burst: 4, priority: 3 },
        { id: 4, arrival: 4, burst: 2, priority: 4 }
    ];

    const ALGO_DETAILS = {
        'fcfs': {
            name: 'First Come First Serve (FCFS)',
            type: 'Non-Preemptive',
            ds: 'Linear FIFO Ready Queue (queue[front], queue[rear])',
            selection: 'Process with the smallest arrival time (AT). Tie-break: Smallest PID.',
            complexity: 'Time: O(N) selection or O(1) with FIFO queue | Space: O(N)',
            advantages: [
                'Simplest scheduling algorithm to implement.',
                'Zero context switching overhead during a process\'s run.',
                'Completely fair in arrival chronological order (No starvation).'
            ],
            limitations: [
                'Convoy Effect: Short processes must wait behind long CPU-bound jobs.',
                'Sub-optimal Average Waiting Time compared to SJF/SRTF.',
                'Unsuitable for interactive time-sharing systems.'
            ]
        },
        'sjf': {
            name: 'Shortest Job First (SJF Non-Preemptive)',
            type: 'Non-Preemptive',
            ds: 'Min-Heap or Sorted Array by Burst Time',
            selection: 'Arrived process with the smallest initial Burst Time (BT). Tie-break: Earliest AT.',
            complexity: 'Time: O(N) linear array scan or O(log N) Min-Heap | Space: O(N)',
            advantages: [
                'Mathematically provable minimal Average Waiting Time for simultaneous arrivals.',
                'High system throughput for batches with varied job lengths.',
                'Fewer context switches than preemptive SRTF.'
            ],
            limitations: [
                'Requires prior knowledge or prediction of future CPU burst lengths.',
                'Long jobs can suffer from Starvation if short processes continuously arrive.',
                'Non-preemptive nature cannot handle urgent incoming high-priority jobs.'
            ]
        },
        'srtf': {
            name: 'Shortest Remaining Time First (SRTF)',
            type: 'Preemptive',
            ds: 'Dynamic Min-Heap (Key = Remaining Burst Time)',
            selection: 'Process with the smallest remaining burst time at each integer clock tick.',
            complexity: 'Time: O(N) linear scan or O(log N) heap per tick | Space: O(N)',
            advantages: [
                'Guarantees the lowest possible Average Waiting Time among all schedulers.',
                'Short jobs execute immediately upon arrival without delay.',
                'Highly responsive to bursts of lightweight tasks.'
            ],
            limitations: [
                'Higher context switching overhead increases CPU register reload times.',
                'Risk of severe Starvation for long-running CPU-bound tasks.',
                'Needs accurate real-time tracking of remaining execution times.'
            ]
        },
        'rr': {
            name: 'Round Robin (RR)',
            type: 'Preemptive (Time Slice)',
            ds: 'Circular Ring Buffer / Circular Queue (rear = (rear + 1) % size)',
            selection: 'FIFO order from front of circular queue; allocated at most Time Quantum units.',
            complexity: 'Time: O(1) enqueue and dequeue operations | Space: O(N) ring buffer',
            advantages: [
                'Ideal for interactive, multi-user, time-sharing operating systems.',
                'Guaranteed upper bound on response time: (N - 1) * Quantum.',
                'Starvation-free: every active process is guaranteed periodic CPU attention.'
            ],
            limitations: [
                'Performance is heavily dependent on the chosen Time Quantum.',
                'Small quantum leads to excessive context switching overhead.',
                'Large quantum degrades Round Robin into simple FCFS.'
            ]
        },
        'priority-np': {
            name: 'Priority Scheduling (Non-Preemptive)',
            type: 'Non-Preemptive',
            ds: 'Priority Queue / Contiguous Array Scan for Max Priority (Lowest #)',
            selection: 'Arrived process with highest priority (lowest numeric integer). Tie-break: Earliest AT.',
            complexity: 'Time: O(N) linear scan or O(log N) with priority queue | Space: O(N)',
            advantages: [
                'Allows system-critical and urgent tasks to take precedence over regular tasks.',
                'Intuitive priority hierarchy mapping directly to operating system levels.',
                'No preemption overhead once a job begins execution.'
            ],
            limitations: [
                'Starvation (Indefinite Blocking): Low priority jobs may never execute if high priority jobs persist.',
                'Requires an Aging Mechanism to gradually promote waiting jobs.',
                'Priority inversion can occur in real-time embedded systems.'
            ]
        },
        'priority-p': {
            name: 'Priority Scheduling (Preemptive)',
            type: 'Preemptive',
            ds: 'Priority Queue + Aging Counter per process',
            selection: 'Highest priority process; preempts running job if higher priority process arrives.',
            complexity: 'Time: O(N) scan per tick or O(log N) heap update | Space: O(N)',
            advantages: [
                'Immediate responsiveness for urgent high-priority events.',
                'Real-time task scheduling capability.',
                'Aging mechanism reliably elevates long-waiting tasks to prevent starvation.'
            ],
            limitations: [
                'Frequent preemption increases context switch overhead.',
                'Complex synchronization required when sharing shared memory or kernel locks.'
            ]
        }
    };

    let activeAlgo = 'fcfs';

    function init() {
        const tabBtns = document.querySelectorAll('.algo-nav-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeAlgo = btn.getAttribute('data-algo');
                renderAlgorithmDeepDive(activeAlgo);
            });
        });

        // "Try this algorithm" button handler
        document.getElementById('btn-try-algo').addEventListener('click', () => {
            window.location.href = `simulation.html?algo=${activeAlgo}`;
        });

        renderAlgorithmDeepDive(activeAlgo);
    }

    function renderAlgorithmDeepDive(algoKey) {
        const meta = ALGO_DETAILS[algoKey];
        if (!meta) return;

        // Run simulation on sample dataset using CPUEngine
        const result = CPUEngine.runSimulation(SAMPLE_WORKLOAD, {
            algo: algoKey,
            quantum: 2,
            agingEnabled: true,
            agingInterval: 3
        });

        document.getElementById('algo-name-title').textContent = meta.name;
        document.getElementById('algo-type-pill').textContent = meta.type;
        document.getElementById('algo-type-pill').className = `pill ${meta.type.includes('Preemptive') && !meta.type.includes('Non') ? 'pill-running' : 'pill-idle'}`;
        document.getElementById('algo-ds-text').textContent = meta.ds;
        document.getElementById('algo-selection-text').textContent = meta.selection;
        document.getElementById('algo-complexity-text').textContent = meta.complexity;

        // Lists
        const advList = document.getElementById('algo-adv-list');
        advList.innerHTML = meta.advantages.map(a => `<li>${a}</li>`).join('');

        const limList = document.getElementById('algo-lim-list');
        limList.innerHTML = meta.limitations.map(l => `<li>${l}</li>`).join('');

        // Metrics Summary
        document.getElementById('stat-avg-wt').textContent = result.metrics.avgWT.toFixed(2);
        document.getElementById('stat-avg-tat').textContent = result.metrics.avgTAT.toFixed(2);
        document.getElementById('stat-avg-rt').textContent = result.metrics.avgRT.toFixed(2);
        document.getElementById('stat-switches').textContent = result.metrics.contextSwitches;
        document.getElementById('stat-util').textContent = `${result.metrics.cpuUtilization.toFixed(1)}%`;

        // Render Example Gantt Chart
        renderExampleGantt(result.gantt);

        // Render Results Table
        renderExampleTable(result.processes);
    }

    function renderExampleGantt(gantt) {
        const wrapper = document.getElementById('algo-gantt-chart');
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

            seg.style.flex = `${duration} 0 ${Math.max(duration * 24, 40)}px`;

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

    function renderExampleTable(processes) {
        const tbody = document.getElementById('algo-sample-table-body');
        tbody.innerHTML = processes.map(p => `
            <tr>
                <td><strong>P${p.id}</strong></td>
                <td>${p.arrival}</td>
                <td>${p.burst}</td>
                <td>${p.priority}</td>
                <td>${p.completion}</td>
                <td>${p.turnaround}</td>
                <td><strong>${p.waiting}</strong></td>
                <td>${p.responseTime}</td>
            </tr>
        `).join('');
    }

    document.addEventListener('DOMContentLoaded', init);
})();
