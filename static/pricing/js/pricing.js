// Pricing page JavaScript functionality
function selectPlan(planId) {
    console.log('Selected plan:', planId);
    
    // Store plan selection in localStorage
    localStorage.setItem('selectedPlan', planId);
    localStorage.setItem('planSource', 'pricing_page');
    
    // For free plan, redirect directly to auth
    if (planId === 'free') {
        window.location.href = '/auth';
        return;
    }
    
    // For paid plans, redirect to auth where the plan will be handled after authentication
    window.location.href = '/auth';
}

function joinWaitlist(planId) {
    console.log('Joining waitlist for plan:', planId);
    
    // Store plan selection and waitlist flag in localStorage
    localStorage.setItem('selectedPlan', planId);
    localStorage.setItem('planSource', 'pricing_page');
    localStorage.setItem('joinWaitlist', 'true');
    
    // Show immediate feedback
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = 'Joining...';
    button.disabled = true;
    
    // Redirect to auth after a short delay
    setTimeout(() => {
        window.location.href = '/auth';
    }, 1000);
}

// Duckling card hover effect
function hoverDucklingCard(isHover) {
    const card = document.querySelector('.pricing-card');
    const badge = card.querySelector('span');
    
    if (isHover) {
        // Apply hover styles
        card.classList.remove('border-black');
        card.classList.add('border-blue-500');
        
        badge.classList.remove('bg-black');
        badge.classList.add('bg-gradient-to-r', 'from-blue-600', 'to-purple-600');
    } else {
        // Remove hover styles
        card.classList.remove('border-blue-500');
        card.classList.add('border-black');
        
        badge.classList.remove('bg-gradient-to-r', 'from-blue-600', 'to-purple-600');
        badge.classList.add('bg-black');
    }
}

// Mobile menu functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('Pricing page loaded');
    
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!mobileMenuBtn.contains(event.target) && !mobileMenu.contains(event.target)) {
                mobileMenu.classList.add('hidden');
            }
        });
    }
});