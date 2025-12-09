import { useState, useEffect } from 'react';
import { X, Shield, Check } from 'lucide-react';
import { generateSafetyNumber } from '../utils/safetyNumber';
import useAuthStore from '../store/authStore';

const SafetyNumber = ({ contact, onClose }) => {
  const { user } = useAuthStore();
  const [safetyNumber, setSafetyNumber] = useState('');
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const generate = async () => {
      if (user.publicKey && contact.publicKey) {
        const number = await generateSafetyNumber(
          user.publicKey,
          contact.publicKey,
          user.id,
          contact._id
        );
        setSafetyNumber(number);
      }
    };
    generate();
  }, [user, contact]);

  const handleVerify = () => {
    setVerified(true);
    // Store verification in localStorage
    localStorage.setItem(`verified_${contact._id}`, 'true');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Shield className="text-emerald-600" size={24} />
            <h2 className="text-xl font-bold">Safety Number</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-4">
            Verify this safety number matches on {contact.username}'s device to ensure your messages are end-to-end encrypted.
          </p>
          
          <div className="bg-gray-50 p-4 rounded-lg font-mono text-center text-lg leading-relaxed">
            {safetyNumber}
          </div>
        </div>

        {verified ? (
          <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-3 rounded-lg mb-4">
            <Check size={20} />
            <span className="text-sm font-medium">Verified</span>
          </div>
        ) : (
          <button
            onClick={handleVerify}
            className="w-full bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 transition mb-4"
          >
            Mark as Verified
          </button>
        )}

        <p className="text-xs text-gray-500 text-center">
          Compare this number in person, via video call, or through another secure channel.
        </p>
      </div>
    </div>
  );
};

export default SafetyNumber;
