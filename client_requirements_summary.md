# 5Ducks Project: Client Requirements Summary

## General Project Concept
- A contact enrichment and sales prospecting platform for B2B outreach
- Brand name is "5Ducks" (no space) with "5" in light grey and "Ducks" in dark grey
- Focus on a playful, user-friendly approach to sales prospecting

## Design Requirements

### Navigation Requirements
- Navigation should have a hamburger menu that includes:
  - Logout option
  - Build option 
  - Account option
- Search tab should link to /app (not landing page)
- Outreach should be positioned second in the navigation menu

### Blog Design
- Blog post backgrounds should use subtle multi-color gradients instead of plain colors
- Use light yellows in the gradient for more visual appeal
- Category tags in blog posts should be consistent with solid dark gray color
- Remove duplicate footer from blog post pages

### Footer Requirements
- Use the landing page footer design across the entire application
- Remove the newsletter subscription option
- Add a newsletter link that opens in a new tab (destination TBD)

### Content Updates
- Privacy policy should be in blog post format rather than a separate page
- Added "Why Sign-up?" section with three points
- Added "Become an Eliteist" section with progression levels

### Branding Details
- "5Ducks" has "5" in light grey and "Ducks" in dark grey
- Landing page subtitle uses duck emoji with a two-line format
- Landing page statistics use original color scheme but with updated values

## Technical Updates
- List IDs increment properly now (fixed bug where IDs weren't incrementing correctly)
- App uses Replit database, not PostgreSQL
- Fixed "Back to Blog" button navigation issues
- Added logging to better track navigation

## Known Issues
- Duplicate footer on blog page causing display issues (fixed)
- Nested anchor tags causing DOM validation warnings