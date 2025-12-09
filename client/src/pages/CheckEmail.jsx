import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import MSGLogo from '../components/Logo';
import api from '../api/axios';

const CheckEmail = () => {
  const location = useLocation();
  const email = location.state?.email || 'your email';
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    
    setResending(true);
    setMessage('');
    try {
      await api.post('/auth/resend-verification', { email });
      setMessage('Verification email sent!');
      setCooldown(60);
      const timer = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to resend email');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-gray-900 font-sans flex flex-col">
      <header className="p-6 flex items-center gap-3">
        <MSGLogo className="w-10 h-10" />
        <span className="font-extrabold text-3xl tracking-widest text-gray-800 logo-text-speed">MSG</span>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[480px]">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-10">
            <div className="text-center animate-fadeIn py-4">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="text-emerald-600" size={32} />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Check your email</h2>
              
              <p className="text-gray-600 mb-6 leading-relaxed">
                We've sent a verification link to <br/>
                <span className="font-semibold text-gray-900">{email}</span>.
              </p>
              
              {message && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${
                  message.includes('already') || message.includes('Failed') 
                    ? 'bg-red-50 text-red-600 border border-red-200' 
                    : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                }`}>
                  {message}
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4 mb-8 text-sm text-gray-500 border border-gray-100">
                Didn't receive the email? <button 
                  onClick={handleResend}
                  disabled={cooldown > 0 || resending}
                  className="text-emerald-600 font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resending ? 'Sending...' : cooldown > 0 ? `Wait ${cooldown}s` : 'Click to resend'}
                </button>
              </div>

              <Link
                to="/login"
                className="text-gray-500 hover:text-gray-900 font-medium text-sm flex items-center justify-center gap-1 mx-auto transition-colors"
              >
                Back to Login
              </Link>
            </div>
          </div>
          
          <div className="mt-8 text-center space-x-6 text-sm text-gray-400">
            <a href="#" className="hover:text-gray-600">Privacy</a>
            <a href="#" className="hover:text-gray-600">Terms</a>
            <a href="#" className="hover:text-gray-600">Help</a>
          </div>
        </div>
      </main>
      
      <style>{`
        .logo-text-speed {
          transform: skewX(-8deg);
          display: inline-block;
          text-shadow: 
            -1px 0 0 rgba(5, 150, 105, 0.5), 
            -3px 0 0 rgba(5, 150, 105, 0.3),
            -5px 0 0 rgba(5, 150, 105, 0.1); 
        }
      `}</style>
    </div>
  );
};

export default CheckEmail;
