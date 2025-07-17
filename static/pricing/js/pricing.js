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

// Add smooth scrolling to anchor links
document.addEventListener('DOMContentLoaded', function() {
    // Add any initialization code here if needed
    console.log('Pricing page loaded');
});