// Mock data for email conversation features
export const MOCK_ACTIVE_CONTACTS = [
  {
    id: 1,
    name: "Sarah Johnson",
    email: "sarah.johnson@acmecorp.com",
    company: "Acme Corporation",
    role: "Marketing Director",
    lastMessage: "That sounds interesting. Can you tell me more about your pricing?",
    lastMessageDate: new Date("2025-05-10T14:30:00"),
    unread: true,
    companyId: 1,
    userId: 1
  },
  {
    id: 2,
    name: "Michael Chen",
    email: "michael.chen@techinnovate.com",
    company: "Tech Innovate",
    role: "CTO",
    lastMessage: "I've forwarded your proposal to our team. Let's schedule a call.",
    lastMessageDate: new Date("2025-05-09T09:15:00"),
    unread: false,
    companyId: 2,
    userId: 1
  },
  {
    id: 3,
    name: "Aisha Patel",
    email: "aisha.patel@globexind.com",
    company: "Globex Industries",
    role: "Head of Operations",
    lastMessage: "Thanks for your email. I'd be interested in learning how this works for our industry specifically.",
    lastMessageDate: new Date("2025-05-08T16:45:00"),
    unread: true,
    companyId: 3,
    userId: 1
  }
];

export const MOCK_EMAIL_THREADS = [
  {
    id: 101,
    contactId: 1,
    userId: 1,
    subject: "Introduction to 5Ducks Lead Generation Platform",
    lastUpdated: new Date("2025-05-10T14:30:00"),
    createdAt: new Date("2025-05-07T10:30:00"),
    isArchived: false,
    messages: [
      {
        id: 1001,
        threadId: 101,
        from: "me",
        fromEmail: "user@example.com",
        to: "Sarah Johnson",
        toEmail: "sarah.johnson@acmecorp.com",
        content: "Hi Sarah,\n\nI noticed Acme Corporation has been expanding its marketing efforts recently. I wanted to introduce you to our lead generation platform that has helped companies like yours increase qualified leads by 35%.\n\nWould you be interested in a quick 15-minute demo?\n\nBest regards,\nAlex",
        timestamp: new Date("2025-05-07T10:30:00"),
        isRead: true,
        direction: "outbound"
      },
      {
        id: 1002,
        threadId: 101,
        from: "Sarah Johnson",
        fromEmail: "sarah.johnson@acmecorp.com",
        to: "me",
        toEmail: "user@example.com",
        content: "Hi Alex,\n\nThat sounds interesting. Can you tell me more about your pricing?\n\nSarah Johnson\nMarketing Director\nAcme Corporation",
        timestamp: new Date("2025-05-10T14:30:00"),
        isRead: false,
        direction: "inbound"
      }
    ]
  },
  {
    id: 102,
    contactId: 1,
    userId: 1,
    subject: "Marketing Webinar Invitation",
    lastUpdated: new Date("2025-05-01T11:15:00"),
    createdAt: new Date("2025-05-01T11:15:00"),
    isArchived: false,
    messages: [
      {
        id: 1003,
        threadId: 102,
        from: "me",
        fromEmail: "user@example.com",
        to: "Sarah Johnson",
        toEmail: "sarah.johnson@acmecorp.com",
        content: "Hi Sarah,\n\nWe're hosting a webinar next week on 'Digital Marketing Trends for 2025'. Given your role at Acme, I thought you might be interested.\n\nHere's the registration link: [webinar link]\n\nBest,\nAlex",
        timestamp: new Date("2025-05-01T11:15:00"),
        isRead: true,
        direction: "outbound"
      }
    ]
  }
];