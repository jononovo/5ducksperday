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
    id: 4,
    slug: "privacy-policy",
    title: "5Ducks Privacy Policy",
    excerpt: "Our complete privacy policy, last updated May 17, 2025.",
    content: `
# 5Ducks Privacy Policy

**Last Updated: May 17, 2025**

## Introduction

Welcome to 5Ducks ("we," "our," or "us"). At 5Ducks, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our lead generation platform and related services (collectively, the "Service").

Please read this Privacy Policy carefully. By accessing or using the Service, you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy. If you do not agree with our policies and practices, please do not use our Service.

## Information We Collect

### Information You Provide to Us

- **Account Information**: When you register for an account, we collect information associated with your Google account, including your name, email address, profile picture, and Google ID.
- **Communication Preferences**: Information about how you customize your email templates and communication settings.
- **Search Criteria**: Information about the types of companies, leadership positions, and contacts you are searching for.
- **Lists and Saved Data**: Information about the lists you create and the leads you save.

### Information We Collect Automatically

- **Usage Data**: Information about how you use our Service, including your interactions with features, pages visited, and actions taken.
- **Device Information**: Information about the device you use to access our Service, including IP address, browser type, operating system, and device identifiers.
- **Cookies and Similar Technologies**: We use cookies and similar tracking technologies to collect information about your browsing activities and to maintain your session while using our Service.

### Information We Receive From Third Parties

- **Google Authentication**: When you sign in with Google, we receive information from Google in accordance with your Google account settings and the permissions you grant us.
- **Third-Party Data Sources**: We may collect professional contact information from publicly available sources, business directories, and other legitimate data sources as part of our lead generation services.

## How We Use Your Information

We use the information we collect for various purposes, including:

- **Providing and Maintaining the Service**: To deliver the features and functionality of our lead generation platform, including searching for companies and contacts, creating lists, and sending emails.
- **Account Management**: To create and manage your account, authenticate you, and personalize your experience.
- **Communications**: To facilitate your communications with prospects via Gmail, in accordance with your instructions.
- **Service Improvement**: To understand how our Service is used, identify areas for improvement, and develop new features.
- **Legal Compliance**: To comply with applicable laws, regulations, legal processes, or governmental requests.
- **Security and Fraud Prevention**: To detect, prevent, and address fraud, security breaches, and other potentially harmful activities.

## How We Share Your Information

We may share your information in the following circumstances:

- **With Your Consent**: We may share your information when you direct us to do so or grant us permission, such as when you authorize us to send emails on your behalf via Gmail.
- **Service Providers**: We may share your information with third-party vendors, consultants, and other service providers who need access to such information to perform work on our behalf. These service providers include:
  - Anthropic, OpenAI, and Perplexity (AI services)
  - AeroLeads and Hunter.io (lead generation services)
  - AWS (cloud hosting)
  - Replit (development environment)
- **Business Transfers**: If we are involved in a merger, acquisition, or sale of all or a portion of our assets, your information may be transferred as part of that transaction.
- **Legal Requirements**: We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., a court or a government agency).
- **Protection of Rights**: We may disclose your information to protect the rights, property, or safety of 5Ducks, our users, or others.

## Your Privacy Rights and Choices

Depending on your location, you may have certain rights regarding your personal information. These may include:

- **Access and Portability**: You have the right to access the personal information we hold about you and in some cases, receive this information in a structured, commonly used format.
- **Correction**: You have the right to request that we correct inaccurate or incomplete personal information we hold about you.
- **Deletion**: You have the right to request that we delete your personal information in certain circumstances.
- **Restriction and Objection**: You have the right to request that we restrict the processing of your personal information or to object to our processing of your personal information.
- **Withdrawal of Consent**: Where we rely on your consent to process your personal information, you have the right to withdraw your consent at any time.

To exercise these rights, please contact us at [privacy@5ducks.com](mailto:privacy@5ducks.com).

### California Privacy Rights

If you are a California resident, the California Consumer Privacy Act (CCPA) and the California Privacy Rights Act (CPRA) provide you with specific rights regarding your personal information. This section describes your CCPA/CPRA rights and explains how to exercise those rights.

#### Categories of Personal Information We Collect

We have collected the following categories of personal information from consumers within the last twelve (12) months:

| Category | Examples | Collected |
|----------|----------|-----------|
| Identifiers | Name, email address, IP address | Yes |
| Personal information categories listed in the California Customer Records statute | Name, phone number, address | Yes |
| Commercial information | Records of products or services purchased or considered | Yes |
| Internet or other similar network activity | Browsing history, search history, information on a consumer's interaction with a website | Yes |
| Professional or employment-related information | Current or past job history, professional contacts | Yes |

#### Sources of Personal Information

We obtain the categories of personal information listed above from the following sources:
- Directly from you (e.g., from forms you complete or products and services you use)
- Indirectly from you (e.g., from observing your actions on our Service)
- From third-party service providers (e.g., Google authentication)
- From publicly available sources as part of our lead generation services

#### Use of Personal Information

We may use or disclose the personal information we collect for the business purposes described in the "How We Use Your Information" section of this Privacy Policy.

#### Sharing of Personal Information

We may disclose your personal information to a third party for business purposes as described in the "How We Share Your Information" section of this Privacy Policy.

#### Your Rights and Choices

The CCPA/CPRA provides California residents with specific rights regarding their personal information. These rights include:

**Right to Know:** You have the right to request that we disclose certain information to you about our collection and use of your personal information over the past 12 months.

**Right to Delete:** You have the right to request that we delete any of your personal information that we collected from you and retained, subject to certain exceptions.

**Right to Correct:** You have the right to request that we correct inaccurate personal information that we maintain about you.

**Right to Opt-Out of Sale or Sharing:** We do not sell or share personal information as those terms are defined under the CCPA/CPRA.

**Right to Limit Use and Disclosure of Sensitive Personal Information:** We do not use or disclose sensitive personal information for purposes other than those specified under the CCPA/CPRA.

**Right to Non-Discrimination:** We will not discriminate against you for exercising any of your CCPA/CPRA rights.

#### Exercising Your Rights

To exercise your rights described above, please submit a verifiable consumer request to us by:
- Emailing us at [quack@5ducks.ai](mailto:quack@5ducks.ai)

Only you, or a person registered with the California Secretary of State that you authorize to act on your behalf, may make a verifiable consumer request related to your personal information. You may only make a verifiable consumer request for access or data portability twice within a 12-month period.

We will respond to your request within 45 days of its receipt. If we require more time, we will inform you of the reason and extension period in writing.

## Data Security

We implement appropriate technical and organizational measures to protect the security of your personal information. However, please understand that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.

## Children's Privacy

Our Service is not directed to children under the age of 18, and we do not knowingly collect personal information from children under 18. If we learn we have collected or received personal information from a child under 18 without verification of parental consent, we will delete that information.

## International Data Transfers

Your information may be transferred to, and maintained on, computers located outside of your state, province, country, or other governmental jurisdiction where the data protection laws may differ from those in your jurisdiction. If you are located outside the United States and choose to provide information to us, please note that we transfer the information to the United States and process it there.

### GDPR Compliance

If you are a resident of the European Economic Area (EEA), United Kingdom, or Switzerland, you have certain data protection rights under the General Data Protection Regulation (GDPR) or similar applicable laws. These rights include:

**Lawful Basis for Processing:** We process your personal data on the following legal bases:
- Consent: Where you have given us explicit consent to process your personal data.
- Contractual Necessity: Where processing is necessary for the performance of a contract with you.
- Legitimate Interests: Where processing is necessary for our legitimate interests, provided those interests do not override your fundamental rights and freedoms.
- Legal Obligation: Where processing is necessary for compliance with a legal obligation.

**Data Subject Rights:** In addition to the rights outlined in the "Your Privacy Rights and Choices" section, you have the right to:
- Lodge a complaint with a supervisory authority in your country of residence, place of work, or where an alleged infringement of data protection law has occurred.
- Object to processing based on legitimate interests or for direct marketing purposes.
- Not be subject to decisions based solely on automated processing, including profiling, which produces legal or similarly significant effects.

**International Transfers:** When we transfer your personal data outside the EEA, UK, or Switzerland, we ensure appropriate safeguards are in place, such as:
- Standard Contractual Clauses approved by the European Commission.
- Binding Corporate Rules for transfers within our corporate group.
- Adequacy decisions by the European Commission, where applicable.

**Data Retention:** We retain your personal data only for as long as necessary to fulfill the purposes for which we collected it, including for the purposes of satisfying any legal, accounting, or reporting requirements.

**Data Protection Officer:** If you have any questions about our GDPR compliance or wish to exercise your rights, you can contact us at [quack@5ducks.ai](mailto:quack@5ducks.ai).

## Changes to This Privacy Policy

We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date at the top. You are advised to review this Privacy Policy periodically for any changes.

## Contact Us

If you have any questions about this Privacy Policy, please contact us at:

**5Ducks**  
Email: [quack@5ducks.ai](mailto:quack@5ducks.ai)  
Address: 55 Water Street, New York City, 10005 NY
    `,
    date: "2025-05-17",
    author: "5Ducks Legal Team",
    category: "Legal",
    tags: ["privacy", "legal", "terms"],
    imageUrl: "https://placehold.co/600x400/f5f3ff-faf5ff/7c3aed?text=Privacy+Policy"
  },
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
    imageUrl: "https://placehold.co/600x400/eef2ff-d1fae5/4338ca?text=5+Ducks+Guide"
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
    imageUrl: "https://placehold.co/600x400/f5f3ff-faf5ff/7c3aed?text=Consistency+Beats+Motivation"
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
    imageUrl: "https://placehold.co/600x400/eff6ff-dbeafe/3b82f6?text=AI+in+Sales"
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