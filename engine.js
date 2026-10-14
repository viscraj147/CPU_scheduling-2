/**
 * Deterministic CPU Scheduling & Data Structure Simulation Engine
 * Core Engine powering Simulations, Analytics, and Comparisons.
 */

const CPUEngine = (function () {

    const ALGO_METADATA = {
        'fcfs': {
            name: 'First Come First Serve (FCFS)',
            shortName: 'FCFS',
            type: 'Non-Preemptive',
            dataStructure: 'FIFO Queue / Linear Array',
            selectionCriteria: 'Earliest Arrival Time (AT)',
            timeComplexity: 'O(N) selection or O(1) with FIFO Queue',
            spaceComplexity: 'O(N)',
            description: 'Processes are dispatched in strict chronological order of arrival. Non-preemptive: once a process gains the CPU, it runs to completion.'
        },
        'sjf': {
            name: 'Shortest Job First (SJF Non-Preemptive)',
            shortName: 'SJF',
            type: 'Non-Preemptive',
            dataStructure: 'Min-Heap or Sorted Array',
            selectionCriteria: 'Smallest Burst Time (BT)',
            timeComplexity: 'O(N) linear scan or O(log N) with Min-Heap',
            spaceComplexity: 'O(N)',
            description: 'Selects the arrived process with the smallest CPU burst time. Non-preemptive. Optimal for minimizing average waiting time when all jobs arrive simultaneously.'
        },
        'srtf': {
            name: 'Shortest Remaining Time First (SRTF)',
            shortName: 'SRTF',
            type: 'Preemptive',
            dataStructure: 'Min-Heap (Key: Remaining Time)',
            selectionCriteria: 'Smallest Remaining Burst Time',
            timeComplexity: 'O(N) per tick or O(log N) heap update',
            spaceComplexity: 'O(N)',
            description: 'Preemptive variant of SJF. At each time tick, if a newly arrived process requires less remaining time than the current process, preemption occurs.'
        },
        'rr': {
            name: 'Round Robin (RR)',
            shortName: 'Round Robin',
            type: 'Preemptive (Time Slice)',
            dataStructure: 'Circular Queue / Ring Buffer',
            selectionCriteria: 'FIFO Order with Time Quantum Quota',
            timeComplexity: 'O(1) enqueue / dequeue with Circular Queue',
            spaceComplexity: 'O(N) fixed buffer',
            description: 'Each ready process receives a fixed time quantum. If execution is incomplete when the quantum expires, the process is returned to the rear of the ready queue.'
        },
        'priority-np': {
            name: 'Priority Scheduling (Non-Preemptive)',
            shortName: 'Priority (NP)',
            type: 'Non-Preemptive',
            dataStructure: 'Priority Queue (Min-Heap: Lower # = Higher Priority)',
            selectionCriteria: 'Highest Priority (Lowest Numeric Value)',
            timeComplexity: 'O(N) search or O(log N) Priority Queue',
            spaceComplexity: 'O(N)',
            description: 'Dispatches the process possessing the highest priority among all arrived jobs. Runs to completion without interruption once started.'
        },
        'priority-p': {
            name: 'Priority Scheduling (Preemptive)',
            shortName: 'Priority (Preemptive)',
            type: 'Preemptive',
            dataStructure: 'Dynamic Priority Queue with Aging',
            selectionCriteria: 'Highest Priority (Preempts if higher arrives)',
            timeComplexity: 'O(N) scan or O(log N) heap per tick',
            spaceComplexity: 'O(N)',
            description: 'At each time step, if a newly arriving process has a higher priority than the currently running job, the CPU preempts the current job.'
        }
    };

    /**
     * Deep clone utility
     */
    function deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * Run deterministic schedule simulation and produce step-by-step state snapshots
     */
    function runSimulation(rawProcesses, options = {}) {
        const algo = options.algo || 'fcfs';
        const quantum = Math.max(1, parseInt(options.quantum, 10) || 2);
        const agingEnabled = !!options.agingEnabled;
        const agingInterval = Math.max(1, parseInt(options.agingInterval, 10) || 3);
        const starvationThreshold = Math.max(1, parseInt(options.starvationThreshold, 10) || 10);

        // Sanitize and initialize processes
        const n = rawProcesses.length;
        const processes = rawProcesses.map((p, idx) => ({
            id: p.id !== undefined ? p.id : (idx + 1),
            arrival: Math.max(0, parseInt(p.arrival, 10) || 0),
            burst: Math.max(1, parseInt(p.burst, 10) || 1),
            priority: Math.max(1, parseInt(p.priority, 10) || 1),
            currentPriority: Math.max(1, parseInt(p.priority, 10) || 1),
            remaining: Math.max(1, parseInt(p.burst, 10) || 1),
            completion: 0,
            turnaround: 0,
            waiting: 0,
            responseTime: -1,
            firstExecuted: -1,
            ageCounter: 0,
            agingHistory: []
        }));

        let t = 0;
        let completed = 0;
        let running = null;
        let runSlice = 0;
        let contextSwitches = 0;
        let previousRunningId = null;

        // Circular Queue data model for Round Robin (Capacity: n + 2)
        const cqCapacity = Math.max(8, n + 2);
        let cqSlots = new Array(cqCapacity).fill(null);
        let cqFront = 0;
        let cqRear = 0;
        let cqCount = 0;

        // Standard FIFO list for ready queue tracking
        let readyQueue = [];
        let arrivedFlag = new Array(n).fill(false);

        const gantt = [];
        const snapshots = [];
        const eventLog = [];

        // Helper: Enqueue into Circular Queue
        function cqEnqueue(proc) {
            if (cqCount < cqCapacity) {
                cqSlots[cqRear] = { id: proc.id, remaining: proc.remaining, priority: proc.currentPriority };
                cqRear = (cqRear + 1) % cqCapacity;
                cqCount++;
            }
        }

        // Helper: Dequeue from Circular Queue
        function cqDequeue() {
            if (cqCount > 0) {
                const item = cqSlots[cqFront];
                cqSlots[cqFront] = null;
                cqFront = (cqFront + 1) % cqCapacity;
                cqCount--;
                return item;
            }
            return null;
        }

        // Handle t = 0 arrivals for Round Robin
        if (algo === 'rr') {
            for (let i = 0; i < n; i++) {
                if (processes[i].arrival === 0) {
                    readyQueue.push(processes[i]);
                    cqEnqueue(processes[i]);
                    arrivedFlag[i] = true;
                    eventLog.push({
                        time: 0,
                        type: 'ARRIVAL',
                        message: `Process P${processes[i].id} arrived at T=0. Enqueued into Circular Queue.`
                    });
                }
            }
        }

        const MAX_STEPS = 6000;
        let stepGuard = 0;

        while (completed < n && stepGuard < MAX_STEPS) {
            stepGuard++;
            let comparisons = 0;
            let stepEvents = [];

            // 1. Process New Arrivals at time t
            for (let i = 0; i < n; i++) {
                const proc = processes[i];
                if (!arrivedFlag[i] && proc.arrival === t) {
                    arrivedFlag[i] = true;
                    if (algo === 'rr') {
                        // In RR, new arrivals go to ready queue
                        readyQueue.push(proc);
                        cqEnqueue(proc);
                    }
                    stepEvents.push({
                        type: 'ARRIVAL',
                        title: `P${proc.id} Arrived`,
                        message: `Process P${proc.id} arrived at T=${t} (Burst: ${proc.burst}, Priority: ${proc.priority}). Added to Ready Queue.`
                    });
                }
            }

            // 2. Check Aging for waiting processes (Priority algorithms)
            if (agingEnabled && (algo === 'priority-np' || algo === 'priority-p')) {
                for (let i = 0; i < n; i++) {
                    const proc = processes[i];
                    if (proc.arrival <= t && proc.remaining > 0 && proc !== running) {
                        proc.ageCounter++;
                        if (proc.ageCounter >= agingInterval) {
                            if (proc.currentPriority > 1) {
                                const oldPr = proc.currentPriority;
                                proc.currentPriority--;
                                proc.agingHistory.push({ time: t, from: oldPr, to: proc.currentPriority });
                                stepEvents.push({
                                    type: 'AGING',
                                    title: `Aging Boost: P${proc.id}`,
                                    message: `Process P${proc.id} waited ${agingInterval} units. Priority boosted: ${oldPr} ➔ ${proc.currentPriority}.`
                                });
                            }
                            proc.ageCounter = 0;
                        }
                    }
                }
            }

            // 3. Algorithm-Specific Process Selection
            let newlyDispatched = false;
            let preempted = false;

            if (algo === 'fcfs') {
                if (!running || running.remaining === 0) {
                    const available = processes.filter(p => p.arrival <= t && p.remaining > 0);
                    comparisons += Math.max(0, available.length - 1);
                    available.sort((a, b) => a.arrival - b.arrival || a.id - b.id);
                    const next = available.length > 0 ? available[0] : null;
                    if (next !== running) {
                        running = next;
                        newlyDispatched = true;
                    }
                }
            } else if (algo === 'sjf') {
                if (!running || running.remaining === 0) {
                    const available = processes.filter(p => p.arrival <= t && p.remaining > 0);
                    comparisons += Math.max(0, available.length - 1);
                    available.sort((a, b) => a.burst - b.burst || a.arrival - b.arrival || a.id - b.id);
                    const next = available.length > 0 ? available[0] : null;
                    if (next !== running) {
                        running = next;
                        newlyDispatched = true;
                    }
                }
            } else if (algo === 'srtf') {
                const available = processes.filter(p => p.arrival <= t && p.remaining > 0);
                comparisons += Math.max(0, available.length - 1);
                available.sort((a, b) => a.remaining - b.remaining || a.arrival - b.arrival || a.id - b.id);
                const next = available.length > 0 ? available[0] : null;

                if (running && next && running.id !== next.id) {
                    preempted = true;
                    stepEvents.push({
                        type: 'PREEMPTION',
                        title: `P${running.id} Preempted`,
                        message: `SRTF Preemption: P${next.id} has shorter remaining burst (${next.remaining}) than P${running.id} (${running.remaining}). Context switch initiated.`
                    });
                }
                if (next !== running) {
                    running = next;
                    newlyDispatched = true;
                }
            } else if (algo === 'rr') {
                // Round Robin quantum slice expiration check
                if (!running || runSlice >= quantum || running.remaining === 0) {
                    if (running && running.remaining > 0) {
                        // Requeue unfinished process to rear of queue
                        readyQueue.push(running);
                        cqEnqueue(running);
                        stepEvents.push({
                            type: 'QUANTUM_EXPIRED',
                            title: `P${running.id} Quantum Expired`,
                            message: `Time slice (${quantum} units) expired for P${running.id}. Requeued at rear of Circular Queue (remaining: ${running.remaining}).`
                        });
                    }

                    if (readyQueue.length > 0) {
                        running = readyQueue.shift();
                        cqDequeue();
                        runSlice = 0;
                        newlyDispatched = true;
                    } else {
                        running = null;
                        runSlice = 0;
                    }
                }
            } else if (algo === 'priority-np') {
                if (!running || running.remaining === 0) {
                    const available = processes.filter(p => p.arrival <= t && p.remaining > 0);
                    comparisons += Math.max(0, available.length - 1);
                    available.sort((a, b) => a.currentPriority - b.currentPriority || a.arrival - b.arrival || a.id - b.id);
                    const next = available.length > 0 ? available[0] : null;
                    if (next !== running) {
                        running = next;
                        newlyDispatched = true;
                    }
                }
            } else if (algo === 'priority-p') {
                const available = processes.filter(p => p.arrival <= t && p.remaining > 0);
                comparisons += Math.max(0, available.length - 1);
                available.sort((a, b) => a.currentPriority - b.currentPriority || a.arrival - b.arrival || a.id - b.id);
                const next = available.length > 0 ? available[0] : null;

                if (running && next && running.id !== next.id) {
                    preempted = true;
                    stepEvents.push({
                        type: 'PREEMPTION',
                        title: `P${running.id} Preempted`,
                        message: `Priority Preemption: P${next.id} has higher priority (${next.currentPriority}) than P${running.id} (${running.currentPriority}). Switching context.`
                    });
                }
                if (next !== running) {
                    running = next;
                    newlyDispatched = true;
                }
            }

            // Track Context Switches
            const currentRunningId = running ? running.id : 'IDLE';
            if (previousRunningId !== null && currentRunningId !== 'IDLE' && previousRunningId !== currentRunningId) {
                contextSwitches++;
            }
            previousRunningId = currentRunningId;

            // 4. Update Gantt Chart Segment
            if (gantt.length === 0 || gantt[gantt.length - 1].id !== currentRunningId) {
                gantt.push({
                    id: currentRunningId,
                    start: t,
                    end: t + 1
                });
            } else {
                gantt[gantt.length - 1].end = t + 1;
            }

            // 5. Build Ready Queue snapshot for time t
            let readyQueueSnapshot = [];
            if (algo === 'rr') {
                readyQueueSnapshot = readyQueue.map(p => ({
                    id: p.id,
                    remaining: p.remaining,
                    priority: p.currentPriority,
                    arrival: p.arrival
                }));
            } else {
                const waitingList = processes.filter(p => p.arrival <= t && p.remaining > 0 && p !== running);
                if (algo === 'sjf' || algo === 'srtf') {
                    waitingList.sort((a, b) => a.remaining - b.remaining || a.arrival - b.arrival || a.id - b.id);
                } else if (algo === 'priority-np' || algo === 'priority-p') {
                    waitingList.sort((a, b) => a.currentPriority - b.currentPriority || a.arrival - b.arrival || a.id - b.id);
                } else {
                    waitingList.sort((a, b) => a.arrival - b.arrival || a.id - b.id);
                }
                readyQueueSnapshot = waitingList.map(p => ({
                    id: p.id,
                    remaining: p.remaining,
                    priority: p.currentPriority,
                    arrival: p.arrival
                }));
            }

            // Build Process Array state snapshot
            const pArraySnapshot = processes.map((p, idx) => {
                let status = 'NOT_ARRIVED';
                if (p.arrival <= t) {
                    if (p.remaining === 0) {
                        status = 'COMPLETED';
                    } else if (running && p.id === running.id) {
                        status = 'RUNNING';
                    } else {
                        status = 'READY';
                    }
                }
                return {
                    index: idx,
                    id: p.id,
                    arrival: p.arrival,
                    burst: p.burst,
                    remaining: p.remaining,
                    priority: p.currentPriority,
                    initialPriority: p.priority,
                    status: status,
                    completion: p.completion,
                    turnaround: p.turnaround,
                    waiting: p.waiting,
                    responseTime: p.responseTime
                };
            });

            // Educational Data Structure Explanation at time t
            let dsExplanation = '';
            let codeTrace = '';

            if (running) {
                if (algo === 'rr') {
                    dsExplanation = `Circular Queue: queue[${cqFront}] dequeued to CPU. Executing P${running.id} (Slice ${runSlice + 1}/${quantum}, Remaining: ${running.remaining}).`;
                    codeTrace = `P${running.id} = circular_queue.dequeue(); CPU.execute(P${running.id});`;
                } else if (algo === 'sjf' || algo === 'srtf') {
                    const metric = algo === 'sjf' ? 'Burst Time' : 'Remaining Time';
                    dsExplanation = `Array/Heap Scan: Selected p[${running.id - 1}] (P${running.id}) with minimum ${metric} (${running.remaining}). Comparisons: ${comparisons}.`;
                    codeTrace = `int min_idx = find_min_${algo === 'sjf' ? 'burst' : 'remaining'}(ready_set); dispatch(p[min_idx]);`;
                } else if (algo === 'priority-np' || algo === 'priority-p') {
                    dsExplanation = `Priority Queue: Selected p[${running.id - 1}] (P${running.id}) with highest priority ${running.currentPriority}.`;
                    codeTrace = `int best = find_highest_priority(ready_set); dispatch(p[best]);`;
                } else {
                    dsExplanation = `FIFO Linear Order: Dispatched p[${running.id - 1}] (P${running.id}) by arrival time (${running.arrival}).`;
                    codeTrace = `Process next = ready_queue.dequeue(); CPU.load(next);`;
                }
            } else {
                dsExplanation = `CPU Idle: All arrived processes have finished or no process has arrived yet at T=${t}.`;
                codeTrace = `if (ready_queue.empty()) { CPU.idle(); }`;
            }

            // Record Step Snapshot
            snapshots.push({
                time: t,
                runningId: currentRunningId,
                runningRemaining: running ? running.remaining : 0,
                runningSlice: runSlice + 1,
                quantum: quantum,
                readyQueue: readyQueueSnapshot,
                pArray: pArraySnapshot,
                circularQueue: {
                    slots: cqSlots.map(s => s ? { id: s.id, remaining: s.remaining } : null),
                    front: cqFront,
                    rear: cqRear,
                    count: cqCount,
                    capacity: cqCapacity
                },
                gantt: deepClone(gantt),
                events: stepEvents,
                dsExplanation: dsExplanation,
                codeTrace: codeTrace,
                comparisons: comparisons,
                contextSwitches: contextSwitches
            });

            // 6. Execute 1 time unit on CPU
            if (running) {
                if (running.firstExecuted === -1) {
                    running.firstExecuted = t;
                    running.responseTime = t - running.arrival;
                }

                running.remaining--;
                runSlice++;

                // Process Completion Check
                if (running.remaining === 0) {
                    running.completion = t + 1;
                    running.turnaround = running.completion - running.arrival;
                    running.waiting = running.turnaround - running.burst;
                    completed++;

                    stepEvents.push({
                        type: 'COMPLETION',
                        title: `P${running.id} Finished`,
                        message: `Process P${running.id} finished execution at T=${t + 1}. CT=${running.completion}, TAT=${running.turnaround}, WT=${running.waiting}.`
                    });

                    running = null;
                    runSlice = 0;
                }
            }

            t++;
        }

        // Final simulation summary snapshot
        snapshots.push({
            time: t,
            runningId: 'IDLE',
            runningRemaining: 0,
            runningSlice: 0,
            quantum: quantum,
            readyQueue: [],
            pArray: processes.map((p, idx) => ({
                index: idx,
                id: p.id,
                arrival: p.arrival,
                burst: p.burst,
                remaining: 0,
                priority: p.currentPriority,
                initialPriority: p.priority,
                status: 'COMPLETED',
                completion: p.completion,
                turnaround: p.turnaround,
                waiting: p.waiting,
                responseTime: p.responseTime
            })),
            circularQueue: {
                slots: new Array(cqCapacity).fill(null),
                front: cqFront,
                rear: cqRear,
                count: 0,
                capacity: cqCapacity
            },
            gantt: deepClone(gantt),
            events: [{
                type: 'SIMULATION_END',
                title: 'Simulation Complete',
                message: `All ${n} processes successfully executed in ${t} time units.`
            }],
            dsExplanation: `All processes terminated. Total completion time = ${t}.`,
            codeTrace: `scheduler.finalize(); return compute_metrics();`,
            comparisons: 0,
            contextSwitches: contextSwitches
        });

        // Compute performance metrics
        const metrics = computeMetrics(processes, gantt, contextSwitches);

        return {
            algo: algo,
            metadata: ALGO_METADATA[algo],
            processes: processes.sort((a, b) => a.id - b.id),
            gantt: gantt,
            snapshots: snapshots,
            metrics: metrics,
            totalTime: t
        };
    }

    /**
     * Compute comprehensive metrics adhering strictly to textbook OS formulas
     */
    function computeMetrics(processes, gantt, contextSwitches) {
        const n = processes.length;
        if (n === 0) return null;

        const totalBusy = processes.reduce((acc, p) => acc + p.burst, 0);
        const totalTimeline = gantt.length > 0 ? (gantt[gantt.length - 1].end - gantt[0].start) : totalBusy;
        const totalIdle = Math.max(0, totalTimeline - totalBusy);
        const cpuUtilization = totalTimeline > 0 ? ((totalBusy / totalTimeline) * 100) : 100;
        const throughput = totalTimeline > 0 ? (n / totalTimeline) : 0;

        const totalWT = processes.reduce((acc, p) => acc + p.waiting, 0);
        const totalTAT = processes.reduce((acc, p) => acc + p.turnaround, 0);
        const totalRT = processes.reduce((acc, p) => acc + Math.max(0, p.responseTime), 0);

        const avgWT = totalWT / n;
        const avgTAT = totalTAT / n;
        const avgRT = totalRT / n;

        // Starvation flags
        const starved = processes.filter(p => p.waiting >= 10 || (p.waiting > p.burst * 2.5 && p.waiting >= 6));

        // Execution sequence
        const sequence = [];
        gantt.forEach(block => {
            if (block.id !== 'IDLE') {
                sequence.push(`P${block.id}`);
            }
        });

        return {
            count: n,
            totalBusy: totalBusy,
            totalIdle: totalIdle,
            totalTimeline: totalTimeline,
            cpuUtilization: cpuUtilization,
            throughput: throughput,
            contextSwitches: contextSwitches,
            avgWT: avgWT,
            avgTAT: avgTAT,
            avgRT: avgRT,
            starved: starved,
            sequence: sequence
        };
    }

    /**
     * Compare all 6 algorithms against the exact same dataset
     */
    function compareAll(rawProcesses, quantum = 2, agingEnabled = false, agingInterval = 3) {
        const algos = ['fcfs', 'sjf', 'srtf', 'rr', 'priority-np', 'priority-p'];
        const comparisons = [];

        algos.forEach(algoKey => {
            const result = runSimulation(rawProcesses, {
                algo: algoKey,
                quantum: quantum,
                agingEnabled: agingEnabled,
                agingInterval: agingInterval
            });

            comparisons.push({
                key: algoKey,
                name: ALGO_METADATA[algoKey].name,
                shortName: ALGO_METADATA[algoKey].shortName,
                type: ALGO_METADATA[algoKey].type,
                dataStructure: ALGO_METADATA[algoKey].dataStructure,
                avgWT: result.metrics.avgWT,
                avgTAT: result.metrics.avgTAT,
                avgRT: result.metrics.avgRT,
                cpuUtil: result.metrics.cpuUtilization,
                contextSwitches: result.metrics.contextSwitches,
                totalTime: result.totalTime,
                gantt: result.gantt,
                processes: result.processes
            });
        });

        // Determine best algorithm (Lowest Avg WT, tie break with Avg TAT)
        let best = comparisons[0];
        comparisons.forEach(c => {
            if (c.avgWT < best.avgWT || (c.avgWT === best.avgWT && c.avgTAT < best.avgTAT)) {
                best = c;
            }
        });

        return {
            results: comparisons,
            best: best
        };
    }

    return {
        ALGO_METADATA: ALGO_METADATA,
        runSimulation: runSimulation,
        computeMetrics: computeMetrics,
        compareAll: compareAll
    };
})();

// Export for module environments if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CPUEngine;
}
