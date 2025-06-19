# Page Architecture Documentation

## Overview

The application uses a hybrid architecture combining static HTML pages for public content (SEO optimization) with a React SPA for authenticated user experiences. This approach maximizes search engine visibility while providing rich interactivity for users.

## Architecture Patterns

### Two-Tier System

**Tier 1: Static Public Pages**
- Location: `static/` directory
- Technology: Vanilla HTML, CSS, JavaScript
- Purpose: SEO-optimized landing pages, marketing content
- Served via: Express static middleware

**Tier 2: React Application**
- Location: `client/src/` directory  
- Technology: React, TypeScript, Wouter routing
- Purpose: Authenticated user dashboard and tools
- Served via: Vite development server or static build

## Directory Structure

```
project/
├── static/                     # Static HTML pages
│   ├── landing.html           # Main landing page (SEO optimized)
│   ├── js/
│   │   ├── auth-check.js      # Firebase auth integration
│   │   └── landing.js         # Landing page interactions
│   └── css/                   # Static page styles
│
├── client/src/                # React SPA
│   ├── pages/                 # React page components
│   │   ├── landing.tsx        # React version (for reference)
│   │   ├── blog.tsx           # Blog listing page
│   │   ├── blog-post.tsx      # Individual blog posts
│   │   └── ...
│   └── components/            # Reusable React components
│
└── server/                    # Express backend
    ├── routes.ts              # API routes and static serving
    └── index.ts               # Server configuration
```

## Routing Configuration

### Static Page Routes (server/routes.ts)
```javascript
// Serve static files
app.use('/static', express.static(path.join(__dirname, '../static')));

// Root landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../static/landing.html'));
});

// Blog pages (to be implemented)
app.get('/blog', (req, res) => {
  res.sendFile(path.join(__dirname, '../static/blog.html'));
});

app.get('/blog/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, '../static/blog-post.html'));
});
```

### React SPA Routes (client/src/App.tsx)
```javascript
<Switch>
  {/* Static landing - no React route needed */}
  <Route path="/app" component={Home} />
  <Route path="/app/build" component={Build} />
  <Route path="/app/lists" component={Lists} />
  {/* ... other authenticated routes */}
</Switch>
```

## Authentication Bridge

### Firebase Integration
Both static pages and React app share Firebase configuration:

```javascript
// static/js/auth-check.js
const firebaseConfig = {
  apiKey: "AIzaSyATWWlnIrPWNgxKgk5y8k71vGbJi9aDbuzU",
  authDomain: "fire-5-ducks.firebaseapp.com",
  projectId: "fire-5-ducks",
  appId: "1:1072598853946:web:15b5efc5feda6b133e8"
};

firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    window.location.href = '/app'; // Redirect to React SPA
  }
});
```

### State Transfer Mechanism
```javascript
// Landing page stores search query
localStorage.setItem("pendingSearchQuery", searchQuery);
localStorage.setItem("5ducks_from_landing", "true");

// React app picks up the query
useEffect(() => {
  const pendingQuery = localStorage.getItem("pendingSearchQuery");
  if (pendingQuery) {
    // Execute search immediately
    executeSearch(pendingQuery);
    localStorage.removeItem("pendingSearchQuery");
  }
}, []);
```

## Development vs Production

### Development Mode
- Vite serves React SPA with hot reloading
- Static files served directly from `static/` directory
- All routes handled by single Express server

### Production Mode
- React app built to `public/` directory
- Static files served via Express static middleware
- Optimized bundles and assets

## Building Static Pages

### Template Structure
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Title | 5Ducks</title>
  <meta name="description" content="SEO description">
  
  <!-- Tailwind CSS via CDN (development) -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <!-- Firebase SDK -->
  <script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-auth-compat.js"></script>
</head>
<body>
  <!-- Page content -->
  
  <!-- Auth check script -->
  <script src="/static/js/auth-check.js"></script>
  
  <!-- Page-specific JavaScript -->
  <script src="/static/js/page-script.js"></script>
