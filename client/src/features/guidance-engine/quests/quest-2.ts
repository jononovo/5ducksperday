import type { Quest } from "../types";

export const quest2: Quest = {
  id: "send-an-email",
  name: "Send an Email",
  description: "Learn how to compose and send personalized emails to your contacts.",
  emoji: "✉️",
  challenges: [
    {
      id: "generate-email-from-prompt",
      name: "Generate an Email from a Prompt",
      description: "Generate an email from a prompt and edit it",
      emoji: "✍️",
      steps: [],
      completionMessage: "You've created your first AI-generated email! ✨",
    },
    {
      id: "change-the-tone",
      name: "Change the Tone",
      description: "Adjust the tone of your email to match your style",
      emoji: "🎭",
      steps: [],
      completionMessage: "You've learned how to adjust email tone! 🎯",
    },
    {
      id: "add-strategy-guidance",
      name: "Add a Strategy Guidance",
      description: "Add strategic context to improve your email",
      emoji: "🧠",
      steps: [],
      completionMessage: "You've added strategic guidance to your email! 💡",
    },
    {
      id: "send-email-default-sender",
      name: "Send Email Using Default Sender",
      description: "Send your email using the default email sender",
      emoji: "📤",
      steps: [],
      completionMessage: "Congratulations! You've sent your first email! 🎉",
    },
  ],
};
