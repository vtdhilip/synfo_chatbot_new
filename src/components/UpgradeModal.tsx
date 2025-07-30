import React from 'react';
import { Zap, X, ArrowRight } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  limit: number | string;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, planName, limit }) => {
  if (!isOpen) {
    return null;
  }

  const handleUpgradeClick = () => {
    // This can be changed to navigate internally if you build a pricing page
    window.location.href = '/pricing'; // Changed to a relative path for better integration
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity"
      onClick={onClose}
    >
      <div 
        className="bg-white/20 backdrop-blur-2xl rounded-2xl shadow-2xl w-full max-w-md p-6 text-center relative border border-white/30"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-600 hover:bg-white/50 transition-colors"
            aria-label="Close modal"
        >
            <X size={20} />
        </button>

        <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-brand-500/20 mb-4">
          <Zap className="h-8 w-8 text-brand" />
        </div>

        <h2 className="text-2xl font-bold text-slate-800">
          Monthly Limit Reached
        </h2>

        <p className="text-slate-600 my-4">
          You've used all {limit} automations included in your **{planName}**. To continue automating, please upgrade your plan.
        </p>

        <div className="space-y-3 mt-6">
          <button
            onClick={handleUpgradeClick}
            className="w-full inline-flex items-center justify-center bg-brand text-white font-semibold py-3 px-4 rounded-lg hover:bg-brand-600 transition-colors"
          >
            Upgrade Plan
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
          <button
            onClick={onClose}
            className="w-full bg-white/40 text-slate-700 font-semibold py-3 px-4 rounded-lg hover:bg-white/60 border border-white/30 transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
