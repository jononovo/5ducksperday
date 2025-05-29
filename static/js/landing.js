// Landing page interactions
document.addEventListener('DOMContentLoaded', function() {
  // Get buttons
  const tryNowBtn = document.getElementById('try-now-btn');
  const getStartedBtn = document.getElementById('get-started-btn');
  
  // Add click handlers to redirect to React app
  function redirectToApp() {
    window.location.href = '/app';
  }
  
  if (tryNowBtn) {
    tryNowBtn.addEventListener('click', redirectToApp);
  }
  
  if (getStartedBtn) {
    getStartedBtn.addEventListener('click', redirectToApp);
  }
  
  // Smooth scrolling for Learn More button
  const learnMoreBtn = document.querySelector('.btn-secondary');
  if (learnMoreBtn) {
    learnMoreBtn.addEventListener('click', function() {
      document.querySelector('section').scrollIntoView({ 
        behavior: 'smooth' 
      });
    });
  }
});