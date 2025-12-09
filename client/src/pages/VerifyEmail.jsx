import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import api from '../api/axios';
import MSGLogo from '../components/Logo';

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link');
        return;
      }

      try {
        const response = await api.get(`/auth/verify-email/${token}`);
        setStatus('success');
        setMessage(response.data.message || 'Email verified successfully!');
      } catch (error) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Verification failed. Please try again.');
      }
    };

    verifyEmail();
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-gray-900 font-sans flex flex-col">
      {/* Header */}
      <header className="p-6 flex items-center gap-3">
        <MSGLogo className="w-10 h-10" />
        <span className="font-extrabold text-3xl tracking-widest text-gray-800 logo-text-speed">MSG</span>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[480px]">
          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-10">
            <div className="text-center animate-fadeIn py-4">
              {status === 'verifying' && (
                <>
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Verifying your email</h2>
                  <p className="text-gray-600">Please wait while we verify your email address...</p>
                </>
              )}

              {status === 'success' && (
                <>
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="text-emerald-600" size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Email Verified!</h2>
                  <p className="text-gray-600 mb-6 leading-relaxed">{message}</p>
                  <Link
                    to="/login"
                    className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-full transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    Go to Login
                  </Link>
                </>
              )}

              {status === 'error' && (
                <>
                  <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-red-600 text-3xl">✕</span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Verification Failed</h2>
                  <p className="text-gray-600 mb-6 leading-relaxed">{message}</p>
                  <Link
                    to="/login"
                    className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-full transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    Go to Login
                  </Link>
                </>
              )}
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
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
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

export default VerifyEmail;
