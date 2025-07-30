// src/components/StoryAutomationEditor.tsx

import React, { useState, useEffect } from 'react';
// --- CORRECTED: Import InstagramStory and remove the unused InstagramPost ---
import { type Account, type StoryAutomation, type StoryTriggerType, type InstagramStory } from '../types'; 
import { getFunctions, httpsCallable } from 'firebase/functions';
import { User, Link as LinkIcon, Image as ImageIcon, Save } from 'lucide-react';


const StoryAutomationEditor: React.FC<{
  account: Account;
  existingAutomation?: StoryAutomation;
  onSave: (automationData: StoryAutomation) => Promise<void>;
}> = ({ account, existingAutomation, onSave }) => {
  // ... (state variables) ...
  const [name, setName] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [triggerType, setTriggerType] = useState<StoryTriggerType>('all_replies');
  const [keywords, setKeywords] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [showLinkFields, setShowLinkFields] = useState(false);

  // --- CORRECTED: This now uses the correct InstagramStory type ---
  const [stories, setStories] = useState<InstagramStory[]>([]); 
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [selectedStoryThumbnail, setSelectedStoryThumbnail] = useState<string | undefined>(undefined);
  
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const keywordSuggestions = ['price', 'link', 'info', 'shop', 'hello', 'help'];

  useEffect(() => {
    const fetchStories = async () => {
      if (!account.id) return;
      setStoriesLoading(true);
      try {
        const functions = getFunctions();
        const getInstagramStories = httpsCallable(functions, 'getInstagramStories');
        const result = await getInstagramStories({ clientId: account.id });
        const fetchedStories = (result.data as { stories: InstagramStory[] }).stories;
        setStories(fetchedStories);
      } catch (error) {
        console.error("Failed to fetch stories:", error);
      } finally {
        setStoriesLoading(false);
      }
    };
    fetchStories();
  }, [account.id]);

  // (The rest of your component code remains the same)
  // ... useEffect for populating the form ...
  // ... handleSave function ...
  // ... return (...) JSX for the component ...

  useEffect(() => {
    if (existingAutomation) {
      setName(existingAutomation.name);
      setReplyMessage(existingAutomation.reply.text);
      setTriggerType(existingAutomation.triggerType);
      setKeywords(existingAutomation.keywords.join(', '));
      setSelectedStoryId(existingAutomation.storyId);
      setSelectedStoryThumbnail(existingAutomation.storyThumbnailUrl);

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
      setReplyMessage('');
      setLinkUrl('');
      setLinkTitle('');
      setShowLinkFields(false);
      setTriggerType('all_replies');
      setKeywords('');
      setSelectedStoryId(null);
      setSelectedStoryThumbnail(undefined);
    }
  }, [existingAutomation]);
  
  const handleSave = async () => {
    setLoading(true);
    setSaveError(null);
    setSaveSuccess(false);

    if (!name.trim() || !replyMessage.trim()) {
      setSaveError('Automation name and reply message are required.');
      setLoading(false);
      return;
    }
    if (triggerType === 'keyword_match' && !keywords.trim()) {
      setSaveError('Keywords are required for keyword match trigger.');
      setLoading(false);
      return;
    }

    const automationData: StoryAutomation = {
      id: existingAutomation?.id || new Date().getTime().toString(),
      name: name.trim(),
      enabled: existingAutomation?.enabled ?? true,
      type: 'story_automation',
      storyId: selectedStoryId,
      storyThumbnailUrl: selectedStoryThumbnail,
      triggerType: triggerType,
      keywords: triggerType === 'keyword_match' ? keywords.split(',').map(k => k.trim()).filter(Boolean) : [],
      reply: {
        text: replyMessage.trim(),
        ...(showLinkFields && linkUrl.trim() && linkTitle.trim() && {
          link: { url: linkUrl.trim(), title: linkTitle.trim() }
        }),
      },
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="mb-6"><label htmlFor="automationName" className="block text-xl font-semibold text-gray-800 mb-4">Automation Name</label><input id="automationName" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., 'Discount Code Story Reply'" className="w-full px-4 py-2 border rounded-lg"/></div>
        
        <div className="mb-6">
          <label className="block text-xl font-semibold text-gray-800 mb-4">For which story?</label>
          <div className="bg-gray-50 p-5 rounded-lg border flex items-center gap-4 overflow-x-auto">
              <div onClick={() => { setSelectedStoryId(null); setSelectedStoryThumbnail(undefined); }} className={`flex-shrink-0 cursor-pointer border-2 rounded-lg p-2 flex flex-col items-center justify-center h-24 w-24 ${selectedStoryId === null ? 'border-blue-600' : 'border-gray-300'}`}><ImageIcon className="w-8 h-8 text-gray-500 mb-1"/><span className="text-xs text-center font-semibold">All Stories</span></div>
              {storiesLoading ? <p className="text-sm text-gray-500">Loading stories...</p> : stories.map((story) => (
                <div key={story.id} className={`flex-shrink-0 cursor-pointer border-2 rounded-lg overflow-hidden h-24 w-24 ${selectedStoryId === story.id ? 'border-blue-600' : 'border-gray-300'}`} onClick={() => { setSelectedStoryId(story.id); setSelectedStoryThumbnail(story.thumbnail_url); }}>
                  <img src={story.thumbnail_url} alt="Story thumbnail" className="w-full h-full object-cover" />
                </div>
              ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-xl font-semibold text-gray-800 mb-4">Trigger when a user's reply...</label>
          <div className="bg-gray-50 p-5 rounded-lg">
            <div className="mb-4"><label className="inline-flex items-center"><input type="radio" className="form-radio" name="triggerType" value="all_replies" checked={triggerType === 'all_replies'} onChange={() => setTriggerType('all_replies')} /><span className="ml-2">Is any reply</span></label></div>
            <div><label className="inline-flex items-center"><input type="radio" className="form-radio" name="triggerType" value="keyword_match" checked={triggerType === 'keyword_match'} onChange={() => setTriggerType('keyword_match')} /><span className="ml-2">Contains specific keywords</span></label></div>
            {triggerType === 'keyword_match' && (
              <div className="mt-4">
                <label htmlFor="keywords" className="block text-sm font-medium text-gray-700">Keywords (comma separated)</label>
                <input id="keywords" type="text" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="Price, Link, Shop" className="w-full mt-1 p-2 border rounded-md" />
                <div className="flex items-center flex-wrap gap-2 text-sm mt-2"><span>Suggestions:</span>{keywordSuggestions.map((s) => (<button key={s} type="button" onClick={() => handleAddKeywordFromSuggestion(s)} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full">{s}</button>))}</div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
            <label className="block text-xl font-semibold text-gray-800 mb-4">Automatically send this reply</label>
            <div className="bg-gray-50 p-5 rounded-lg">
              <label htmlFor="replyMessage" className="block text-sm font-medium text-gray-700 mb-2">Message text</label>
              <textarea id="replyMessage" value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)} placeholder="Write a message..." rows={4} className="w-full p-2 border rounded-md mb-3"/>
              {showLinkFields ? (<div className="space-y-3 p-3 border rounded-lg bg-white"><p className="text-sm font-medium text-gray-600">Link Button</p><div><label htmlFor='linkTitle' className='text-xs text-gray-500 mb-1 block'>Button Title</label><input id='linkTitle' type="text" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="e.g., Learn More" className="w-full px-3 py-2 border rounded-lg text-sm"/></div><div><label htmlFor='linkUrl' className='text-xs text-gray-500 mb-1 block'>Button URL</label><input id='linkUrl' type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com" className="w-full px-3 py-2 border rounded-lg text-sm"/></div><button onClick={() => setShowLinkFields(false)} className="text-xs text-red-500 hover:underline pt-1">Remove Link</button></div>) : (<button onClick={() => setShowLinkFields(true)} className="w-full flex items-center justify-center px-6 py-2 border-2 border-dashed text-gray-600 font-semibold rounded-lg hover:bg-gray-100"><LinkIcon className="w-4 h-4 mr-2" />Add a Link Button</button>)}
            </div>
        </div>

        {saveError && <div className="text-red-600 p-3 bg-red-50 rounded-md my-4">{saveError}</div>}
        {saveSuccess && <div className="text-green-600 p-3 bg-green-50 rounded-md my-4">Automation saved successfully!</div>}
        
        <button onClick={handleSave} disabled={loading} className="w-full mt-4 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg flex items-center justify-center"><Save className="w-5 h-5 mr-2" />{loading ? 'Saving...' : 'Save Automation'}</button>
      </div>
      
      <div className="hidden md:flex items-center justify-center">
         <div className="relative w-full max-w-xs h-[600px] bg-black rounded-[2.5rem] shadow-2xl border-[10px] border-gray-800">
           <div className="w-full h-full bg-white flex flex-col">
                <header className="flex items-center p-2.5 border-b"><div className="w-9 h-9 bg-gray-200 rounded-full mr-3 flex items-center justify-center"><User className="w-5 h-5"/></div><span className="font-semibold text-sm">{account.clientName}</span></header>
                <main className="flex-grow p-4 space-y-4 overflow-y-auto">
                    <div className="flex justify-center text-xs text-gray-400">Replying to a story</div>
                    <div className="flex items-start gap-2.5">
                        <div className="w-6 h-6 bg-gray-200 rounded-md flex-shrink-0 overflow-hidden">
                           {selectedStoryThumbnail ? <img src={selectedStoryThumbnail} className="w-full h-full object-cover" /> : <ImageIcon className="w-4 h-4 text-gray-400 m-1"/>}
                        </div>
                        <div className="flex-grow bg-gray-100 rounded-lg p-2"><p className="text-xs font-semibold">{account.clientName}</p><p className="text-xs text-gray-600">Story</p></div>
                    </div>
                    <div className="flex justify-end"><div className="bg-gray-100 rounded-2xl p-2.5"><p className="text-sm">{triggerType === 'keyword_match' ? (keywords.split(',')[0].trim() || ' interested') : "Cool story!"}</p></div></div>
                    <div className="flex justify-start">
                         <div className="bg-blue-500 text-white rounded-2xl rounded-bl-none max-w-[85%] flex flex-col">
                            <p className="text-sm py-2 px-3.5">{replyMessage || "Your reply..."}</p>
                            {showLinkFields && linkUrl && linkTitle && (
                                <><div className="border-t border-blue-400/50"></div><a href="#" onClick={(e) => e.preventDefault()} className="py-2 px-3.5 text-center font-semibold text-sm hover:bg-blue-600 rounded-b-2xl">{linkTitle || "Your Link"}</a></>
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

export default StoryAutomationEditor;