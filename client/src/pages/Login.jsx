import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import useAuthStore from '../store/authStore';
import MSGLogo from '../components/Logo';

const Login = () => {
  const [formData, setFormData] = useState({
    emailOrUsername: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(formData);
      navigate('/');
    } catch (err) {
      // Error handled by store
    }
  };

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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-10 animate-fadeIn">
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">Welcome back</h1>
              <p className="text-gray-500 text-sm">Enter your credentials to access your messages.</p>
            </div>
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-700 mb-1.5 ml-1">Username or Email</label>
                <div className="relative group">
                  <input
                    type="text"
                    className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 block p-3 outline-none transition-all placeholder-gray-400 hover:border-gray-400"
                    placeholder="Enter your username"
                    value={formData.emailOrUsername}
                    onChange={(e) => setFormData({ ...formData, emailOrUsername: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-700 mb-1.5 ml-1">Password</label>
                <div className="relative group">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 block p-3 outline-none transition-all placeholder-gray-400 hover:border-gray-400"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-full transition-all duration-200 flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-500">
                Don't have an account? 
                <Link to="/register" className="ml-2 text-emerald-600 hover:text-emerald-700 font-semibold hover:underline">
                  Sign up
                </Link>
              </p>
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

export default Login;
