// src/components/AddAccountModal.tsx

import React from 'react';
import { Instagram, MessageCircle, Facebook, X, ArrowRight } from 'lucide-react';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlatform: (platform: 'instagram' | 'whatsapp' | 'facebook') => void;
}

const PlatformCard = ({ icon, title, description, onClick, isDisabled = false }: any) => (
  <button
    type="button"
    onClick={onClick}
    disabled={isDisabled}
    className="group w-full text-left p-4 border border-white/30 bg-white/20 rounded-lg hover:border-orange-500 hover:bg-orange-50/20 transition-all duration-200 disabled:opacity-50 disabled:hover:bg-white/20 disabled:hover:border-white/30 disabled:cursor-not-allowed"
  >
    <div className="flex items-center justify-between">
        <div className="flex items-center">
            <div className="p-3 bg-white/50 rounded-lg mr-4 group-hover:bg-white/70 transition-colors">
                {icon}
            </div>
            <div>
                <h3 className="font-semibold text-slate-800">{title}</h3>
                <p className="text-sm text-slate-600">{description}</p>
            </div>
        </div>
        {!isDisabled && <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-orange-600 transition-colors" />}
    </div>
  </button>
);


const AddAccountModal: React.FC<AddAccountModalProps> = ({ isOpen, onClose, onSelectPlatform }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-opacity">
      <div className="bg-white/30 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-md p-6 relative border border-white/40 overflow-hidden">
        {/* Decorative color droplets */}
        <div className="absolute top-0 -left-24 w-48 h-48 bg-gradient-to-r from-orange-400 to-amber-300 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 -right-20 w-40 h-40 bg-gradient-to-r from-orange-300 to-yellow-200 rounded-full filter blur-3xl opacity-30 animate-pulse delay-1000"></div>

        {/* Modal Content */}
        <div className="relative z-10">
            <button onClick={onClose} className="absolute top-[-1rem] right-[-1rem] p-1.5 rounded-full text-slate-600 hover:bg-white/50 transition-colors">
                <X className="w-5 h-5"/>
            </button>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Connect a New Channel</h2>
              <p className="text-slate-600 mt-1">Choose a platform to get started.</p>
            </div>
            <div className="space-y-3">
              <PlatformCard
                icon={<Instagram className="text-pink-500" />}
                title="Instagram"
                description="Automate DMs, comments, and story replies."
                onClick={() => onSelectPlatform('instagram')}
              />
              <PlatformCard
                icon={<MessageCircle className="text-green-500" />}
                title="WhatsApp"
                description="Coming soon..."
                onClick={() => onSelectPlatform('whatsapp')}
                isDisabled={true} 
              />
              <PlatformCard
                icon={<Facebook className="text-blue-600" />}
                title="Facebook Messenger"
                description="Coming soon..."
                onClick={() => onSelectPlatform('facebook')}
                isDisabled={true} 
              />
            </div>
        </div>
      </div>
    </div>
  );
};

export default AddAccountModal;
