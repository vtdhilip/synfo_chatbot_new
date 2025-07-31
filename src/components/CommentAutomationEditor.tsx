// src/components/CommentAutomationEditor.tsx

import React, { useState, useEffect } from 'react';
import {
  type Account,
  CommentAutomation,
  CommentTriggerType,
  InstagramPost
} from '../types';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../context/AuthContext';
import { Save, X, AlertCircle, CheckCircle, Loader2, User, MessageSquare, Heart, Send, Bookmark, MoreHorizontal, ArrowLeft, Video, SquarePlus, Lock, Camera, Mic, Image, Wifi, Battery } from 'lucide-react';

interface CommentAutomationEditorProps {
  account: Account;
  existingAutomation?: CommentAutomation;
  onSave: (automationData: CommentAutomation) => Promise<void>;
}

const Comment: React.FC<{
  avatar: string;
  username: string;
  text: string;
  time: string;
  isReply?: boolean;
}> = ({ avatar, username, text, time, isReply = false }) => (
    <div className={`flex items-start gap-2.5 ${isReply ? 'ml-9' : ''}`}>
        <div className="w-7 h-7 rounded-full flex-shrink-0 bg-zinc-800">
            <img src={avatar} className="w-full h-full rounded-full object-cover" alt="avatar" />
        </div>
        <div className="flex-grow">
            <p className="text-sm text-white leading-tight">
                <span className="font-semibold">{username}</span>{' '}
                <span className="font-normal">{text}</span>
            </p>
            <div className="flex items-center gap-4 mt-1.5">
                <span className="text-xs text-zinc-500 font-medium">{time}</span>
                <span className="text-xs text-zinc-500 font-semibold">Reply</span>
            </div>
        </div>
        {!isReply && <Heart className="w-4 h-4 text-zinc-400 mt-1 flex-shrink-0" />}
    </div>
);

