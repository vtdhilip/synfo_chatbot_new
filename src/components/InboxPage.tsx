// src/pages/InboxPage.tsx

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

// Define types for our data
interface Conversation {
  id: string;
  senderId: string;
  lastUpdatedAt: { toDate: () => Date };
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: { toDate: () => Date };
}

const InboxPage = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  // Listen for all active conversations in real-time
  useEffect(() => {
    const q = query(collection(db, "conversations"), orderBy("lastUpdatedAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const convosData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Conversation[];
      setConversations(convosData);
    });
    return () => unsubscribe(); // Cleanup listener on component unmount
  }, []);

  // When a conversation is selected, listen for its messages in real-time
  useEffect(() => {
    if (!selectedConvo) return;
    setLoading(true);
    const messagesQuery = query(collection(db, "conversations", selectedConvo.id, "messages"), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(messagesQuery, (querySnapshot) => {
      const messagesData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Message[];
      setMessages(messagesData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [selectedConvo]);

  return (
    <div className="flex h-[calc(100vh-4rem)]"> {/* Full height minus header */}
      {/* Conversation List Sidebar */}
      <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">Inbox</h2>
        </div>
        <ul>
          {conversations.map(convo => (
            <li
              key={convo.id}
              onClick={() => setSelectedConvo(convo)}
              className={`p-4 cursor-pointer hover:bg-gray-100 ${selectedConvo?.id === convo.id ? 'bg-blue-50' : ''}`}
            >
              <p className="font-semibold">User: {convo.senderId}</p>
              <p className="text-xs text-gray-500">
                Last updated: {convo.lastUpdatedAt.toDate().toLocaleTimeString()}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {/* Message Display Area */}
      <div className="w-2/3 flex flex-col">
        {selectedConvo ? (
          <>
            <div className="p-4 border-b flex-shrink-0">
              <h3 className="font-bold">Conversation with {selectedConvo.senderId}</h3>
            </div>
            <div className="flex-grow p-4 overflow-y-auto">
              {loading ? <p>Loading messages...</p> : messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === 'bot' ? 'justify-start' : 'justify-end'} mb-4`}>
                  <div className={`max-w-md p-3 rounded-lg ${msg.sender === 'bot' ? 'bg-gray-200' : 'bg-blue-500 text-white'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
            {/* You would add a message input box here later */}
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Select a conversation to view messages</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InboxPage;