import React, { useState, useEffect } from 'react';
import {
  type Account,
  CommentAutomation,
  CommentTriggerType,
  InstagramPost
} from '../types';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import { User } from 'lucide-react';

interface CommentAutomationEditorProps {
  account: Account;
  existingAutomation?: CommentAutomation;
  onSave: (automationData: CommentAutomation) => Promise<void>;
}

const CommentAutomationEditor: React.FC<CommentAutomationEditorProps> = ({ account, existingAutomation, onSave }) => {
  const [name, setName] = useState('');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedPostThumbnail, setSelectedPostThumbnail] = useState<string | undefined>(undefined);
  const [selectedPostCaption, setSelectedPostCaption] = useState<string | undefined>(undefined);
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [triggerType, setTriggerType] = useState<CommentTriggerType>('all_comments');
  const [keywords, setKeywords] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [commentReplyText, setCommentReplyText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [showLinkFields, setShowLinkFields] = useState(false);
  const [loading, setLoading] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const keywordSuggestions = ['price', 'link', 'info', 'shop', 'hello', 'help'];

  useEffect(() => {
    if (existingAutomation) {
      setName(existingAutomation.name);
      setSelectedPostId(existingAutomation.postId);
      setSelectedPostThumbnail(existingAutomation.postThumbnailUrl);
      setSelectedPostCaption(existingAutomation.postCaption);
      setTriggerType(existingAutomation.triggerType);
      setKeywords(existingAutomation.keywords.join(', '));
      setReplyMessage(existingAutomation.reply.text);
      setCommentReplyText(existingAutomation.commentReplyText || '');

      if (existingAutomation.reply.link) {
        setLinkUrl(existingAutomation.reply.link.url);
        setLinkTitle(existingAutomation.reply.link.title);
        setShowLinkFields(true);
      } else {
        setLinkUrl('');
        setLinkTitle('');
        setShowLinkFields(false);
      }
    } else {
      setName('');
      setSelectedPostId(null);
      setSelectedPostThumbnail(undefined);
      setSelectedPostCaption(undefined);
      setTriggerType('all_comments');
      setKeywords('');
      setReplyMessage('');
      setCommentReplyText('');
      setLinkUrl('');
      setLinkTitle('');
      setShowLinkFields(false);
    }
  }, [existingAutomation]);

  useEffect(() => {
    const fetchPosts = async () => {
      if (!account.id) return;
      setPostsLoading(true);
      try {
        const app = getApp();
        const functionsInstance = getFunctions(app);
        const getInstagramPostsCallable = httpsCallable(functionsInstance, 'getInstagramPosts');
        const result = await getInstagramPostsCallable({ clientId: account.id });
        const fetchedPosts = (result.data as { posts: InstagramPost[] }).posts;
        setPosts(fetchedPosts);

        if (existingAutomation && existingAutomation.postId) {
          const currentPostInFetched = fetchedPosts.find(p => p.id === existingAutomation.postId);
          if (currentPostInFetched) {
            setSelectedPostThumbnail(currentPostInFetched.thumbnail_url);
            setSelectedPostCaption(currentPostInFetched.caption);
          }
        }
      } catch (error) {
        console.error("Failed to fetch posts:", error);
        setSaveError("Failed to load posts.");
      } finally {
        setPostsLoading(false);
      }
    };
    fetchPosts();
  }, [account.id, existingAutomation]);

  const handleSave = async () => {
    setLoading(true);
    setSaveError(null);
    setSaveSuccess(false);

    if (!name.trim()) {
      setSaveError('Automation name cannot be empty.');
      setLoading(false);
      return;
    }
    if (!selectedPostId) {
      setSaveError('Please select a post for the automation.');
      setLoading(false);
      return;
    }
    if (!replyMessage.trim()) {
      setSaveError('The DM reply message cannot be empty.');
      setLoading(false);
      return;
    }
    if (triggerType === 'keyword_match' && !keywords.trim()) {
      setSaveError('Keywords cannot be empty for keyword match automation.');
      setLoading(false);
      return;
    }
    if (showLinkFields && (!linkUrl.trim() || !linkTitle.trim())) {
      setSaveError('Link URL and Title cannot be empty if link fields are shown.');
      setLoading(false);
      return;
    }

    const automationData: CommentAutomation = {
      id: existingAutomation?.id || new Date().getTime().toString(),
      name: name.trim(),
      enabled: existingAutomation?.enabled ?? true,
      type: 'comment_automation',
      postId: selectedPostId,
      postThumbnailUrl: selectedPostThumbnail,
      postCaption: selectedPostCaption,
      triggerType: triggerType,
      keywords: triggerType === 'keyword_match' ? keywords.split(',').map(k => k.trim()).filter(Boolean) : [],
      reply: {
        text: replyMessage.trim(),
        ...(showLinkFields && linkUrl.trim() && linkTitle.trim() && {
          link: {
            url: linkUrl.trim(),
            title: linkTitle.trim(),
          }
        }),
      },
      commentReplyText: commentReplyText.trim(),
    };

    try {
      await onSave(automationData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setSaveError('Failed to save automation.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddKeywordFromSuggestion = (suggestion: string) => {
    const currentKeywords = keywords.split(',').map(k => k.trim()).filter(Boolean);
    if (!currentKeywords.some(k => k.toLowerCase() === suggestion.toLowerCase())) {
      setKeywords(currentKeywords.concat(suggestion).join(', '));
    }
  };

  const previewCommentText = triggerType === 'all_comments' ? 'Great post!' : keywords.split(',').filter(Boolean)[0] || 'Hello';
  const displayPostCaption = selectedPostCaption ? selectedPostCaption.substring(0, 50) + (selectedPostCaption.length > 50 ? '...' : '') : 'Selected post caption';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="mb-6">
          <label htmlFor="automationName" className="block text-xl font-semibold text-gray-800 mb-4">Automation Name</label>
          <input
            id="automationName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., 'Welcome Comment Reply'"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div className="mb-6">
          <label className="block text-xl font-semibold text-gray-800 mb-4">Choose a Post</label>
          <div className="bg-gray-50 p-5 rounded-lg shadow-inner-sm border border-gray-200 min-h-[150px] flex flex-col">
            {postsLoading ? (
              <div className="flex justify-center items-center h-full text-gray-500">Loading posts...</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-64 overflow-y-auto">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className={`cursor-pointer border-2 rounded-lg overflow-hidden ${selectedPostId === post.id ? 'border-blue-600' : 'border-gray-300'}`}
                    onClick={() => {
                      setSelectedPostId(post.id);
                      setSelectedPostThumbnail(post.thumbnail_url);
                      setSelectedPostCaption(post.caption);
                    }}
                  >
                    <img src={post.thumbnail_url} alt={post.caption || 'Post thumbnail'} className="w-full h-24 object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-xl font-semibold text-gray-800 mb-4">When someone comments on this post</label>
          <div className="bg-gray-50 p-5 rounded-lg">
            <div className="mb-4">
              <label className="inline-flex items-center">
                <input type="radio" className="form-radio" name="commentTrigger" value="all_comments" checked={triggerType === 'all_comments'} onChange={() => setTriggerType('all_comments')} />
                <span className="ml-2">Send DM to all comments</span>
              </label>
            </div>
            <div>
              <label className="inline-flex items-center">
                <input type="radio" className="form-radio" name="commentTrigger" value="keyword_match" checked={triggerType === 'keyword_match'} onChange={() => setTriggerType('keyword_match')} />
                <span className="ml-2">Send DM only for comments with specific keyword(s)</span>
              </label>
            </div>
            {triggerType === 'keyword_match' && (
              <div className="mt-4">
                <label htmlFor="keywords" className="block text-sm font-medium text-gray-700">Keyword(s)</label>
                <input id="keywords" type="text" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="Price, Link, Shop" className="w-full mt-1 p-2 border rounded-md" />
                <div className="flex items-center flex-wrap gap-2 text-sm mt-2">
                  <span>Suggestions:</span>
                  {keywordSuggestions.map((suggestion) => (
                    <button key={suggestion} type="button" onClick={() => handleAddKeywordFromSuggestion(suggestion)} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full">{suggestion}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-xl font-semibold text-gray-800 mb-4">They'll get a response from you</label>
          <div className="bg-gray-50 p-5 rounded-lg">
            <label htmlFor="replyMessage" className="block text-sm font-medium text-gray-700 mb-2">A DM with this message:</label>
            <textarea id="replyMessage" value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)} placeholder="Write a message to send via DM..." rows={4} className="w-full p-2 border rounded-md mb-3" />
            
            {showLinkFields ? (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">and an attached link:</p>
                <div>
                  <input type="text" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="Link Title (e.g., Shop Now)" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com/your-link" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <button onClick={() => setShowLinkFields(false)} className="text-xs text-red-500 hover:underline">Remove Link</button>
              </div>
            ) : (
              <button onClick={() => setShowLinkFields(true)} className="w-full flex items-center justify-center px-6 py-2 border border-dashed border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100">
                + Add A Link
              </button>
            )}

            <label htmlFor="commentReplyText" className="block text-sm font-medium text-gray-700 mb-2 mt-4">And a public reply on their comment (optional):</label>
            <input id="commentReplyText" type="text" value={commentReplyText} onChange={(e) => setCommentReplyText(e.target.value)} placeholder="e.g., Sent you a DM!" className="w-full p-2 border rounded-md" />
          </div>
        </div>
        
        {saveError && <div className="text-red-500 p-3 bg-red-100 rounded-md">{saveError}</div>}
        {saveSuccess && <div className="text-green-500 p-3 bg-green-100 rounded-md">Automation saved successfully!</div>}
        
        <button onClick={handleSave} disabled={loading || postsLoading} className="w-full mt-6 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg">
          {loading ? 'Saving...' : 'Save Automation'}
        </button>
      </div>

      {/* Right side: The Phone Preview */}
      <div className="hidden md:flex items-center justify-center">
        <div className="relative w-full max-w-xs h-[600px] bg-black rounded-[3rem] shadow-2xl border-[10px] border-gray-900 overflow-hidden flex flex-col">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/5 h-6 bg-gray-900 rounded-b-xl z-10"></div>
          <div className="flex-grow w-full bg-white flex flex-col">
            <div className="flex items-center p-3 border-b border-gray-200">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3"><User className="w-5 h-5 text-gray-500" /></div>
              <span className="font-semibold text-sm">{account.clientName}</span>
            </div>
            {selectedPostThumbnail && (
              <div className="p-3">
                <div className="flex items-center"><img src={selectedPostThumbnail} alt="Post thumbnail" className="w-12 h-12 object-cover rounded-md mr-3" /><p className="text-xs text-gray-600 flex-1">{displayPostCaption}</p></div>
              </div>
            )}
            <div className="border-b border-gray-200"></div>
            <div className="flex-grow p-3 overflow-y-auto space-y-4">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 bg-gray-300 rounded-full flex items-center justify-center"><User className="w-4 h-4 text-gray-600" /></div>
                <div className="flex flex-col">
                  <div className="bg-gray-100 rounded-xl p-2.5"><p className="text-xs"><span className="font-semibold">random_user</span> {previewCommentText}</p></div>
                  {commentReplyText && (
                    <div className="flex items-start gap-2.5 mt-3">
                       <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center"><User className="w-4 h-4 text-gray-500" /></div>
                       <div className="flex flex-col"><div className="bg-gray-100 rounded-xl p-2"><p className="text-xs"><span className="font-semibold">{account.clientName}</span> {commentReplyText}</p></div></div>
                    </div>
                  )}
                </div>
              </div>
               <div className="text-center text-xs text-gray-400 py-2">-- Private Message --</div>
               <div className="flex items-end flex-col">
                    <div className="bg-blue-500 text-white rounded-2xl rounded-br-none p-2.5 max-w-[80%]">
                        <p className="text-sm">{replyMessage || "Your DM reply will appear here..."}</p>
                    </div>
                    {showLinkFields && linkUrl && linkTitle && (
                        <a href="#" className="mt-2 bg-gray-100 border border-gray-200 rounded-lg p-2.5 max-w-[80%] w-full block text-left">
                            <p className="font-semibold text-sm text-gray-800">{linkTitle}</p>
                            <p className="text-xs text-gray-500">example.com</p>
                        </a>
                    )}
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentAutomationEditor;