const CommentPreview: React.FC<{
  account: Account;
  postThumbnailUrl?: string;
  postCaption?: string;
  userComment: string;
  botCommentReply?: string;
  botDmReply: string;
  linkTitle?: string;
  linkUrl?: string;
  previewMode: 'comments' | 'dm';
}> = ({ account, postThumbnailUrl, postCaption, userComment, botCommentReply, botDmReply, previewMode, linkTitle, linkUrl }) => {
  const accountWithProfilePic = account as Account & { profilePictureUrl?: string };
  return (
    <div className="w-full max-w-[320px] mx-auto bg-black rounded-[40px] p-1 shadow-2xl border-4 border-zinc-800">
     
      <div className="bg-white rounded-[36px] h-[640px] overflow-hidden flex flex-col relative">
        <div className="bg-black text-white h-full flex flex-col">
          <header className="flex items-center justify-between px-6 py-2.5 flex-shrink-0 z-10"><span className="text-sm font-bold">9:41</span><div className="flex items-center gap-1.5"><Wifi size={16} /><Battery size={16} /></div></header>
          {previewMode === 'comments' && (
            <><div className="flex items-center justify-between px-3 py-1 flex-shrink-0 z-10"><div className="flex items-center min-w-0"><div className="w-8 h-8 rounded-full flex-shrink-0 bg-zinc-800">{accountWithProfilePic.profilePictureUrl ? <img src={accountWithProfilePic.profilePictureUrl} className="w-full h-full rounded-full object-cover" alt={account.clientName} /> : <User className="w-5 h-5 text-slate-500 m-auto" />}</div><p className="font-semibold text-sm text-white ml-3 truncate">{account.clientName}</p></div><MoreHorizontal className="w-5 h-5 text-white" /></div><main className="flex-grow flex flex-col min-h-0 hide-scrollbar">{postThumbnailUrl ? (<><div className="aspect-square w-full bg-zinc-900 flex-shrink-0"><img src={postThumbnailUrl} alt="Post thumbnail" className="w-full h-full object-cover" /></div><div className="py-2 flex justify-between items-center px-4 flex-shrink-0"><div className="flex items-center gap-4"><Heart className="w-6 h-6 text-white" /><MessageSquare className="w-6 h-6 text-white -scale-x-100" /><Send className="w-6 h-6 text-white" /></div><Bookmark className="w-6 h-6 text-white" /></div><div className="px-4 pb-4 flex-grow overflow-y-auto hide-scrollbar space-y-2"><p className="text-sm font-medium">Liked by <span className="font-bold">craig_love</span> and <span className="font-bold">others</span></p><div className="text-sm text-white"><p><span className="font-semibold">{account.clientName}</span> <span className="font-normal text-zinc-400">{postCaption || "Your post's caption..."}</span></p></div><div className="pt-2"><p className="text-zinc-500 text-sm font-medium">View all comments</p></div><div className="py-2 space-y-4"><Comment avatar={`https://ui-avatars.com/api/?name=John+Doe&background=random`} username="john_doe" text={userComment} time="1m" />{botCommentReply && (<Comment avatar={accountWithProfilePic.profilePictureUrl || ''} username={account.clientName} text={botCommentReply} time="now" isReply />)}</div></div></>) : (<div className="p-4 flex flex-col h-full"><div className="aspect-square w-full bg-zinc-900/50 border-2 border-dashed border-zinc-700 rounded-md flex items-center justify-center text-center p-4"><p className="text-zinc-500">Pick a post to see the preview</p></div></div>)}</main></>
          )}
          {previewMode === 'dm' && (
            <><header className="flex items-center justify-between p-3 border-b border-zinc-800 flex-shrink-0 z-10"><div className="flex items-center min-w-0"><ArrowLeft className="w-6 h-6 text-white flex-shrink-0" /><div className="w-8 h-8 rounded-full ml-4 flex-shrink-0 bg-zinc-800">{accountWithProfilePic.profilePictureUrl ? <img src={accountWithProfilePic.profilePictureUrl} className="w-full h-full rounded-full object-cover" alt={`${account.clientName} profile picture`} /> : <User className="w-5 h-5 text-slate-500 m-auto" />}</div><p className="font-semibold text-base text-white ml-3 truncate">{account.clientName}</p></div><div className="flex items-center space-x-4 flex-shrink-0"><Video className="w-6 h-6 text-white" /><SquarePlus className="w-6 h-6 text-white" /></div></header><main className="flex-grow p-4 overflow-y-auto space-y-4 flex flex-col-reverse hide-scrollbar"><div className="space-y-2"><div className="flex justify-end"><div className="bg-blue-500 text-white rounded-2xl rounded-br-lg max-w-[85%] flex flex-col self-end"><p className="text-base py-2 px-3.5 whitespace-pre-wrap">{botDmReply || "Your DM reply..."}</p></div></div>{linkUrl && (<div className="flex justify-end"><div className="border border-zinc-700 bg-zinc-800 rounded-xl max-w-[85%] w-full flex flex-col self-end p-3"><p className="text-sm text-center text-white font-medium">{linkTitle || "Learn More"}</p></div></div>)}<div className="flex justify-start"><div className="max-w-[85%] bg-zinc-800 text-white p-3 rounded-2xl rounded-bl-lg"><p className="text-base">{userComment}</p></div></div></div></main><footer className="px-4 py-2"><div className="bg-zinc-800 rounded-full flex items-center p-2 gap-3"><div className="bg-blue-500 rounded-full p-1.5"><Camera className="text-white" size={20} /></div><p className="text-zinc-500 flex-grow">Message...</p><Mic size={24} className="text-zinc-400" /><Image size={24} className="text-zinc-400" /></div></footer></>
          )}
          <div className="w-32 h-1 bg-white rounded-full mx-auto mt-auto mb-2 flex-shrink-0"></div>
        </div>
      </div>
    </div>
  );
};

