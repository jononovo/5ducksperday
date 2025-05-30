// Landing page interactions
document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const loginBtn = document.getElementById('login-btn');
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
  
  // Login button
  if (loginBtn) {
    loginBtn.addEventListener('click', function() {
      window.location.href = '/app';
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