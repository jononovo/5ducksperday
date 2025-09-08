export interface PerplexityMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
