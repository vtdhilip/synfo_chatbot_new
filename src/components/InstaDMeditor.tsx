// src/components/InstaDMeditor.tsx

import React, { useState, useEffect } from 'react';
import { type Account, SimpleKeywordAutomation } from '../types';
import { User, Link as LinkIcon } from 'lucide-react'; // Import LinkIcon

interface SimpleDmEditorProps {
  account: Account;
  existingAutomation?: SimpleKeywordAutomation;
  onSave: (automationData: SimpleKeywordAutomation) => Promise<void>;
}

const SimpleDmEditor: React.FC<SimpleDmEditorProps> = ({ account, existingAutomation, onSave }) => {
  const [name, setName] = useState('');
  const [keywords, setKeywords] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [showLinkFields, setShowLinkFields] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const keywordSuggestions = ['Price', 'Link', 'Shop', 'Hello', 'Help'];
  
  // const getHostname = (url: string) => {
  //   try {
  //     const parsedUrl = new URL(url);
  //     return parsedUrl.hostname.replace(/^www\./, ''); // Clean www.
  //   } catch {
  //     return ''; // Return empty string for invalid URLs
  //   }
  // };

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
        setLinkUrl('');
        setLinkTitle('');
        setShowLinkFields(false);
      }
    } else {
      // Reset fields for a new automation
      setName('');
      setKeywords('');
      setReplyMessage('');
      setLinkUrl('');
      setLinkTitle('');
      setShowLinkFields(false);
    }
  }, [existingAutomation]);

  const handleSave = async () => {
    setLoading(true);
    setSaveSuccess(false);
    setSaveError(null);

    if (!name.trim()) {
      setSaveError('Automation name cannot be empty.');
      setLoading(false);
      return;
    }
    if (!keywords.trim() || !replyMessage.trim()) {
      setSaveError('Keywords and reply message cannot be empty.');
      setLoading(false);
      return;
    }
    if (showLinkFields) {
        if (!linkUrl.trim() || !linkTitle.trim()) {
            setSaveError('Link URL and Title are required when adding a link.');
            setLoading(false);
            return;
        }
        try {
            new URL(linkUrl); // Validate URL format
        } catch {
            setSaveError('Please enter a valid URL (e.g., https://example.com).');
            setLoading(false);
            return;
        }
    }

    const automationData: SimpleKeywordAutomation = {
      id: existingAutomation?.id || new Date().getTime().toString(),
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

  const handleAddKeywordFromSuggestion = (suggestion: string) => {
    const currentKeywords = keywords.split(',').map(k => k.trim()).filter(Boolean);
    if (!currentKeywords.some(k => k.toLowerCase() === suggestion.toLowerCase())) {
      setKeywords(currentKeywords.concat(suggestion).join(', '));
    }
  };

  const previewKeyword = keywords.split(',').map(k => k.trim()).filter(Boolean)[0] || 'hello';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6">
      {/* Left Column: Editor Form */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        {/* ... form fields remain the same ... */}
        <div className="mb-6">
              <label htmlFor="automationName" className="block text-xl font-semibold text-gray-800 mb-4">Automation Name</label>
              <input
                id="automationName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., 'Welcome DM'"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
          </div>

          <div className="mb-6">
            <label className="block text-xl font-semibold text-gray-800 mb-4">When a user sends a DM containing</label>
            <div className="bg-gray-50 p-5 rounded-lg">
              <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 mb-2">Any of these keywords</label>
              <input id="keywords" type="text" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="e.g., Price, Link, Shop" className="w-full p-2 border rounded-md" />
              <div className="flex items-center flex-wrap gap-2 text-sm mt-2">
                <span>Suggestions:</span>
                {keywordSuggestions.map((suggestion) => (
                  <button key={suggestion} type="button" onClick={() => handleAddKeywordFromSuggestion(suggestion)} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium hover:bg-blue-200">{suggestion}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-xl font-semibold text-gray-800 mb-4">Automatically reply with this message</label>
            <div className="bg-gray-50 p-5 rounded-lg">
               <label htmlFor="replyMessage" className="block text-sm font-medium text-gray-700 mb-2">Message text</label>
              <textarea id="replyMessage" value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)} placeholder="Write a message..." rows={4} className="w-full p-2 border rounded-md mb-3" />
              
              {showLinkFields ? (
                <div className="space-y-3 p-3 border border-gray-200 rounded-lg bg-white">
                  <p className="text-sm font-medium text-gray-600">Link Button</p>
                  <div>
                    <label htmlFor='linkTitle' className='text-xs text-gray-500 mb-1 block'>Button Title</label>
                    <input id='linkTitle' type="text" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="e.g., Shop Now" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"/>
                  </div>
                  <div>
                    <label htmlFor='linkUrl' className='text-xs text-gray-500 mb-1 block'>Button URL</label>
                    <input id='linkUrl' type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com/your-link" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"/>
                  </div>
                   <button onClick={() => setShowLinkFields(false)} className="text-xs text-red-500 hover:underline pt-1">Remove Link</button>
                </div>
              ) : (
                <button onClick={() => setShowLinkFields(true)} className="w-full flex items-center justify-center px-6 py-2 border-2 border-dashed border-gray-300 text-gray-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors">
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Add a Link Button
                </button>
              )}
            </div>
          </div>
          
          {saveError && <div className="text-red-600 p-3 bg-red-50 rounded-md my-4 text-sm font-medium">{saveError}</div>}
          {saveSuccess && <div className="text-green-600 p-3 bg-green-50 rounded-md my-4 text-sm font-medium">Automation saved successfully!</div>}
          
          <button onClick={handleSave} disabled={loading} className="w-full mt-4 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors">
            {loading ? 'Saving...' : 'Save Automation'}
          </button>
      </div>

      {/* Right Column: Mobile Preview with Improved Design */}
      <div className="hidden md:flex items-center justify-center p-4">
        <div className="relative w-full max-w-xs h-[600px] bg-black rounded-[2.5rem] shadow-2xl border-[10px] border-gray-800 overflow-hidden flex flex-col">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/5 h-5 bg-gray-800 rounded-b-xl z-10"></div>
            <div className="flex-grow w-full bg-white flex flex-col">
                <header className="flex items-center p-2.5 border-b border-gray-200 bg-gray-50/50">
                    <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center mr-3 flex-shrink-0"><User className="w-5 h-5 text-gray-500" /></div>
                    <span className="font-semibold text-sm truncate">{account.clientName}</span>
                </header>
                <main className="flex-grow p-4 overflow-y-auto space-y-4">
                    {/* User's Message */}
                    <div className="flex justify-end">
                        <div className="bg-gray-100 rounded-2xl rounded-br-none py-2 px-3.5 max-w-[85%]">
                            <p className="text-sm text-gray-800">{previewKeyword}</p>
                        </div>
                    </div>
                    {/* Bot's Reply */}
                    <div className="flex justify-start">
                         <div className="bg-blue-500 text-white rounded-2xl rounded-bl-none max-w-[85%] flex flex-col">
                            <p className="text-sm py-2 px-3.5">{replyMessage || "Your reply will appear here..."}</p>
                            {showLinkFields && linkUrl && linkTitle && (
                                <>
                                  <div className="border-t border-blue-400/50"></div>
                                  <a href="#" onClick={(e) => e.preventDefault()} className="py-2 px-3.5 text-center font-semibold text-sm hover:bg-blue-600 transition-colors rounded-b-2xl">
                                      {linkTitle || "Your Link"}
                                  </a>
                                </>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleDmEditor;