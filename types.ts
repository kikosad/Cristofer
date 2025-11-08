
export enum Feature {
  EBOOK = 'EBOOK',
  CHAT = 'CHAT',
  RESEARCH = 'RESEARCH',
  IMAGE_EDITOR = 'IMAGE_EDITOR',
  LIVE_JOURNAL = 'LIVE_JOURNAL',
  INSTA_POST_CREATOR = 'INSTA_POST_CREATOR',
}

export interface Page {
  page: number;
  chapter: string;
  content: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}