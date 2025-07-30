// src/components/MessageAlert.tsx

import React from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

interface MessageAlertProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

const MessageAlert: React.FC<MessageAlertProps> = ({ message, type = 'info', onClose }) => {
  const config = {
    success: {
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
      styles: 'bg-green-50 border-green-200 text-green-800',
    },
    error: {
      icon: <XCircle className="w-5 h-5 text-red-500" />,
      styles: 'bg-red-50 border-red-200 text-red-800',
    },
    info: {
      icon: <AlertCircle className="w-5 h-5 text-blue-500" />,
      styles: 'bg-blue-50 border-blue-200 text-blue-800',
    },
  };

  const { icon, styles } = config[type];

  return (
    <div className={`rounded-lg border p-4 flex items-center justify-between shadow-sm ${styles}`}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
            {icon}
        </div>
        <div className="ml-3">
            <p className="text-sm font-medium">{message}</p>
        </div>
      </div>
      <div className="ml-auto pl-3">
        <div className="-mx-1.5 -my-1.5">
            <button
                onClick={onClose}
                className="inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2"
            >
                <span className="sr-only">Dismiss</span>
                <X className="h-5 w-5" />
            </button>
        </div>
      </div>
    </div>
  );
};

export default MessageAlert;
