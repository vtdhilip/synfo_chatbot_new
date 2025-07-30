// src/components/InstaDMeditor.tsx

import React, { useState, useEffect, useRef } from 'react';
import { type Account, SimpleKeywordAutomation } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Save, X, AlertCircle, CheckCircle, Loader2, Link as LinkIcon, Video, SquarePlus, Camera, Mic, Image as ImageIcon, ArrowLeft, UserPlus } from 'lucide-react';

// Define the props interface for the component.
interface InstaDMeditorProps {
  account: Account;
  existingAutomation?: SimpleKeywordAutomation;
  onSave: (automationData: SimpleKeywordAutomation) => Promise<void>;
}

// A more realistic mobile preview component, now with link support
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
      return url; // Fallback to the full URL if invalid
    }
  };

  const renderPersonalizedMessage = (message: string) => {
    return message
      .replace(/{{user_name}}/g, 'John Doe')
      .replace(/{{user_first_name}}/g, 'John')
      .replace(/{{user_last_name}}/g, 'Doe');
  };

  return (
    <div className="sticky top-8">
      <div className="w-full max-w-sm mx-auto bg-black rounded-[40px] p-1 shadow-2xl border-4 border-zinc-700">
        <div className="bg-black rounded-[36px] h-[620px] overflow-hidden flex flex-col relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-b-xl z-20"></div>
          <header className="flex items-center justify-between p-3 border-b border-zinc-800 flex-shrink-0 z-10">
            <div className="flex items-center min-w-0">
              <ArrowLeft className="w-6 h-6 text-white flex-shrink-0" />
              <div className="w-8 h-8 rounded-full ml-4 flex-shrink-0">
                {accountImageUrl ? (
                    <img src={accountImageUrl} alt={accountName} className="w-full h-full rounded-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 rounded-full"></div>
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
                <div className="bg-gradient-to-tr from-purple-600 to-blue-500 text-white rounded-3xl rounded-bl-lg max-w-[85%] flex flex-col self-start">
                  <p className="text-base py-2 px-3.5 whitespace-pre-wrap">{renderPersonalizedMessage(replyMessage) || "Your reply..."}</p>
                  {linkUrl && linkTitle && (
                    <div className="border-t border-white/20 p-2.5">
                      <div className="bg-white/20 backdrop-blur-md p-2.5 rounded-xl">
                        <p className="font-bold text-sm text-white">{linkTitle}</p>
                        <p className="text-xs text-white/70">{getHostname(linkUrl)}</p>
                      </div>
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


const InstaDMeditor: React.FC<InstaDMeditorProps> = ({ account, existingAutomation, onSave }) => {
  const [name, setName] = useState('');
  const [keywords, setKeywords] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [showLinkFields, setShowLinkFields] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const [showVars, setShowVars] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const accountWithProfilePic = account as Account & { profilePictureUrl?: string };

  const keywordSuggestions = ['Price', 'Link', 'Shop', 'Hello', 'Help'];

  useEffect(() => {
    if (existingAutomation) {
      setName(existingAutomation.name);
      setKeywords(existingAutomation.keywords.join(', '));
      setReplyMessage(existingAutomation.reply.text);
      if (existingAutomation.reply.link) {
        setLinkUrl(existingAutomation.reply.link.url);
        setLinkTitle(existingAutomation.reply.link.title);
        setShowLinkFields(true);
      } else {
        setShowLinkFields(false);
        setLinkUrl('');
        setLinkTitle('');
      }
    } else {
      setName('');
      setKeywords('');
      setReplyMessage('');
      setLinkUrl('');
      setLinkTitle('');
      setShowLinkFields(false);
    }
  }, [existingAutomation]);

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
    if (showLinkFields) {
      if (!linkUrl.trim() || !linkTitle.trim()) {
        setSaveError('Both Link URL and Title are required when adding a link.');
        setLoading(false);
        return;
      }
      try {
        new URL(linkUrl);
      } catch {
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
        ...(showLinkFields && linkUrl.trim() && linkTitle.trim() && {
          link: {
            url: linkUrl.trim(),
            title: linkTitle.trim(),
          }
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
  
  const handleInsertVariable = (variable: string) => {
    if (!textareaRef.current) return;
    const { selectionStart, selectionEnd } = textareaRef.current;
    const text = replyMessage;
    const newMessage = text.substring(0, selectionStart) + variable + text.substring(selectionEnd);
    setReplyMessage(newMessage);
    textareaRef.current.focus();
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = selectionStart + variable.length;
      }
    }, 0);
    setShowVars(false);
  };

  const previewKeyword = keywords.split(',').map(k => k.trim()).filter(Boolean)[0] || 'hello';
  const inputStyles = "w-full p-3 bg-slate-100 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all";

  return (
    <form onSubmit={handleSave}>
      <div className="flex flex-col lg:flex-row">
        <div className="w-full lg:w-1/2 p-4 sm:p-6 md:p-8">
          <div className="space-y-6">
            <div>
              <label htmlFor="automationName" className="block text-sm font-semibold text-slate-700 mb-1.5">1. Automation Name</label>
              <input id="automationName" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., 'Welcome DM for new followers'" className={inputStyles} />
            </div>
            
            <div>
              <label htmlFor="keywords" className="block text-sm font-semibold text-slate-700 mb-1.5">2. Set the Trigger</label>
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
                  <div className="flex justify-between items-center mb-1.5">
                    <label htmlFor="replyMessage" className="block text-xs font-medium text-slate-600">Message</label>
                    <div className="relative">
                      <button type="button" onClick={() => setShowVars(!showVars)} onBlur={() => setTimeout(() => setShowVars(false), 100)} className="flex items-center text-xs font-semibold text-brand hover:underline">
                        <UserPlus className="w-3 h-3 mr-1" />
                        Personalize
                      </button>
                      {showVars && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-slate-200 py-1">
                          <a href="#" onClick={(e) => { e.preventDefault(); handleInsertVariable('{{user_name}}'); }} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Full Name</a>
                          <a href="#" onClick={(e) => { e.preventDefault(); handleInsertVariable('{{user_first_name}}'); }} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">First Name</a>
                          <a href="#" onClick={(e) => { e.preventDefault(); handleInsertVariable('{{user_last_name}}'); }} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Last Name</a>
                        </div>
                      )}
                    </div>
                  </div>
                  <textarea ref={textareaRef} id="replyMessage" value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)} placeholder="Write your automated reply here..." rows={4} className={inputStyles} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Link Button (Optional)</label>
                  {showLinkFields ? (
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
                    <button type="button" onClick={() => setShowLinkFields(true)} className="w-full flex items-center justify-center p-3 border-2 border-dashed border-slate-300 text-slate-600 font-semibold rounded-lg hover:bg-slate-100 hover:border-slate-400 transition-colors">
                      <LinkIcon className="w-4 h-4 mr-2" />
                      Add a Link Button
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-8 bg-slate-50 border-l border-slate-200">
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

      <div className="flex flex-col sm:flex-row-reverse items-center gap-3 p-4 md:p-6 border-t border-slate-200 bg-white/50 backdrop-blur-sm sticky bottom-0">
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
    </form>
  );
};

export default InstaDMeditor;
