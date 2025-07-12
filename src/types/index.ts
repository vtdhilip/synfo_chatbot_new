// src/types/index.ts

// === Account Interface ===
export interface Account {
  id: string;
  platform: 'INSTAGRAM' | 'FACEBOOK' | 'WHATSAPP';
  clientName: string;
  instagramPageId: string;
  metaPageToken: string;
  facebookPageId?: string;
  subscriptionStatus: 'active' | 'inactive';
  agencyId: string;
  agencyName: string;
  flow?: ChatFlow;
  dmAutomations?: SimpleKeywordAutomation[];
  commentAutomations?: CommentAutomation[];
  storyAutomation?: any;
}

// === Simple DM Automation Types ===
export interface SimpleKeywordReply {
  text: string;
  link?: {
    url: string;
    title: string;
  };
}

export interface SimpleKeywordAutomation {
  id: string;
  name: string;
  enabled: boolean;
  type: 'simple_keyword';
  keywords: string[];
  reply: SimpleKeywordReply;
}

// === Comment Automation Types ===
// FIX: Added optional link property to the comment reply
export interface CommentReply {
  text: string;
  link?: {
    url: string;
    title: string;
  };
}

export type CommentTriggerType = 'all_comments' | 'keyword_match';

export interface CommentAutomation {
  id: string;
  name: string;
  enabled: boolean;
  type: 'comment_automation';
  postId: string | null;
  postThumbnailUrl?: string;
  postCaption?: string;
  triggerType: CommentTriggerType;
  keywords: string[];
  reply: CommentReply;
  commentReplyText?: string;
}

// === Instagram Post Type (for fetching posts) ===
export interface InstagramPost {
  id: string;
  thumbnail_url: string;
  media_url: string;
  caption: string;
  permalink: string;
  media_type: string;
}

// === Chat Flow (Drag-and-Drop Editor) Types ===
export type NodeType = 'start' | 'textMessage' | 'question' | 'condition' | 'apiCall' | 'humanHandoff';

export interface FlowNodeData {
    label?: string;
    keyword?: string;
    options?: { label: string; payload: string }[];
    url?: string;
    method?: 'GET' | 'POST';
}

export interface FlowNode {
    id: string;
    type: NodeType;
    position: { x: number; y: number; };
    data: FlowNodeData;
    sourcePosition?: 'left' | 'right' | 'top' | 'bottom';
    targetPosition?: 'left' | 'right' | 'top' | 'bottom';
}

export interface FlowEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    type?: string;
    animated?: boolean;
    style?: React.CSSProperties;
}

export interface ChatFlow {
    nodes: FlowNode[];
    edges: FlowEdge[];
}