const CommentAutomationEditor: React.FC<CommentAutomationEditorProps> = ({ account, existingAutomation, onSave }) => {
  const { permissions } = useAuth();

  const [name, setName] = useState('');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedPostThumbnail, setSelectedPostThumbnail] = useState<string | undefined>(undefined);
  const [selectedPostCaption, setSelectedPostCaption] = useState<string | undefined>(undefined);
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [triggerType, setTriggerType] = useState<CommentTriggerType>('all_comments');
  const [keywords, setKeywords] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [commentReplyText, setCommentReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [postsLoading, setPostsLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [previewMode, setPreviewMode] = useState<'comments' | 'dm'>('comments');
  const [followerOnly, setFollowerOnly] = useState(false);
  const [delayInMinutes, setDelayInMinutes] = useState(0);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');

  const isFollowerCheckLocked = !permissions?.hasFollowerCheck;
  const isDelayLocked = !permissions?.hasDelayedReplies;
  const isLinkEmbedLocked = !permissions?.hasLinkEmbed;

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
      setFollowerOnly(existingAutomation.followerOnly || false);
      setDelayInMinutes(existingAutomation.delayInMinutes || 0);
      setLinkUrl(existingAutomation.reply.link?.url || '');
      setLinkTitle(existingAutomation.reply.link?.title || '');
    }
  }, [existingAutomation]);

  useEffect(() => {
    const fetchPosts = async () => {
      if (!account.id) return;
      setPostsLoading(true);
      try {
        const functions = getFunctions();
        const getInstagramPosts = httpsCallable(functions, 'getInstagramPosts');
        const result = await getInstagramPosts({ clientId: account.id });
        const fetchedPosts = (result.data as { posts: InstagramPost[] }).posts;
        setPosts(fetchedPosts);
      } catch (error) {
        console.error("Failed to fetch posts:", error);
        setSaveError("Failed to load your Instagram posts. Please try again.");
      } finally {
        setPostsLoading(false);
      }
    };
    fetchPosts();
  }, [account.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaveError(null);
    setSaveSuccess(false);

    if (!name.trim() || !selectedPostId || !replyMessage.trim()) {
      setSaveError('Name, a selected post, and a DM reply are required.');
      setLoading(false);
      return;
    }
    if (triggerType === 'keyword_match' && !keywords.trim()) {
      setSaveError('Keywords are required for this trigger type.');
      setLoading(false);
      return;
    }

    const automationData: CommentAutomation = {
      id: existingAutomation?.id || uuidv4(),
      name: name.trim(),
      enabled: existingAutomation?.enabled ?? true,
      type: 'comment_automation',
      postId: selectedPostId,
      postThumbnailUrl: selectedPostThumbnail ?? '',
      postCaption: selectedPostCaption ?? '',
      triggerType: triggerType,
      keywords: triggerType === 'keyword_match' ? keywords.split(',').map(k => k.trim()).filter(Boolean) : [],
      followerOnly: isFollowerCheckLocked ? false : followerOnly,
      delayInMinutes: isDelayLocked ? 0 : Number(delayInMinutes),
      reply: {
        text: replyMessage.trim(),
        link: !isLinkEmbedLocked && linkUrl.trim() ? {
          url: linkUrl.trim(),
          title: linkTitle.trim() || 'Learn More'
        } : undefined
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

  const handleAddKeyword = (suggestion: string) => {
    const current = keywords.split(',').map(k => k.trim()).filter(Boolean);
    if (!current.some(k => k.toLowerCase() === suggestion.toLowerCase())) {
      setKeywords([...current, suggestion].join(', '));
    }
  };

  const previewCommentText = triggerType === 'all_comments' ? 'Great post!' : keywords.split(',').filter(Boolean)[0] || 'Hello';
  const inputStyles = "w-full p-3 bg-slate-100 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all";

  return (
    <form onSubmit={handleSave}>
      <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
      <div className="flex flex-col lg:flex-row">
        <div className="w-full lg:w-1/2 p-4 sm:p-6 md:p-8">
          <div className="space-y-6">
            <div>
              <label htmlFor="automationName" className="block text-sm font-semibold text-slate-700 mb-1.5">Automation Name</label>
              <input id="automationName" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., 'Post Engagement DM'" className={inputStyles} />
            </div>

            <div onClick={() => setPreviewMode('comments')} className="cursor-pointer">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">1. Choose a Post to Automate</label>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 min-h-[150px]">
                {postsLoading ? (
                  <div className="flex justify-center items-center h-full text-slate-500"><Loader2 className="w-6 h-6 animate-spin mr-2" />Loading posts...</div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-52 overflow-y-auto hide-scrollbar">
                    {posts.map((post) => (
                      <button type="button" key={post.id} onClick={() => { setSelectedPostId(post.id); setSelectedPostThumbnail(post.thumbnail_url); setSelectedPostCaption(post.caption); }}
                        className={`relative aspect-square rounded-lg overflow-hidden focus:outline-none ring-offset-2 ring-brand ${selectedPostId === post.id ? 'ring-2' : 'ring-0'}`}>
                        <img src={post.thumbnail_url} alt={post.caption || 'Post thumbnail'} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity"></div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div onClick={() => setPreviewMode('comments')} className="cursor-pointer">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">2. Set the Trigger</label>
              <div className="space-y-3">
                <label className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${triggerType === 'all_comments' ? 'bg-brand-50 border-brand' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="triggerType" value="all_comments" checked={triggerType === 'all_comments'} onChange={() => setTriggerType('all_comments')} className="mt-1 text-brand focus:ring-brand" />
                  <span className="ml-3 text-sm"><span className="font-semibold text-slate-800">All Comments</span><br />Send a DM to every person who comments.</span>
                </label>
                <label className={`flex flex-col p-4 border rounded-lg cursor-pointer transition-colors ${triggerType === 'keyword_match' ? 'bg-brand-50 border-brand' : 'border-slate-200 hover:border-slate-300'}`}>
                  <div className="flex items-start">
                    <input type="radio" name="triggerType" value="keyword_match" checked={triggerType === 'keyword_match'} onChange={() => setTriggerType('keyword_match')} className="mt-1 text-brand focus:ring-brand" />
                    <span className="ml-3 text-sm"><span className="font-semibold text-slate-800">Keyword Match</span><br />Only send a DM if the comment includes specific words.</span>
                  </div>
                  {triggerType === 'keyword_match' && (
                    <div className="mt-4 pl-7 w-full">
                      <textarea value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="e.g., price, link, info" rows={2} className={`${inputStyles} text-sm`} />
                      <div className="flex items-baseline flex-wrap gap-2 text-xs mt-2">
                        <span className="text-slate-500">Suggestions:</span>
                        {keywordSuggestions.map(s => (<button key={s} type="button" onClick={() => handleAddKeyword(s)} className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-full font-medium hover:bg-slate-300">{s}</button>))}
                      </div>
                    </div>
                  )}
                </label>
              </div>

              <div className={`mt-4 pl-1 p-3 rounded-lg ${isFollowerCheckLocked ? 'bg-slate-100' : ''}`}>
                <label className={`flex items-center space-x-3 ${isFollowerCheckLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={followerOnly}
                    onChange={(e) => setFollowerOnly(e.target.checked)}
                    disabled={isFollowerCheckLocked}
                    className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className={`text-sm font-medium ${isFollowerCheckLocked ? 'text-slate-400' : 'text-slate-600'}`}>Only trigger for followers</span>
                  {isFollowerCheckLocked && <Lock className="w-4 h-4 ml-2 text-slate-500" />}
                </label>
                {isFollowerCheckLocked && (
                  <p className="text-xs text-brand mt-2 pl-7">Available on the PRO plan. <a href="/subscription" className="font-semibold underline">Upgrade</a></p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">3. Configure the Reply</label>
              <div className="space-y-4 p-4 border border-slate-200 rounded-lg bg-slate-50">
                <div onClick={() => setPreviewMode('comments')} className="cursor-pointer p-2 rounded-md hover:bg-slate-200/50">
                  <label htmlFor="commentReplyText" className="block text-xs font-medium text-slate-600 mb-1">Public Comment Reply (Optional)</label>
                  <input id="commentReplyText" type="text" value={commentReplyText} onChange={(e) => setCommentReplyText(e.target.value)} placeholder="e.g., Sent you a DM!" className={inputStyles} />
                </div>
                <div onClick={() => setPreviewMode('dm')} className="cursor-pointer p-2 rounded-md hover:bg-slate-200/50">
                  <label htmlFor="replyMessage" className="block text-xs font-medium text-slate-600 mb-1">Private DM Reply</label>
                  <textarea id="replyMessage" value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)} placeholder="This message will be sent via DM..." rows={4} className={inputStyles} />
                </div>
                <div className={`p-2 rounded-md ${isLinkEmbedLocked ? 'bg-slate-200/50' : ''}`} onClick={() => !isLinkEmbedLocked && setPreviewMode('dm')}>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Embed a Link (Optional)</label>
                  <div className="space-y-2">
                    <input type="text" placeholder="Button Title (e.g., Shop Now)" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} className={`${inputStyles} disabled:cursor-not-allowed disabled:bg-slate-200`} disabled={isLinkEmbedLocked} />
                    <input type="url" placeholder="https://your-link.com" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className={`${inputStyles} disabled:cursor-not-allowed disabled:bg-slate-200`} disabled={isLinkEmbedLocked} />
                  </div>
                  {isLinkEmbedLocked && (
                    <p className="text-xs text-brand mt-2 flex items-center">
                      <Lock className="w-3 h-3 mr-1.5" />Available on the PRO plan. <a href="/subscription" className="font-semibold underline ml-1">Upgrade</a>
                    </p>
                  )}
                </div>
                <div className={`p-2 rounded-md ${isDelayLocked ? 'bg-slate-200/50' : ''}`}>
                  <label htmlFor="delay" className="block text-xs font-medium text-slate-600 mb-1">Delay DM Reply (Optional)</label>
                  <div className="flex items-center">
                    <input id="delay" type="number" value={delayInMinutes} onChange={(e) => setDelayInMinutes(Number(e.target.value))} className={`${inputStyles} w-28 disabled:cursor-not-allowed disabled:bg-slate-200`} min="0" disabled={isDelayLocked} />
                    <span className="ml-3 text-slate-500 text-sm">minutes</span>
                    {isDelayLocked && <Lock className="w-4 h-4 ml-3 text-slate-500" />}
                  </div>
                  {isDelayLocked && (<p className="text-xs text-brand mt-2">Available on the PRO plan. <a href="/subscription" className="font-semibold underline">Upgrade</a></p>)}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-8 bg-slate-50 border-l border-slate-200 sticky top-0 h-screen">
          <CommentPreview account={account} postThumbnailUrl={selectedPostThumbnail} postCaption={selectedPostCaption} userComment={previewCommentText} botCommentReply={commentReplyText} botDmReply={replyMessage} linkTitle={linkTitle} linkUrl={linkUrl} previewMode={previewMode} />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row-reverse items-center gap-3 p-4 md:p-6 border-t border-slate-200 bg-white/50 backdrop-blur-sm sticky bottom-0">
        <button type="submit" disabled={loading || postsLoading} className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {loading ? 'Saving...' : 'Save Automation'}
        </button>
        <button type="button" onClick={() => window.history.back()} className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">
          <X className="w-4 h-4 mr-2" />
          Cancel
        </button>
        <div className="flex-grow">
          {saveError && <div className="flex items-center text-red-600 text-sm font-medium"><AlertCircle className="w-4 h-4 mr-2" />{saveError}</div>}
          {saveSuccess && <div className="flex items-center text-green-600 text-sm font-medium"><CheckCircle className="w-4 h-4 mr-2" />Automation saved!</div>}
        </div>
      </div>
    </form>
  );
};

export default CommentAutomationEditor;