/**
 * Interactive Data Structure Lab Controller
 * Implements interactive modules for Array, Queue, Circular Queue,
 * Min-Heap, Binary Search Tree, and Call Stack.
 */

(function () {
    // Tab switching
    function initTabs() {
        const tabBtns = document.querySelectorAll('.ds-tab-btn');
        const panes = document.querySelectorAll('.ds-module-pane');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                panes.forEach(p => p.classList.remove('active'));

                btn.classList.add('active');
                const targetId = btn.getAttribute('data-target');
                const targetPane = document.getElementById(targetId);
                if (targetPane) targetPane.classList.add('active');
            });
        });
    }

    // ==========================================================
    // MODULE A: ARRAY VISUALIZER
    // ==========================================================
    const ArrayModule = {
        data: [
            { id: 1, arrival: 0, burst: 6, priority: 3, remaining: 6 },
            { id: 2, arrival: 2, burst: 2, priority: 1, remaining: 2 },
            { id: 3, arrival: 3, burst: 8, priority: 4, remaining: 8 },
            { id: 4, arrival: 5, burst: 3, priority: 2, remaining: 3 },
            { id: 5, arrival: 7, burst: 4, priority: 5, remaining: 4 }
        ],
        comparisons: 0,

        init() {
            this.render();
            document.getElementById('btn-array-min-bt').addEventListener('click', () => this.findMin('burst'));
            document.getElementById('btn-array-highest-pr').addEventListener('click', () => this.findMin('priority'));
            document.getElementById('btn-array-earliest-at').addEventListener('click', () => this.findMin('arrival'));
            document.getElementById('btn-array-reset').addEventListener('click', () => {
                this.comparisons = 0;
                this.render();
                document.getElementById('array-log-msg').textContent = 'Array reset to initial sample state.';
            });
        },

        render(highlightIdx = -1) {
            const container = document.getElementById('array-slots-stage');
            if (!container) return;

            container.innerHTML = this.data.map((p, idx) => `
                <div class="process-cell ${idx === highlightIdx ? 'running' : 'ready'}" style="min-width: 140px;">
                    <div class="cell-header">
                        <span class="cell-index-tag">p[${idx}]</span>
                        <span class="cell-pid-tag">P${p.id}</span>
                    </div>
                    <div class="cell-grid-fields">
                        <span>AT: <strong>${p.arrival}</strong></span>
                        <span>BT: <strong>${p.burst}</strong></span>
                        <span>PR: <strong>${p.priority}</strong></span>
                        <span>Rem: <strong>${p.remaining}</strong></span>
                    </div>
                </div>
            `).join('');

            document.getElementById('array-comp-count').textContent = this.comparisons;
        },

        findMin(prop) {
            this.comparisons = 0;
            let minIdx = 0;
            let minVal = this.data[0][prop];

            for (let i = 1; i < this.data.length; i++) {
                this.comparisons++;
                if (this.data[i][prop] < minVal) {
                    minVal = this.data[i][prop];
                    minIdx = i;
                }
            }

            this.render(minIdx);
            const propName = prop === 'burst' ? 'Burst Time (SJF)' : (prop === 'priority' ? 'Priority Value' : 'Arrival Time (FCFS)');
            document.getElementById('array-log-msg').innerHTML = 
                `Linear Scan Complete: Selected <strong>p[${minIdx}] (P${this.data[minIdx].id})</strong> with smallest ${propName} = <strong>${minVal}</strong>. Comparisons made: <strong>${this.comparisons}</strong>.`;
        }
    };

    // ==========================================================
    // MODULE B: LINEAR FIFO QUEUE VISUALIZER
    // ==========================================================
    const QueueModule = {
        capacity: 6,
        items: ['P1', 'P2'],

        init() {
            this.render();
            document.getElementById('btn-q-enqueue').addEventListener('click', () => {
                const val = document.getElementById('input-q-val').value.trim() || `P${this.items.length + 1}`;
                this.enqueue(val);
            });
            document.getElementById('btn-q-dequeue').addEventListener('click', () => this.dequeue());
            document.getElementById('btn-q-peek').addEventListener('click', () => this.peek());
            document.getElementById('btn-q-clear').addEventListener('click', () => {
                this.items = [];
                this.render();
                this.log('Queue cleared.');
            });
        },

        enqueue(val) {
            if (this.items.length >= this.capacity) {
                this.log(`⚠️ Queue Overflow: Queue is full (Max capacity: ${this.capacity}). Cannot enqueue ${val}.`);
                return;
            }
            this.items.push(val);
            this.render();
            this.log(`Enqueued ${val} at REAR (index [${this.items.length - 1}]). Total items: ${this.items.length}.`);
        },

        dequeue() {
            if (this.items.length === 0) {
                this.log(`⚠️ Queue Underflow: Cannot dequeue from an empty queue.`);
                return;
            }
            const removed = this.items.shift();
            this.render();
            this.log(`Dequeued ${removed} from FRONT (index [0]). Dispatched to CPU. Remaining: ${this.items.length}.`);
        },

        peek() {
            if (this.items.length === 0) {
                this.log(`Queue is empty. Peek returned null.`);
                return;
            }
            this.log(`Peek: Front item is <strong>${this.items[0]}</strong>.`);
        },

        render() {
            const container = document.getElementById('queue-slots-stage');
            if (!container) return;

            let html = '';
            for (let i = 0; i < this.capacity; i++) {
                const isOccupied = i < this.items.length;
                const val = isOccupied ? this.items[i] : '';
                const isFront = (i === 0 && isOccupied);
                const isRear = (i === this.items.length - 1 && isOccupied);

                let flag = '';
                if (isFront && isRear) flag = '<span class="pointer-flag flag-front">FRONT/REAR</span>';
                else if (isFront) flag = '<span class="pointer-flag flag-front">FRONT</span>';
                else if (isRear) flag = '<span class="pointer-flag flag-rear">REAR</span>';

                html += `
                    <div class="slot-box ${isOccupied ? 'filled' : ''}">
                        ${flag}
                        <span>${val}</span>
                        <span class="slot-idx-label">[${i}]</span>
                    </div>
                `;
            }

            container.innerHTML = html;
            document.getElementById('q-front-idx').textContent = this.items.length > 0 ? '0' : '-1';
            document.getElementById('q-rear-idx').textContent = this.items.length > 0 ? (this.items.length - 1).toString() : '-1';
        },

        log(msg) {
            const el = document.getElementById('queue-log-msg');
            if (el) el.innerHTML = msg;
        }
    };

    // ==========================================================
    // MODULE C: CIRCULAR QUEUE (RING BUFFER)
    // ==========================================================
    const CircularQueueModule = {
        capacity: 6,
        slots: new Array(6).fill(null),
        front: 0,
        rear: 0,
        count: 0,

        init() {
            // Preload 2 sample items
            this.slots[0] = 'P1';
            this.slots[1] = 'P2';
            this.front = 0;
            this.rear = 2;
            this.count = 2;
            this.render();

            document.getElementById('btn-cq-enqueue').addEventListener('click', () => {
                const val = document.getElementById('input-cq-val').value.trim() || `P${Math.floor(Math.random() * 20) + 1}`;
                this.enqueue(val);
            });
            document.getElementById('btn-cq-dequeue').addEventListener('click', () => this.dequeue());
            document.getElementById('btn-cq-reset').addEventListener('click', () => {
                this.slots.fill(null);
                this.front = 0;
                this.rear = 0;
                this.count = 0;
                this.render();
                this.log('Circular queue reset.');
            });
        },

        enqueue(val) {
            if (this.count >= this.capacity) {
                this.log(`⚠️ Circular Queue Full! Cannot enqueue ${val}.`);
                return;
            }

            const currentRear = this.rear;
            this.slots[currentRear] = val;
            this.rear = (this.rear + 1) % this.capacity;
            this.count++;

            this.render();
            this.log(`Enqueued ${val} at index [${currentRear}]. Updated rear: <code>rear = (${currentRear} + 1) % ${this.capacity} = ${this.rear}</code>.`);
        },

        dequeue() {
            if (this.count === 0) {
                this.log(`⚠️ Circular Queue Empty! Cannot dequeue.`);
                return;
            }

            const currentFront = this.front;
            const removed = this.slots[currentFront];
            this.slots[currentFront] = null;
            this.front = (this.front + 1) % this.capacity;
            this.count--;

            this.render();
            this.log(`Dequeued ${removed} from index [${currentFront}]. Updated front: <code>front = (${currentFront} + 1) % ${this.capacity} = ${this.front}</code>.`);
        },

        render() {
            const container = document.getElementById('cq-interactive-stage');
            if (!container) return;

            let html = '';
            for (let i = 0; i < this.capacity; i++) {
                const item = this.slots[i];
                const isOccupied = item !== null;
                const isFront = (i === this.front && this.count > 0);
                const isRear = (i === this.rear);

                let flag = '';
                if (isFront && isRear) flag = '<span class="pointer-flag flag-front">F,R</span>';
                else if (isFront) flag = '<span class="pointer-flag flag-front">FRONT</span>';
                else if (isRear) flag = '<span class="pointer-flag flag-rear">REAR</span>';

                html += `
                    <div class="cq-interactive-cell ${isOccupied ? 'occupied' : ''} ${isFront ? 'front-cell' : ''}">
                        ${flag}
                        <span>${isOccupied ? item : '&mdash;'}</span>
                        <span class="slot-idx-label">[${i}]</span>
                    </div>
                `;
            }

            container.innerHTML = html;
            document.getElementById('cq-front-val').textContent = this.front;
            document.getElementById('cq-rear-val').textContent = this.rear;
            document.getElementById('cq-count-val').textContent = this.count;
        },

        log(msg) {
            const el = document.getElementById('cq-log-msg');
            if (el) el.innerHTML = msg;
        }
    };

    // ==========================================================
    // MODULE D: MIN-HEAP / PRIORITY QUEUE
    // ==========================================================
    const HeapModule = {
        heap: [2, 5, 4, 8, 7], // Min-heap sample (values represent remaining burst time)

        init() {
            this.render();
            document.getElementById('btn-heap-insert').addEventListener('click', () => {
                const val = parseInt(document.getElementById('input-heap-val').value, 10);
                if (isNaN(val) || val < 1) {
                    alert('Please enter a positive integer key.');
                    return;
                }
                this.insert(val);
            });
            document.getElementById('btn-heap-extract').addEventListener('click', () => this.extractMin());
            document.getElementById('btn-heap-reset').addEventListener('click', () => {
                this.heap = [2, 5, 4, 8, 7];
                this.render();
                this.log('Heap reset to default sample [2, 5, 4, 8, 7].');
            });
        },

        insert(key) {
            this.heap.push(key);
            let idx = this.heap.length - 1;
            let swaps = 0;

            // Heapify Up (Bubble up)
            while (idx > 0) {
                const parentIdx = Math.floor((idx - 1) / 2);
                if (this.heap[idx] < this.heap[parentIdx]) {
                    const temp = this.heap[idx];
                    this.heap[idx] = this.heap[parentIdx];
                    this.heap[parentIdx] = temp;
                    idx = parentIdx;
                    swaps++;
                } else {
                    break;
                }
            }

            this.render(idx);
            this.log(`Inserted key <strong>${key}</strong> into Min-Heap. Bubble-up executed (${swaps} swaps). Root element is now <strong>${this.heap[0]}</strong>.`);
        },

        extractMin() {
            if (this.heap.length === 0) {
                this.log(`Heap is empty. Nothing to extract.`);
                return;
            }
            const min = this.heap[0];
            const last = this.heap.pop();

            if (this.heap.length > 0) {
                this.heap[0] = last;
                // Heapify Down
                let idx = 0;
                const length = this.heap.length;
                while (true) {
                    const left = 2 * idx + 1;
                    const right = 2 * idx + 2;
                    let smallest = idx;

                    if (left < length && this.heap[left] < this.heap[smallest]) {
                        smallest = left;
                    }
                    if (right < length && this.heap[right] < this.heap[smallest]) {
                        smallest = right;
                    }
                    if (smallest !== idx) {
                        const temp = this.heap[idx];
                        this.heap[idx] = this.heap[smallest];
                        this.heap[smallest] = temp;
                        idx = smallest;
                    } else {
                        break;
                    }
                }
            }

            this.render(0);
            this.log(`Extracted minimum key <strong>${min}</strong> (Dispatched by SRTF / Priority Scheduler). New root is <strong>${this.heap.length > 0 ? this.heap[0] : 'None'}</strong>.`);
        },

        render(highlightIdx = -1) {
            const container = document.getElementById('heap-tree-stage');
            const arrayView = document.getElementById('heap-array-view');
            if (!container) return;

            // Render array representation
            if (arrayView) {
                arrayView.innerHTML = this.heap.map((val, idx) => `
                    <span class="preview-badge ${idx === highlightIdx ? 'running' : 'queue'}">[${idx}]: ${val}</span>
                `).join(' ');
            }

            // Render 3-level tree visualizer
            let html = '';
            if (this.heap.length > 0) {
                // Level 0: root
                html += `<div class="tree-level"><div class="tree-node active-root ${highlightIdx === 0 ? 'highlight-node' : ''}">${this.heap[0]}<span class="node-idx-badge">[0]</span></div></div>`;
            }
            if (this.heap.length > 1) {
                // Level 1: left (1), right (2)
                html += `<div class="tree-level">`;
                if (this.heap[1] !== undefined) html += `<div class="tree-node ${highlightIdx === 1 ? 'highlight-node' : ''}">${this.heap[1]}<span class="node-idx-badge">[1]</span></div>`;
                if (this.heap[2] !== undefined) html += `<div class="tree-node ${highlightIdx === 2 ? 'highlight-node' : ''}">${this.heap[2]}<span class="node-idx-badge">[2]</span></div>`;
                html += `</div>`;
            }
            if (this.heap.length > 3) {
                // Level 2: children 3, 4, 5, 6
                html += `<div class="tree-level">`;
                for (let i = 3; i < Math.min(this.heap.length, 7); i++) {
                    html += `<div class="tree-node ${highlightIdx === i ? 'highlight-node' : ''}">${this.heap[i]}<span class="node-idx-badge">[${i}]</span></div>`;
                }
                html += `</div>`;
            }

            container.innerHTML = html;
        },

        log(msg) {
            const el = document.getElementById('heap-log-msg');
            if (el) el.innerHTML = msg;
        }
    };

    // ==========================================================
    // MODULE E: BINARY SEARCH TREE (BST)
    // ==========================================================
    class BSTNode {
        constructor(key) {
            this.key = key;
            this.left = null;
            this.right = null;
        }
    }

    const BSTModule = {
        root: null,

        init() {
            [15, 10, 20, 8, 12, 17, 25].forEach(k => this.insertKey(k));
            this.render();

            document.getElementById('btn-bst-insert').addEventListener('click', () => {
                const val = parseInt(document.getElementById('input-bst-val').value, 10);
                if (isNaN(val)) return;
                this.insertKey(val);
                this.render();
                this.log(`Inserted node ${val} into BST.`);
            });

            document.getElementById('btn-bst-inorder').addEventListener('click', () => {
                const list = [];
                this.inorder(this.root, list);
                this.log(`<strong>Inorder Traversal (Sorted L-Root-R):</strong> ${list.join(' &rarr; ')}`);
            });

            document.getElementById('btn-bst-preorder').addEventListener('click', () => {
                const list = [];
                this.preorder(this.root, list);
                this.log(`<strong>Preorder Traversal (Root-L-R):</strong> ${list.join(' &rarr; ')}`);
            });

            document.getElementById('btn-bst-postorder').addEventListener('click', () => {
                const list = [];
                this.postorder(this.root, list);
                this.log(`<strong>Postorder Traversal (L-R-Root):</strong> ${list.join(' &rarr; ')}`);
            });
        },

        insertKey(key) {
            const newNode = new BSTNode(key);
            if (!this.root) {
                this.root = newNode;
                return;
            }
            let curr = this.root;
            while (true) {
                if (key < curr.key) {
                    if (!curr.left) { curr.left = newNode; break; }
                    curr = curr.left;
                } else if (key > curr.key) {
                    if (!curr.right) { curr.right = newNode; break; }
                    curr = curr.right;
                } else {
                    break; // Duplicate
                }
            }
        },

        inorder(node, list) {
            if (!node) return;
            this.inorder(node.left, list);
            list.push(node.key);
            this.inorder(node.right, list);
        },

        preorder(node, list) {
            if (!node) return;
            list.push(node.key);
            this.preorder(node.left, list);
            this.preorder(node.right, list);
        },

        postorder(node, list) {
            if (!node) return;
            this.postorder(node.left, list);
            this.postorder(node.right, list);
            list.push(node.key);
        },

        render() {
            const container = document.getElementById('bst-tree-stage');
            if (!container || !this.root) return;

            // Simplified hierarchical tree rendering
            let html = `
                <div class="tree-level">
                    <div class="tree-node active-root">${this.root.key}</div>
                </div>
                <div class="tree-level">
                    ${this.root.left ? `<div class="tree-node">${this.root.left.key}</div>` : ''}
                    ${this.root.right ? `<div class="tree-node">${this.root.right.key}</div>` : ''}
                </div>
            `;
            container.innerHTML = html;
        },

        log(msg) {
            const el = document.getElementById('bst-log-msg');
            if (el) el.innerHTML = msg;
        }
    };

    // ==========================================================
    // MODULE F: EXECUTION CALL STACK (LIFO)
    // ==========================================================
    const StackModule = {
        capacity: 5,
        stack: ['Context: T=0', 'Context: T=1'],

        init() {
            this.render();
            document.getElementById('btn-stack-push').addEventListener('click', () => {
                const val = document.getElementById('input-stack-val').value.trim() || `Context: T=${this.stack.length}`;
                this.push(val);
            });
            document.getElementById('btn-stack-pop').addEventListener('click', () => this.pop());
            document.getElementById('btn-stack-clear').addEventListener('click', () => {
                this.stack = [];
                this.render();
                this.log('Stack cleared.');
            });
        },

        push(frame) {
            if (this.stack.length >= this.capacity) {
                this.log(`⚠️ Stack Overflow! Max stack depth (${this.capacity}) reached.`);
                return;
            }
            this.stack.push(frame);
            this.render();
            this.log(`Pushed state frame <strong>${frame}</strong> onto Stack Top (TOS). Total frames: ${this.stack.length}.`);
        },

        pop() {
            if (this.stack.length === 0) {
                this.log(`⚠️ Stack Underflow! Stack is empty.`);
                return;
            }
            const popped = this.stack.pop();
            this.render();
            this.log(`Popped state frame <strong>${popped}</strong> from Stack Top (Restored previous CPU context state).`);
        },

        render() {
            const container = document.getElementById('stack-column-stage');
            if (!container) return;

            container.innerHTML = this.stack.map((item, idx) => `
                <div class="stack-frame ${idx === this.stack.length - 1 ? 'top-frame' : ''}">
                    ${item} ${idx === this.stack.length - 1 ? '(TOP)' : ''}
                </div>
            `).join('');

            document.getElementById('stack-top-val').textContent = this.stack.length > 0 ? this.stack[this.stack.length - 1] : '[Empty]';
        },

        log(msg) {
            const el = document.getElementById('stack-log-msg');
            if (el) el.innerHTML = msg;
        }
    };

    // Initialize all modules on load
    document.addEventListener('DOMContentLoaded', () => {
        initTabs();
        ArrayModule.init();
        QueueModule.init();
        CircularQueueModule.init();
        HeapModule.init();
        BSTModule.init();
        StackModule.init();
    });

})();
