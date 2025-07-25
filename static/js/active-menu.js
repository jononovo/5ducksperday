// Active Menu State Detection and CSS Injection
document.addEventListener('DOMContentLoaded', function() {
    // Inject CSS for active states
    const style = document.createElement('style');
    style.textContent = `
        .nav-active {
            color: #1d4ed8 !important;
            font-weight: 600 !important;
            border-bottom-color: #2563eb !important;
        }
        
        .nav-active:hover {
            color: #1e40af !important;
            border-bottom-color: #1d4ed8 !important;
        }
    `;
    document.head.appendChild(style);
    
    const currentPath = window.location.pathname;
    
    // Define path mappings for menu items
    const pathMappings = {
        '/': 'search',           // Landing page maps to Search
        '/app': 'search',        // App page also maps to Search
        '/pricing': 'pricing',
        '/contact': 'contact'
    };
    
    // Get the active menu item based on current path
    const activeMenuItem = pathMappings[currentPath];
    
    if (activeMenuItem) {
        // Find all menu items in both desktop and mobile navigation
        const menuItems = document.querySelectorAll(`[data-nav-item="${activeMenuItem}"]`);
        
        // Add active class to matching menu items
        menuItems.forEach(item => {
            item.classList.add('nav-active');
        });
    }
});