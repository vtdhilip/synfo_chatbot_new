// src/components/InstaDMeditor.tsx

import React, { useState, useEffect } from 'react';
import { type Account, SimpleKeywordAutomation } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../context/AuthContext';
import { Save, X, AlertCircle, CheckCircle, Loader2, Link as LinkIcon, Video, SquarePlus, Camera, Mic, Image as ImageIcon, ArrowLeft, User, Lock } from 'lucide-react';

// Define the props interface for the component.
interface InstaDMeditorProps {
  account: Account;
  existingAutomation?: SimpleKeywordAutomation;
  onSave: (automationData: SimpleKeywordAutomation) => Promise<void>;
}

// ==============================================================================
// === Mobile Preview Component ===
// ==============================================================================
const MobilePreview: React.FC<{
  accountName: string;
  accountImageUrl?: string;
  triggerText: string;
  replyMessage: string;
  linkTitle?: string;
  linkUrl?: string;
}> = ({ accountName, accountImageUrl, triggerText, replyMessage, linkTitle, linkUrl }) => {
  const getHostname = (url: string) => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url; // Fallback for invalid URLs
    }
  };

  // This function now only serves the preview and doesn't affect the actual saved message.
  const renderPreviewMessage = (message: string) => {
    return message
      .replace(/{{user_name}}/g, 'John Doe')
      .replace(/{{user_first_name}}/g, 'John')
      .replace(/{{user_last_name}}/g, 'Doe');
  };

  return (
    <div className="sticky top-8">
      <div className="w-full max-w-sm mx-auto bg-black rounded-[40px] p-1 shadow-2xl border-4 border-zinc-700">
        <div className="bg-black rounded-[36px] h-[620px] overflow-hidden flex flex-col relative">
          
          <header className="flex items-center justify-between p-3 border-b border-zinc-800 flex-shrink-0 z-10">
            <div className="flex items-center min-w-0">
              <ArrowLeft className="w-6 h-6 text-white flex-shrink-0" />
              <div className="w-8 h-8 rounded-full ml-4 flex-shrink-0 bg-zinc-700">
                {accountImageUrl ? (
                    <img src={accountImageUrl} alt={accountName} className="w-full h-full rounded-full object-cover" />
                ) : (
                    <User className="w-5 h-5 text-zinc-400 m-auto" />
                )}
              </div>
              <p className="font-semibold text-base text-white ml-3 truncate">{accountName}</p>
            </div>
            <div className="flex items-center space-x-4 flex-shrink-0">
              <Video className="w-6 h-6 text-white" />
              <SquarePlus className="w-6 h-6 text-white" />
            </div>
          </header>
          <main className="flex-grow p-4 overflow-y-auto space-y-4 flex flex-col-reverse">
            <div className="space-y-4">
              <div className="flex justify-end">
                <div className="max-w-[85%] bg-zinc-800 text-white p-3 rounded-3xl rounded-br-lg">
                  <p className="text-base">{triggerText}</p>
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-blue-500 text-white rounded-3xl rounded-bl-lg max-w-[85%] flex flex-col self-start">
                  <p className="text-base py-2 px-3.5 whitespace-pre-wrap">{renderPreviewMessage(replyMessage) || "Your reply..."}</p>
                  {linkUrl && linkTitle && (
                    <div className="border-t border-white/20 p-2.5">
                      <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-md p-2.5 rounded-xl block">
                        <p className="font-bold text-sm text-white">{linkTitle}</p>
                        <p className="text-xs text-white/70">{getHostname(linkUrl)}</p>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
          <footer className="flex items-center p-3 gap-3 flex-shrink-0 z-10">
            <div className="p-2 bg-blue-500 rounded-full">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <div className="flex-grow flex items-center bg-zinc-800 rounded-full px-4 py-2">
              <input type="text" placeholder="Message..." className="bg-transparent flex-grow text-base focus:outline-none text-white placeholder-zinc-500" disabled />
              <div className="flex items-center space-x-3">
                <Mic className="w-6 h-6 text-zinc-400" />
                <ImageIcon className="w-6 h-6 text-zinc-400" />
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

// ==============================================================================
// === Main Editor Component ===
// ==============================================================================
const InstaDMeditor: React.FC<InstaDMeditorProps> = ({ account, existingAutomation, onSave }) => {
  const { permissions } = useAuth();

  const [name, setName] = useState('');
  const [keywords, setKeywords] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [showLinkFields, setShowLinkFields] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const accountWithProfilePic = account as Account & { profilePictureUrl?: string };
  const keywordSuggestions = ['Price', 'Link', 'Shop', 'Hello', 'Help'];

  const isLinkEmbedLocked = !permissions?.hasLinkEmbed;

  useEffect(() => {
    if (existingAutomation) {
      setName(existingAutomation.name);
      setKeywords(existingAutomation.keywords.join(', '));
      setReplyMessage(existingAutomation.reply.text);
      if (existingAutomation.reply.link) {
        setLinkUrl(existingAutomation.reply.link.url);
        setLinkTitle(existingAutomation.reply.link.title);
        setShowLinkFields(!isLinkEmbedLocked);
      }
    }
  }, [existingAutomation, isLinkEmbedLocked]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaveSuccess(false);
    setSaveError(null);

    if (!name.trim() || !keywords.trim() || !replyMessage.trim()) {
      setSaveError('Name, keywords, and a reply message are all required.');
      setLoading(false);
      return;
    }
    if (showLinkFields && !isLinkEmbedLocked) {
      if (!linkUrl.trim() || !linkTitle.trim()) {
        setSaveError('Both Link URL and Title are required when adding a link.');
        setLoading(false);
        return;
      }
      try { new URL(linkUrl); } catch {
        setSaveError('Please enter a valid URL (e.g., https://example.com).');
        setLoading(false);
        return;
      }
    }

    const automationData: SimpleKeywordAutomation = {
      id: existingAutomation?.id || uuidv4(),
      name: name.trim(),
      enabled: existingAutomation?.enabled ?? true,
      type: 'simple_keyword',
      keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
      reply: {
        text: replyMessage.trim(),
        ...(showLinkFields && !isLinkEmbedLocked && linkUrl.trim() && linkTitle.trim() && {
          link: { url: linkUrl.trim(), title: linkTitle.trim() }
        }),
      }
    };

    try {
      await onSave(automationData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving automation:", error);
      setSaveError('Failed to save automation. Please try again.');
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

  const previewKeyword = keywords.split(',').map(k => k.trim()).filter(Boolean)[0] || 'hello';
  const inputStyles = "w-full p-3 bg-slate-100 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all";

  return (
    <form onSubmit={handleSave}>
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        {/* Left Side: Form */}
        <div className="flex flex-col p-4 sm:p-6 md:p-8 lg:overflow-y-auto">
          <div className="space-y-6 flex-grow">
            <div>
              <label htmlFor="automationName" className="block text-sm font-semibold text-slate-700 mb-1.5">1. Automation Name</label>
              <input id="automationName" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., 'Welcome DM for new followers'" className={inputStyles} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">2. Set the Trigger</label>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <label htmlFor="keywords" className="block text-xs font-medium text-slate-600 mb-1">Reply when a DM contains these keywords</label>
                <textarea id="keywords" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="e.g., Price, Link, Shop" rows={2} className={inputStyles} />
                <div className="flex items-center flex-wrap gap-2 text-xs mt-2">
                  <span className="text-slate-500">Suggestions:</span>
                  {keywordSuggestions.map(s => (
                    <button key={s} type="button" onClick={() => handleAddKeyword(s)} className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-full font-medium hover:bg-slate-300">{s}</button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">3. Configure the Reply</label>
              <div className="space-y-4 p-4 border border-slate-200 rounded-lg bg-slate-50">
                <div>
                  <label htmlFor="replyMessage" className="block text-xs font-medium text-slate-600 mb-1.5">Message</label>
                  <textarea id="replyMessage" value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)} placeholder="Write your automated reply here..." rows={4} className={inputStyles} />
                </div>
                <div className={`p-2 rounded-lg ${isLinkEmbedLocked ? 'bg-slate-100' : ''}`}>
                  <label className={`block text-xs font-medium mb-1.5 ${isLinkEmbedLocked ? 'text-slate-400' : 'text-slate-600'}`}>Link Button (Optional)</label>
                  {showLinkFields && !isLinkEmbedLocked ? (
                    <div className="space-y-4 p-4 border border-slate-200 rounded-lg bg-white">
                      <div>
                        <label htmlFor='linkTitle' className='text-xs font-medium text-slate-600 mb-1 block'>Button Title</label>
                        <input id='linkTitle' type="text" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="e.g., Shop Now" className={inputStyles} />
                      </div>
                      <div>
                        <label htmlFor='linkUrl' className='text-xs font-medium text-slate-600 mb-1 block'>Button URL</label>
                        <input id='linkUrl' type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com" className={inputStyles} />
                      </div>
                      <button type="button" onClick={() => setShowLinkFields(false)} className="text-xs text-red-600 hover:underline font-semibold">Remove Link</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setShowLinkFields(true)} disabled={isLinkEmbedLocked} className="w-full flex items-center justify-center p-3 border-2 border-dashed border-slate-300 text-slate-600 font-semibold rounded-lg hover:bg-slate-100 hover:border-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      {isLinkEmbedLocked ? <Lock className="w-4 h-4 mr-2" /> : <LinkIcon className="w-4 h-4 mr-2" />}
                      {isLinkEmbedLocked ? 'Available on PRO plan' : 'Add a Link Button'}
                    </button>
                  )}
                   {isLinkEmbedLocked && (
                    <p className="text-xs text-brand mt-2">To add links, <a href="/subscription" className="font-semibold underline">upgrade your plan</a>.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Sticky Save Bar */}
          <div className="flex flex-col sm:flex-row-reverse items-center gap-3 p-4 border-t border-slate-200 bg-white/80 backdrop-blur-sm sticky bottom-0 lg:static">
            <button type="submit" disabled={loading} className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50">
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
        </div>
        {/* Right Side: Preview */}
        <div className="hidden lg:flex items-center justify-center p-8 bg-slate-50 border-l border-slate-200 sticky top-0 h-screen">
          <MobilePreview
            accountName={accountWithProfilePic.clientName}
            accountImageUrl={accountWithProfilePic.profilePictureUrl}
            triggerText={previewKeyword}
            replyMessage={replyMessage}
            linkTitle={linkTitle}
            linkUrl={linkUrl}
          />
        </div>
      </div>
    </form>
  );
};

export default InstaDMeditor;