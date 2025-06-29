
import React from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface MessageAlertProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

const MessageAlert = ({ message, type = 'info', onClose }: MessageAlertProps) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className={`rounded-lg border p-4 mb-6 flex items-center justify-between ${getStyles()}`}>
      <div className="flex items-center">
        {getIcon()}
        <span className="ml-3 font-medium">{message}</span>
      </div>
      <button
        onClick={onClose}
        className="ml-4 text-gray-400 hover:text-gray-600 transition-colors duration-200"
      >
        <XCircle className="w-4 h-4" />
      </button>
    </div>
  );
};

export default MessageAlert;
