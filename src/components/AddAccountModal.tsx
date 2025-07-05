import { Instagram, MessageCircle, Facebook } from 'lucide-react';
interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  // We need to make sure the component expects this function as a prop
  onSelectPlatform: (platform: 'instagram' | 'whatsapp' | 'facebook') => void;
}

const PlatformCard = ({ icon, title, description, onClick, isDisabled = false }: any) => (
  <button
    type="button"
    onClick={onClick}
    disabled={isDisabled}
    className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-500 transition-all duration-200 disabled:opacity-50 disabled:hover:bg-white disabled:hover:border-gray-200 disabled:cursor-not-allowed"
  >
    <div className="flex items-center">
      <div className="p-2 bg-gray-100 rounded-lg mr-4">{icon}</div>
      <div>
        <h3 className="font-semibold text-gray-800">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
  </button>
);


const AddAccountModal: React.FC<AddAccountModalProps> = ({ isOpen, onClose, onSelectPlatform }) => {
  if (!isOpen) return null;

  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Where would you like to start?</h2>
          <p className="text-gray-500">You can connect other channels later.</p>
        </div>
        <div className="space-y-4">
          <PlatformCard
            icon={<Instagram className="text-pink-500" />}
            title="Instagram"
            description="Supercharge your social media with Instagram Automation."
            // This now correctly calls the function passed from the Index page
            onClick={() => onSelectPlatform('instagram')}
          />
          <PlatformCard
            icon={<MessageCircle className="text-green-500" />}
            title="WhatsApp"
            description="Engage customers on the world's most popular messaging app."
            onClick={() => onSelectPlatform('whatsapp')}
            isDisabled={true} 
          />
          <PlatformCard
            icon={<Facebook className="text-blue-600" />}
            title="Facebook Messenger"
            description="Create Messenger automation to keep customers happy."
            onClick={() => onSelectPlatform('facebook')}
            isDisabled={true} 
          />

           <div className="space-y-4">
          
        </div>
        </div>
      </div>
    </div>
  );
};

export default AddAccountModal;