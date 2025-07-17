// src/config/plans.ts

// Define a type for plan capabilities
export interface PlanCapabilities {// Still keep this for specific DM limits if needed elsewhere
  canUseChatflow: boolean;
  maxAccounts: number | 'Infinity';
  canUseAdvancedChatflow: boolean;
  canUseLeadQualification: boolean;
  canUseSegmentation: boolean;
  maxAutomations: number | 'unlimited'; // Limit for total automations
}

// Define a union type for valid plan IDs
export type PlanId = 'free' | 'basic' | 'professional' | 'enterprise';

// Define planFeatures with explicit type and index signature
export const planFeatures: Record<PlanId, PlanCapabilities> = {
  'free': {
    canUseChatflow: false, maxAccounts: 1, canUseAdvancedChatflow: false,
    canUseLeadQualification: false, canUseSegmentation: false,
    maxAutomations: 10, // Free plan allows 1000 total automation executions per month
  },
  'basic': {
    canUseChatflow: true, maxAccounts: 5, canUseAdvancedChatflow: false,
    canUseLeadQualification: false, canUseSegmentation: false,
    maxAutomations: 5000, // Basic plan allows 5000 total automation executions per month
  },
  'professional': {
    canUseChatflow: true, maxAccounts: Infinity, canUseAdvancedChatflow: true,
    canUseLeadQualification: true, canUseSegmentation: true,
    maxAutomations: 'unlimited', // Professional plan has unlimited automations
  },
  'enterprise': {
    canUseChatflow: true, maxAccounts: Infinity, canUseAdvancedChatflow: true,
    canUseLeadQualification: true, canUseSegmentation: true,
    maxAutomations: 'unlimited', // Enterprise plan has unlimited automations
  },
};
