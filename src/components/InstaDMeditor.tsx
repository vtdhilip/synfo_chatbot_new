import { useState, useEffect } from 'react';
import { type Account } from '../pages/Index';

// Ensure these interfaces are also defined in '../pages/Index.ts' or a shared types file
// to prevent duplication and ensure consistency across your project.
export interface SimpleKeywordReply {
  text: string;
  link?: {
    url: string;
    title: string;
  };
}

export interface SimpleKeywordAutomation {
  type: 'simple_keyword';
  keywords: string[];
  reply: SimpleKeywordReply;
}

interface SimpleDmEditorProps {
  account: Account;
  onSave: (automationData: SimpleKeywordAutomation) => Promise<void>;
}

const SimpleDmEditor: React.FC<SimpleDmEditorProps> = ({ account, onSave }) => {
  const [keywords, setKeywords] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [showLinkFields, setShowLinkFields] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Example suggestions for the pills
  const keywordSuggestions = ['Price', 'Link', 'Shop', 'Hello', 'Help']; // Added more common ones

  useEffect(() => {
    if (account.dmAutomation && account.dmAutomation.type === 'simple_keyword') {
      const dmAutomation = account.dmAutomation as SimpleKeywordAutomation;
      setKeywords(dmAutomation.keywords.join(', '));
      setReplyMessage(dmAutomation.reply.text);

      if (dmAutomation.reply.link) {
        setLinkUrl(dmAutomation.reply.link.url);
        setLinkTitle(dmAutomation.reply.link.title);
        setShowLinkFields(true);
      } else {
        setLinkUrl('');
        setLinkTitle('');
        setShowLinkFields(false);
      }
    } else {
      setKeywords('');
      setReplyMessage('');
      setLinkUrl('');
      setLinkTitle('');
      setShowLinkFields(false);
    }
  }, [account]);

  const handleSave = async () => {
    setLoading(true);
    setSaveSuccess(false);
    setSaveError(null);

    if (!keywords.trim() || !replyMessage.trim()) {
      setSaveError('Keywords and reply message cannot be empty.');
      setLoading(false);
      return;
    }

    if (showLinkFields && (!linkUrl.trim() || !linkTitle.trim())) {
      setSaveError('Link URL and Title cannot be empty if link fields are shown.');
      setLoading(false);
      return;
    }

    const automationData: SimpleKeywordAutomation = {
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
    // Add the suggestion if it's not already in the keywords list
    const currentKeywords = keywords.split(',').map(k => k.trim()).filter(Boolean);
    if (!currentKeywords.some(k => k.toLowerCase() === suggestion.toLowerCase())) {
      setKeywords(currentKeywords.concat(suggestion).join(', '));
    }
  };


  const previewKeyword = keywords.split(',').map(k => k.trim()).filter(Boolean)[0] || 'hello';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6">
      {/* Left side: The Form */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Simple DM Automation</h2>

        {/* --- When someone DMs you with: Section --- */}
        <div className="mb-6">
          <label className="block text-xl font-semibold text-gray-800 mb-4">When someone DMs you with</label>
          <div className="bg-gray-50 p-5 rounded-lg shadow-inner-sm border border-gray-200"> {/* New container style */}
            <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 mb-2">a specific word or words</label>
            <input
              id="keywords"
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="Price, Link, Shop"
              className="w-full px-4 py-3 text-lg bg-white border-none focus:ring-0 focus:outline-none rounded-lg mb-3 shadow-sm" // New input style
            />
            <p className="text-sm text-gray-500 mb-3">Use commas to separate words</p> {/* Changed to sm and gray-500 */}
            <div className="flex items-center flex-wrap gap-2 text-sm text-gray-600">
              <span>For example:</span>
              {keywordSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button" // Important for buttons inside forms
                  onClick={() => handleAddKeywordFromSuggestion(suggestion)}
                  className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200 hover:bg-blue-100 transition-colors duration-200"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* --- They'll get a DM back from you: Section --- */}
        <div className="mb-6">
          <label className="block text-xl font-semibold text-gray-800 mb-4">They'll get a DM back from you</label>
          <div className="bg-gray-50 p-5 rounded-lg shadow-inner-sm border border-gray-200"> {/* New container style */}
             <label htmlFor="replyMessage" className="block text-sm font-medium text-gray-700 mb-2">a DM with the message:</label>
            <textarea
              id="replyMessage"
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder="Write a message"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all duration-200 mb-3"
            />

            {showLinkFields && (
              <>
                <p className="text-xs text-gray-500 mb-2">and an attached link:</p>
                <div className="relative mb-3">
                  <input
                    type="text"
                    value={linkTitle}
                    onChange={(e) => setLinkTitle(e.target.value)}
                    placeholder="Link Title (e.g., Shop Now)"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  />
                   <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 cursor-pointer"
                         onClick={() => {
                             setLinkUrl('');
                             setLinkTitle('');
                             setShowLinkFields(false);
                         }}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </span>
                </div>
                <div className="relative mb-3">
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com/your-link"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  />
                   <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-.758l-.293.293m3.182 3.182l-.293.293m-5.656-5.656l1.102-1.101M16.732 6.732l.707-.707m2.828 2.828l.707-.707m-2.828 2.828l.707-.707M14 10l-2 2m0 0l-2 2"></path></svg>
                  </span>
                </div>
              </>
            )}

            {!showLinkFields && (
              <button
                onClick={() => setShowLinkFields(true)}
                className="w-full flex items-center justify-center px-6 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m0 0H6"></path></svg>
                Add A Link
              </button>
            )}
          </div>
        </div>
        
        {saveError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{saveError}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">Automation saved successfully!</span>
          </div>
        )}
        
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg disabled:opacity-50 hover:bg-blue-700 transition-colors duration-200"
        >
          {loading ? 'Saving...' : 'Save Automation'}
        </button>
      </div>

      {/* Right side: The Phone Preview */}
      <div className="flex items-center justify-center p-4">
        <div className="
          relative w-full max-w-xs h-[600px] bg-black rounded-[3rem] shadow-2xl
          border-[10px] border-gray-900 overflow-hidden
          flex flex-col items-center justify-start
        ">
          {/* Notch */}
          <div className="absolute top-0 w-2/5 h-6 bg-gray-900 rounded-b-xl z-10"></div>
          {/* Speaker/Camera indicators */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-gray-700 rounded-full z-20"></div>
          <div className="absolute top-2 right-12 w-2 h-2 bg-gray-700 rounded-full z-20"></div>
          <div className="absolute top-2 left-12 w-2 h-2 bg-gray-700 rounded-full z-20"></div>


          {/* Instagram App Content Area */}
          <div className="flex-grow w-full h-full bg-gradient-to-b from-gray-900 to-black rounded-[2.5rem] mt-[2.5rem] p-4 flex flex-col justify-between overflow-hidden">
              {/* Instagram Header Bar */}
              <div className="flex justify-between items-center pb-3 border-b border-gray-800 mb-4">
                  <span className="text-white text-lg font-semibold">@synaptic_info</span>
                  <div className="flex space-x-3">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                  </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-grow flex flex-col justify-end overflow-y-auto custom-scrollbar pr-2">
                  {/* User message */}
                  <div className="flex justify-end mb-3">
                      <div className="bg-gradient-to-r from-purple-500 to-blue-600 text-white text-sm p-3 rounded-2xl rounded-br-none max-w-[80%] break-words shadow-md">
                          {previewKeyword}
                      </div>
                  </div>
                  {/* Bot Reply - Text Message */}
                  {replyMessage && (
                    <div className="flex justify-start mb-1">
                        <div className="bg-gray-700 text-white text-sm p-3 rounded-2xl rounded-bl-none max-w-[80%] break-words shadow-md">
                            {replyMessage}
                        </div>
                    </div>
                  )}
                  {/* Bot Reply - Link */}
                  {showLinkFields && linkTitle && linkUrl && (
                    <div className="flex justify-start mt-1">
                        <a href={linkUrl} target="_blank" rel="noopener noreferrer"
                           className="bg-gray-700 text-blue-400 text-sm p-3 rounded-2xl max-w-[80%] break-words shadow-md flex items-center justify-between hover:bg-gray-600 transition-colors duration-200">
                           <span>{linkTitle}</span>
                           <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                        </a>
                    </div>
                  )}
                  {(!replyMessage && !(showLinkFields && linkTitle && linkUrl)) && (
                      <div className="flex justify-start">
                          <div className="bg-gray-700 text-white text-sm p-3 rounded-2xl rounded-bl-none max-w-[80%] break-words shadow-md">
                              Your automated reply will appear here...
                          </div>
                      </div>
                  )}

              </div>

              {/* Input Bar */}
              <div className="mt-4 flex items-center bg-gray-800 rounded-full px-4 py-2">
                  <input
                      type="text"
                      placeholder="Message..."
                      className="flex-grow bg-transparent text-white text-sm outline-none placeholder-gray-500"
                      disabled
                  />
                  <svg className="w-5 h-5 text-gray-400 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L19 16m-2-2l1.586-1.586a2 2 0 012.828 0L24 14m-4-4v4m-4-4v4m-4-4v4m-4-4v4m-4-4v4m-4-4v4m-4-4v4m-4-4v4"></path></svg>
              </div>
          </div>
           {/* Home Indicator */}
           <div className="absolute bottom-2 w-2/5 h-1 bg-gray-700 rounded-full"></div>
        </div>
      </div>

      {/* Custom Scrollbar for preview */}
      <style>
        {`
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #333; /* Darker scrollbar for dark theme */
            border-radius: 2px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #555;
          }
        `}
      </style>
    </div>
  );
};

export default SimpleDmEditor;