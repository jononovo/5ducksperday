// Landing page interactions
document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');

  const tryFreeBtn = document.getElementById('try-free-btn');
  const examplePrompts = document.querySelectorAll('.example-prompt');
  const videoContainer = document.getElementById('video-container');
  const productBtn = document.getElementById('product-btn');
  const serviceBtn = document.getElementById('service-btn');
  
  // Handle search functionality
  function handleSearch(query = null) {
    const searchQuery = query || searchInput.value.trim();
    if (!searchQuery) return;
    
    // Store the search query for use on the app page
    localStorage.setItem("pendingSearchQuery", searchQuery);
    localStorage.setItem("5ducks_from_landing", "true");
    
    // Navigate to the app
    window.location.href = '/app';
  }
  
  // Handle onboarding start
  window.handleOnboardingStart = function(type) {
    console.log('Onboarding start tracked:', type);
    // Navigate to planning page with type parameter
    window.location.href = `/planning?type=${type}`;
  }
  
  // Search button click
  if (searchBtn) {
    searchBtn.addEventListener('click', () => handleSearch());
  }
  
  // Search input enter key
  if (searchInput) {
    searchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        handleSearch();
      }
    });
  }
  
  // Example prompt buttons
  examplePrompts.forEach(button => {
    button.addEventListener('click', function() {
      const prompt = this.getAttribute('data-prompt');
      searchInput.value = prompt;
      handleSearch(prompt);
    });
  });
  
  // Try free button
  if (tryFreeBtn) {
    tryFreeBtn.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  
  // Video container - now handled by Arcade embed
  // Video expansion functionality removed since Arcade handles interaction natively
  
  // Strategic onboarding buttons
  if (productBtn) {
    productBtn.addEventListener('click', function() {
      // Track onboarding start event
      console.log('Onboarding start tracked: product');
      
      // Navigate to planning page with product type
      window.location.href = '/planning?type=product';
    });
  }
  
  if (serviceBtn) {
    serviceBtn.addEventListener('click', function() {
      // Track onboarding start event
      console.log('Onboarding start tracked: service');
      
      // Navigate to planning page with service type
      window.location.href = '/planning?type=service';
    });
  }
});