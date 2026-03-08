export interface User {
  id: string;
  message_count: number;
  unlimited_until: number;
  subscription_tier: 'free' | 'pro' | 'ultra';
  persona: string;
  preferences: string;
  memory?: any[];
  files?: any[];
}

export interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  image?: string;
  video?: string;
}

export interface Challenge {
  type: 'logic' | 'creative' | 'factual';
  question: string;
  answer?: string;
  scenario?: string;
  text?: string;
}
