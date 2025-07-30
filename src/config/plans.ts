// src/config/plans.ts

// Define a type for plan capabilities
export interface PlanCapabilities {
  name: string; // Added for display purposes
  canUseChatflow: boolean;
  maxAccounts: number | 'unlimited'; // Switched to 'unlimited' string for clarity
  canUseAdvancedChatflow: boolean;
  maxAutomations: number | 'unlimited'; // This is now a monthly limit
  analyticsRetentionDays: 7 | 30 | 90 | 'unlimited';
  // Add new feature flags here as you build them
  canUseSmartRotation?: boolean;
  canUseAiReplies?: boolean;
  canUseWebhooks?: boolean;
}

// Define a union type for valid plan IDs
export type PlanId = 'free' | 'basic' | 'pro' | 'enterprise';

// Define planFeatures with the new, correct data
export const planFeatures: Record<PlanId, PlanCapabilities> = {
  'free': {
    name: 'Free',
    canUseChatflow: true,
    maxAccounts: 1,
    canUseAdvancedChatflow: false,
    maxAutomations: 5,
    analyticsRetentionDays: 7,
  },
  'basic': {
    name: 'BASIC',
    canUseChatflow: true,
    maxAccounts: 1,
    canUseAdvancedChatflow: false,
    maxAutomations: 15, // Corrected to 15 flows/month
    analyticsRetentionDays: 30,
  },
  'pro': {
    name: 'PRO',
    canUseChatflow: true,
    maxAccounts: 3,
    canUseAdvancedChatflow: true,
    maxAutomations: 50, // Corrected to 50 flows/month
    analyticsRetentionDays: 90,
  },
  'enterprise': {
    name: 'ENTERPRISE',
    canUseChatflow: true,
    maxAccounts: 'unlimited',
    canUseAdvancedChatflow: true,
    maxAutomations: 'unlimited',
    analyticsRetentionDays: 'unlimited',
    canUseSmartRotation: true,
    canUseAiReplies: true,
    canUseWebhooks: true,
  },
};