</body>
</html>
```

### JavaScript Pattern
```javascript
// static/js/page-script.js
document.addEventListener('DOMContentLoaded', function() {
  // Page-specific functionality
  
  // Auth-aware navigation
  function navigateToApp(path = '/app') {
    // Check if user is authenticated
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        window.location.href = path;
      } else {
        // Show registration modal or redirect to auth
        window.location.href = '/auth';
      }
    });
  }
  
  // CTA button handlers
  document.querySelectorAll('.cta-button').forEach(button => {
    button.addEventListener('click', () => navigateToApp());
  });
});
```

## Blog Implementation Strategy

### Static Blog Architecture

**1. Blog Listing Page (`static/blog.html`)**
- Grid layout of blog post previews
- SEO-optimized meta tags
- Pagination support
- Category filtering

**2. Individual Blog Posts (`static/blog-post.html`)**
- Dynamic content loading via JavaScript
- URL slug-based routing
- Social sharing integration
- Related posts section

**3. Content Management**
```javascript
// static/js/blog-data.js
const blogPosts = [
  {
    slug: 'effective-sales-outreach-strategies',
    title: 'Effective Sales Outreach Strategies for 2024',
    excerpt: 'Learn the latest techniques...',
    publishDate: '2024-01-15',
    author: 'Marketing Team',
    content: 'Full blog post content...',
    tags: ['sales', 'outreach', 'strategy']
  }
  // ... more posts
];

// Blog post loader
function loadBlogPost() {
  const slug = window.location.pathname.split('/').pop();
  const post = blogPosts.find(p => p.slug === slug);
  
  if (post) {
    document.title = `${post.title} | 5Ducks Blog`;
    document.querySelector('meta[name="description"]').content = post.excerpt;
    // Populate content
  }
}
```

### SEO Best Practices

**Meta Tags Template:**
```html
<head>
  <title>{{ post.title }} | 5Ducks Blog</title>
  <meta name="description" content="{{ post.excerpt }}">
  
  <!-- Open Graph -->
  <meta property="og:title" content="{{ post.title }}">
  <meta property="og:description" content="{{ post.excerpt }}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="{{ canonical_url }}">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{{ post.title }}">
  <meta name="twitter:description" content="{{ post.excerpt }}">
  
  <!-- Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "{{ post.title }}",
    "description": "{{ post.excerpt }}",
    "datePublished": "{{ post.publishDate }}"
  }
  </script>
</head>
```

## Implementation Guidelines

### For Static Pages
1. **Use Semantic HTML** for better SEO
2. **Optimize Images** with proper alt tags and lazy loading
3. **Minimize JavaScript** for faster loading
4. **Include Schema Markup** for rich snippets
5. **Mobile-First Design** with responsive breakpoints

### For React Components
1. **Maintain Consistency** with static page designs
2. **Use React Helmet** for dynamic meta tags
3. **Implement Proper Loading States**
4. **Handle Authentication Gracefully**
5. **Optimize Bundle Size** with code splitting

### Navigation Between Systems
```javascript
// From static pages to React app
function goToApp(path = '/app') {
  // Preserve any relevant state
  if (searchQuery) {
    localStorage.setItem('pendingSearchQuery', searchQuery);
  }
  window.location.href = path;
}

// From React app to static pages
function goToStaticPage(path) {
  // Use window.location for full page refresh
  window.location.href = path;
}
```

## Best Practices Summary

1. **Static pages** for SEO-critical content (landing, blog, marketing)
2. **React SPA** for authenticated user experiences
3. **Shared Firebase config** for seamless auth transitions
4. **localStorage** for state transfer between systems
5. **Express routing** to serve appropriate content type
6. **Consistent styling** using shared Tailwind classes
7. **Performance optimization** through selective loading

This architecture provides the best of both worlds: excellent SEO for public content and rich interactivity for user dashboards.