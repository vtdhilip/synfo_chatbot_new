// src/components/InstagramConnectModal.tsx

import React from 'react';
import { Instagram, Facebook, X, ArrowRight } from 'lucide-react';
import { generateFacebookAuthLink } from '../utils/facebookAuth';

interface InstagramConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginOptionCard = ({ icon, title, description, onClick, isDisabled = false }: any) => (
  <button
    onClick={onClick}
    disabled={isDisabled}
    className="group w-full text-left p-4 border border-white/30 bg-white/20 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:border-brand enabled:hover:bg-white/40"
  >
    <div className="flex items-center justify-between">
        <div className="flex items-center">
            <div className="p-3 bg-white/50 rounded-lg mr-4 group-hover:enabled:bg-white/70 transition-colors">
                {icon}
            </div>
            <div>
                <h3 className="font-semibold text-slate-800">{title}</h3>
                <p className="text-sm text-slate-600">{description}</p>
            </div>
        </div>
        {!isDisabled && <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-brand transition-colors" />}
    </div>
  </button>
);

const InstagramConnectModal: React.FC<InstagramConnectModalProps> = ({ isOpen, onClose }) => {
  const handleConnect = () => {
    const state = "secure_state_" + Math.random(); 
    localStorage.setItem("oauth_state", state);
    const authUrl = generateFacebookAuthLink(state);
    // In a real app, consider using a more robust popup solution
    window.open(authUrl, '_blank', 'width=800,height=700,noopener,noreferrer');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
      <div className="bg-white/20 backdrop-blur-2xl rounded-2xl shadow-2xl w-full max-w-md p-6 relative border border-white/30">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full text-slate-600 hover:bg-white/50 transition-colors">
            <X className="w-5 h-5"/>
        </button>
        <div className="text-center mb-6">
          <div className="mx-auto w-14 h-14 mb-4 flex items-center justify-center bg-gradient-to-br from-yellow-400 via-red-500 to-purple-600 text-white rounded-2xl">
            <Instagram className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Connect Instagram</h2>
          <p className="text-slate-600 mt-1">Please log in with the Facebook account that manages your Instagram Business Page.</p>
        </div>
        <div className="space-y-3">
          <LoginOptionCard
            icon={<Facebook className="text-blue-600" />}
            title="Continue with Facebook"
            description="Required for business automations."
            onClick={handleConnect}
          />
          <LoginOptionCard
            icon={<Instagram className="text-slate-400" />}
            title="Log in with Instagram"
            description="Direct login is not supported by Meta."
            isDisabled={true}
          />
        </div>
      </div>
    </div>
  );
};

export default InstagramConnectModal;
