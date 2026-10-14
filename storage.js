/**
 * LocalStorage & Cross-Page Persistence Service
 * Manages simulation datasets, history runs, and exports
 */

const CPUStorage = (function () {
    const HISTORY_KEY = 'cpu_sched_history_v2';
    const ACTIVE_DATASET_KEY = 'cpu_sched_active_dataset';
    const DEFAULT_DATASET = [
        { id: 1, arrival: 0, burst: 5, priority: 2 },
        { id: 2, arrival: 1, burst: 3, priority: 1 },
        { id: 3, arrival: 2, burst: 4, priority: 3 },
        { id: 4, arrival: 4, burst: 2, priority: 4 }
    ];

    function safeGet(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return fallback;
            return JSON.parse(raw);
        } catch (e) {
            console.error('Error reading localStorage for key:', key, e);
            return fallback;
        }
    }

    function safeSet(key, val) {
        try {
            localStorage.setItem(key, JSON.stringify(val));
            return true;
        } catch (e) {
            console.error('Error writing localStorage for key:', key, e);
            return false;
        }
    }

    // Active Dataset Management
    function getActiveDataset() {
        const data = safeGet(ACTIVE_DATASET_KEY, null);
        if (Array.isArray(data) && data.length > 0) {
            return data;
        }
        return DEFAULT_DATASET;
    }

    function setActiveDataset(dataset) {
        return safeSet(ACTIVE_DATASET_KEY, dataset);
    }

    // History Management
    function getHistory() {
        const history = safeGet(HISTORY_KEY, []);
        return Array.isArray(history) ? history : [];
    }

    function addHistoryEntry(entry) {
        const history = getHistory();
        const id = 'sim_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        const record = {
            id: id,
            timestamp: new Date().toLocaleString(),
            dateIso: new Date().toISOString(),
            algo: entry.algo || 'fcfs',
            algoName: entry.algoName || 'FCFS',
            quantum: entry.quantum || 2,
            agingEnabled: !!entry.agingEnabled,
            agingInterval: entry.agingInterval || 3,
            starvationThreshold: entry.starvationThreshold || 10,
            processes: entry.processes || [],
            metrics: entry.metrics || {},
            gantt: entry.gantt || [],
            notes: entry.notes || ''
        };

        history.unshift(record);
        // Retain up to 30 past simulations
        if (history.length > 30) {
            history.pop();
        }
        safeSet(HISTORY_KEY, history);
        return record;
    }

    function getHistoryEntry(id) {
        const history = getHistory();
        return history.find(item => item.id === id) || null;
    }

    function deleteHistoryEntry(id) {
        let history = getHistory();
        history = history.filter(item => item.id !== id);
        safeSet(HISTORY_KEY, history);
        return history;
    }

    function clearAllHistory() {
        safeSet(HISTORY_KEY, []);
        return [];
    }

    // CSV Export Generator
    function exportToCSV(processes, metrics, algoName) {
        let csv = `Algorithm,${algoName}\n`;
        csv += `Average Waiting Time,${metrics.avgWT.toFixed(2)}\n`;
        csv += `Average Turnaround Time,${metrics.avgTAT.toFixed(2)}\n`;
        csv += `Average Response Time,${metrics.avgRT.toFixed(2)}\n`;
        csv += `CPU Utilization,${metrics.cpuUtilization.toFixed(1)}%\n`;
        csv += `Context Switches,${metrics.contextSwitches}\n`;
        csv += `Total Execution Time,${metrics.totalTimeline}\n\n`;

        csv += `Process ID,Arrival Time,Burst Time,Priority,Completion Time,Turnaround Time,Waiting Time,Response Time\n`;
        processes.forEach(p => {
            csv += `P${p.id},${p.arrival},${p.burst},${p.priority},${p.completion},${p.turnaround},${p.waiting},${p.responseTime}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CPU_Scheduling_${algoName.replace(/\s+/g, '_')}_Results.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    return {
        DEFAULT_DATASET: DEFAULT_DATASET,
        getActiveDataset: getActiveDataset,
        setActiveDataset: setActiveDataset,
        getHistory: getHistory,
        addHistoryEntry: addHistoryEntry,
        getHistoryEntry: getHistoryEntry,
        deleteHistoryEntry: deleteHistoryEntry,
        clearAllHistory: clearAllHistory,
        exportToCSV: exportToCSV
    };
})();
