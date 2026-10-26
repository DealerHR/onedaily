import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface SignUpProps {
  onToggleMode: () => void;
}

export const SignUp = ({ onToggleMode }: SignUpProps) => {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    const { error } = await signUp(email, password, fullName, organization);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-900 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-orange-500 to-cyan-500 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-500 to-blue-500 rounded-full blur-3xl opacity-20"></div>

        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-10 w-full max-w-md relative">
          <div className="flex flex-col items-center mb-6">
            <img
              src="/1_Daily_Logo_SVG.svg"
              alt="OneDaily"
              className="h-12 mb-6"
            />
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl mb-6 shadow-xl">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-3">Account Created!</h2>
            <p className="text-slate-700 mb-8 font-medium text-lg">
              Your account has been successfully created. You can now sign in with your credentials.
            </p>
            <button
              onClick={onToggleMode}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl hover:shadow-orange-500/50 hover:scale-105 transition-all"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-900 relative overflow-hidden py-8">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-orange-500 to-cyan-500 rounded-full blur-3xl opacity-20"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-500 to-blue-500 rounded-full blur-3xl opacity-20"></div>

      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-10 w-full max-w-md relative">
        <div className="flex flex-col items-center mb-8">
          <img
            src="/1_Daily_Logo_SVG.svg"
            alt="OneDaily"
            className="h-12 mb-6"
          />
          <h1 className="text-3xl font-black text-slate-900">Create Your Account</h1>
          <p className="text-slate-700 mt-2 font-medium">Start creating drip email campaigns</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-bold text-slate-800 mb-2">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all font-medium"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label htmlFor="organization" className="block text-sm font-bold text-slate-800 mb-2">
              Organization
            </label>
            <input
              id="organization"
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all font-medium"
              placeholder="Your Company"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-bold text-slate-800 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all font-medium"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-bold text-slate-800 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all font-medium"
              placeholder="At least 6 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl hover:shadow-orange-500/50 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 mt-6"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-700 font-medium">
            Already have an account?{' '}
            <button
              onClick={onToggleMode}
              className="text-orange-600 hover:text-orange-700 font-bold"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
