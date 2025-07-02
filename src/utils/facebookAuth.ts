export const generateFacebookAuthLink = (instagramPageId: string, clientId: string): string => {
  const appId = 740006708601685;
  // This must EXACTLY match the URL in your Facebook App settings and your Cloud Function
  const redirectUri = `${window.location.origin}/auth/callback`; 

  // Encode the client's database ID and their Instagram ID into the state
  const state = btoa(JSON.stringify({ clientId, instagramPageId }));

  const scope = "pages_show_list,instagram_basic,instagram_manage_messages,pages_read_engagement";

  return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&state=${state}&scope=${scope}&response_type=code`;
};
