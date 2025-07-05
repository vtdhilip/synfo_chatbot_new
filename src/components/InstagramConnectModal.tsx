import { Instagram, Facebook } from 'lucide-react';
import { generateFacebookAuthLink } from '../utils/facebookAuth';

// 1. Removed the unused onFacebookLogin prop
interface InstagramConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginOptionCard = ({ icon, title, description, onClick, isDisabled = false }: any) => (
  <button
    onClick={onClick}
    disabled={isDisabled}
    className="w-full text-left p-4 border border-gray-200 rounded-lg flex items-center hover:bg-gray-50 hover:border-blue-500 transition-all duration-200 disabled:opacity-60 disabled:hover:bg-white disabled:hover:border-gray-200 disabled:cursor-not-allowed"
  >
    <div className="p-2 bg-gray-100 rounded-lg mr-4">{icon}</div>
    <div>
      <h3 className="font-semibold text-gray-800">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  </button>
);

const InstagramConnectModal: React.FC<InstagramConnectModalProps> = ({ isOpen, onClose }) => {
  // 2. The handleConnect function is now INSIDE the component
 const handleConnect = () => {
   
    
    const state = "secure_state_" + Math.random(); 
    localStorage.setItem("oauth_state", state);

    // Call the single, correct function to get the URL
    const authUrl = generateFacebookAuthLink( state);

    window.open(authUrl, '_blank', 'width=800,height=700');
    onClose();
  };
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        <div className="text-center mb-6">
          <Instagram className="mx-auto h-10 w-10 text-pink-500 mb-2" />
          <h2 className="text-2xl font-bold text-gray-800">Connect Your Instagram Account</h2>
          <p className="text-gray-500">Log in with Facebook to grant access to your Instagram Business Account.</p>
        </div>
        <div className="space-y-4">
          <LoginOptionCard
            icon={<Instagram className="text-gray-400" />}
            title="Log in with Instagram"
            description="Direct Instagram login is not available for business features."
            isDisabled={true}
          />
          <LoginOptionCard
            icon={<Facebook className="text-blue-600" />}
            title="Log in with Facebook"
            description="Required for business messaging and chatbot automation."
            onClick={handleConnect} // 3. The onClick now calls the internal handleConnect function
          />
        </div>
      </div>
    </div>
  );
};

export default InstagramConnectModal;