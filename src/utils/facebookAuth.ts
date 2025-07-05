
export const generateFacebookAuthLink = (state: string): string => {
  // Use your real App ID
  const client_id = "740006708601685";
  
  const redirect_uri = "https://admin.synapticinfo.com/facebook/callback";
  const scope = [
    'pages_show_list',

'pages_messaging',

'instagram_basic',

'instagram_manage_messages',

'instagram_manage_comments',

'business_management',

'instagram_content_publish'
  ].join(',');
  const params = new URLSearchParams({
    client_id,
    redirect_uri,
    scope,
    response_type: 'code',
    state,
  });

  // Use the main facebook.com dialog URL for all business connections
  return `https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`;
};