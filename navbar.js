/**
 * Shared Navigation & Page Layout Helpers
 * CPU Scheduling & Data Structure Visualizer
 */

(function () {
    const NAV_ITEMS = [
        { label: 'Home', href: 'index.html', id: 'nav-home' },
        { label: 'Simulation', href: 'simulation.html', id: 'nav-sim' },
        { label: 'Data Structure Lab', href: 'ds-lab.html', id: 'nav-ds' },
        { label: 'Algorithms', href: 'algorithms.html', id: 'nav-algo' },
        { label: 'Results', href: 'results.html', id: 'nav-results' },
        { label: 'History', href: 'history.html', id: 'nav-history' },
        { label: 'Code Explorer', href: 'code-explorer.html', id: 'nav-code' },
        { label: 'About', href: 'about.html', id: 'nav-about' }
    ];

    function renderHeader() {
        const headerPlaceholder = document.getElementById('site-header-placeholder');
        if (!headerPlaceholder) return;

        const currentPath = window.location.pathname.split('/').pop() || 'index.html';

        const navHtml = NAV_ITEMS.map(item => {
            const isActive = (currentPath === item.href) || 
                             (currentPath === '' && item.href === 'index.html');
            return `<a href="${item.href}" class="nav-link ${isActive ? 'active' : ''}">${item.label}</a>`;
        }).join('');

        headerPlaceholder.innerHTML = `
            <header class="site-header">
                <div class="nav-container">
                    <a href="index.html" class="brand-link">
                        <span class="brand-icon">CPU</span>
                        <div class="brand-text">
                            <span class="brand-title">CPU SCHEDULER &amp; DS LAB</span>
                            <span class="brand-subtitle">Interactive Educational Simulator</span>
                        </div>
                    </a>
                    <button class="nav-toggle" id="nav-toggle-btn" aria-label="Toggle navigation menu">☰</button>
                    <nav class="nav-links" id="nav-links-menu">
                        ${navHtml}
                        <a href="original/index.html" class="nav-link classic-link" title="Open the original single-page project">Classic Mode</a>
                    </nav>
                </div>
            </header>
        `;

        // Toggle handler
        const toggleBtn = document.getElementById('nav-toggle-btn');
        const menu = document.getElementById('nav-links-menu');
        if (toggleBtn && menu) {
            toggleBtn.addEventListener('click', () => {
                menu.classList.toggle('open');
            });
        }
    }

    function renderFooter() {
        const footerPlaceholder = document.getElementById('site-footer-placeholder');
        if (!footerPlaceholder) return;

        footerPlaceholder.innerHTML = `
            <footer class="site-footer">
                <div class="footer-container">
                    <div class="footer-info">
                        <strong>CPU Scheduling &amp; Data Structure Visualizer</strong>
                        <div>Computer Engineering Educational Project &bull; DSA &amp; OS Simulation</div>
                    </div>
                    <nav class="footer-nav">
                        <a href="index.html">Home</a>
                        <a href="simulation.html">Simulation</a>
                        <a href="ds-lab.html">DS Lab</a>
                        <a href="algorithms.html">Algorithms</a>
                        <a href="results.html">Results</a>
                        <a href="history.html">History</a>
                        <a href="code-explorer.html">Code Explorer</a>
                        <a href="about.html">About</a>
                        <a href="original/index.html">Classic Original</a>
                    </nav>
                </div>
            </footer>
        `;
    }

    document.addEventListener('DOMContentLoaded', () => {
        renderHeader();
        renderFooter();
    });
})();
