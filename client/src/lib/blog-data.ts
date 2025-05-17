export interface BlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  author: string;
  category: string;
  tags: string[];
  imageUrl?: string;
}

export const blogPosts: BlogPost[] = [
  {
    id: 1,
    slug: "getting-started-with-5ducks",
    title: "Getting Started with 5Ducks: Your First Week",
    excerpt: "A guide to getting the most out of your first week using 5Ducks for contact discovery and outreach.",
    content: `
# Getting Started with 5Ducks

Welcome to 5Ducks! This guide will help you make the most of your first week using our platform.

## Day 1: Set Up Your Account

After signing up, take a few minutes to:

1. **Complete your profile** - Add your company details and role to help personalize your experience
2. **Connect your email** - Link your business email to enable outreach features
3. **Try your first search** - Run a simple search for companies in your target industry

## Days 2-3: Discover Your Ideal Prospects

Use these days to refine your search approach:

1. **Try different search queries** - Experiment with industry, location, and company size parameters
2. **Save promising lists** - When you find good matches, save them for future outreach
3. **Review contact suggestions** - Look through the AI-suggested contacts for each company

## Days 4-5: Prepare Your Outreach

Now it's time to start engaging:

1. **Select your best prospects** - Choose 5 high-potential contacts for your first outreach
2. **Customize message templates** - Tailor your templates to each prospect's specific needs
3. **Schedule your sends** - Set up your first batch of 5 emails

## Keep the Momentum Going

Remember, 5Ducks is designed around the "5 per day" philosophy. By focusing on just 5 quality outreach emails daily, you'll:

- Maintain consistent outreach without feeling overwhelmed
- Give each prospect the attention they deserve
- Build a sustainable sales habit that grows over time

After your first week, you'll unlock HATCHED-LEVEL status with expanded limits and features!
    `,
    date: "2025-05-01",
    author: "Jon Smith",
    category: "Tutorial",
    tags: ["getting started", "tutorial", "outreach"],
    imageUrl: "https://placehold.co/600x400/2563eb/FFFFFF?text=5+Ducks+Guide"
  },
  {
    id: 2,
    slug: "consistency-over-motivation",
    title: "Why Consistency Beats Motivation in Sales",
    excerpt: "Learn why building consistent habits is more important than waiting for motivation when it comes to sales outreach.",
    content: `
# Why Consistency Beats Motivation in Sales

In the world of sales and outreach, there's a simple truth that separates successful salespeople from everyone else: **consistency beats motivation every single time**.

## The Motivation Myth

Many people believe they need to feel motivated to do sales outreach. They wait for that perfect moment when they feel energized and inspired to reach out to prospects.

But here's the problem: motivation is unreliable. It comes and goes. If your sales strategy depends on feeling motivated, you'll have sporadic results at best.

## The Power of Consistency

Consistency, on the other hand, is about developing habits that you maintain regardless of how you feel. When you commit to reaching out to just 5 prospects every day:

- You build momentum that carries you forward
- You create a sustainable practice that doesn't burn you out
- You generate predictable results over time
- You develop sales skills through regular practice

## How 5Ducks Helps You Stay Consistent

We designed 5Ducks around this core principle. By limiting you to 5 emails per day:

1. The task feels manageable, not overwhelming
2. You focus on quality over quantity
3. You build a daily habit that compounds over time
4. You get rewarded for consistency, not burnout-inducing sprints

## Start Small, Stay Consistent

Remember, the salespeople who win aren't necessarily the most talented or the most motivated. They're the ones who show up day after day, consistently taking action.

Build your 5-per-day habit with 5Ducks, and watch how these small, consistent actions transform your sales results over time.
    `,
    date: "2025-05-10",
    author: "Jon Smith",
    category: "Strategy",
    tags: ["consistency", "habits", "sales strategy"],
    imageUrl: "https://placehold.co/600x400/2563eb/FFFFFF?text=Consistency+Beats+Motivation"
  },
  {
    id: 3,
    slug: "ai-sales-future",
    title: "The Future of AI in Sales Outreach",
    excerpt: "Explore how AI is transforming sales outreach and what it means for modern sales professionals.",
    content: `
# The Future of AI in Sales Outreach

Artificial intelligence is rapidly transforming sales outreach, but not in the way many people expect. Let's explore what the AI-powered future of sales really looks like.

## Beyond Automation: Augmentation

The most powerful AI sales tools aren't about replacing humans or fully automating outreach. They're about augmenting human capabilities:

- **Finding the right prospects** through intelligent data analysis
- **Suggesting personalized approaches** based on prospect characteristics
- **Learning from successful interactions** to improve future recommendations
- **Removing repetitive tasks** so you can focus on relationship-building

## How 5Ducks Uses AI

Our approach to AI is focused on enhancing your natural sales abilities:

1. **Discovery AI** helps you find precisely the right companies and contacts
2. **Learning AI** analyzes which approaches work best for your specific offerings
3. **Personalization AI** helps tailor messages to each prospect's unique situation
4. **Timing AI** suggests the optimal moments for follow-ups

## The Human Element Remains Essential

Despite these advances, the human element remains crucial. AI can't:

- Build authentic relationships
- Show genuine curiosity about a prospect's needs
- Demonstrate true empathy for their challenges
- Apply creative problem-solving to unique situations

## The Ideal Partnership

The future belongs to sales professionals who know how to partner with AI:

- Let AI handle the data-heavy lifting
- Let AI learn from patterns in your successes
- Let AI suggest improvements to your approach
- But maintain your human touch in every interaction

This balanced approach is at the heart of the 5Ducks philosophy—technology that enhances rather than replaces the human elements that make sales meaningful and effective.
    `,
    date: "2025-05-15",
    author: "Jon Smith",
    category: "Technology",
    tags: ["AI", "technology", "future of sales"],
    imageUrl: "https://placehold.co/600x400/2563eb/FFFFFF?text=AI+in+Sales"
  }
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find(post => post.slug === slug);
}

export function getAllBlogPosts(): BlogPost[] {
  return [...blogPosts].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}