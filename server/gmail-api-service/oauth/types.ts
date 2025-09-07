export interface GmailAuthRequest {
  userId: string;
}

export interface GmailCallbackQuery {
  code: string;
  state: string;
}

export interface SendGmailRequest {
  to: string;
  subject: string;
  content: string;
}

export interface GmailStatusResponse {
  connected: boolean;
  userEmail?: string;
}

export interface GmailDisconnectResponse {
  success: boolean;
  message: string;
}

export interface SendGmailResponse {
  success: boolean;
}

export interface GmailUserInfo {
  email: string;
  name?: string;
}