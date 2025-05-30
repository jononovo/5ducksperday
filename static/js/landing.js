// Landing page interactions
document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const tryFreeBtn = document.getElementById('try-free-btn');
  const examplePrompts = document.querySelectorAll('.example-prompt');
  const videoContainer = document.getElementById('video-container');
  
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
  
  // Mobile menu toggle
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', function() {
      mobileMenu.classList.toggle('hidden');
    });
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', function(e) {
      if (!mobileMenuBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.add('hidden');
      }
    });
  }
  
  // Try free button
  if (tryFreeBtn) {
    tryFreeBtn.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  
  // Video container (placeholder for now)
  if (videoContainer) {
    videoContainer.addEventListener('click', function() {
      // Placeholder for video functionality
      console.log('Video demo clicked');
    });
  }
});