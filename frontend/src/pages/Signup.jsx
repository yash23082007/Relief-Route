import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navigation, AlertCircle, Eye, EyeOff } from 'lucide-react';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    setLoading(true);

    try {
      const { error: signupError } = await signup(email, password);
      if (signupError) {
        setError(signupError.message || 'Registration failed');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-screen w-screen h-screen flex items-center justify-center bg-[#060813] relative overflow-hidden px-4">
      {/* Decorative Grid background */}
      <div className="absolute inset-0 pointer-events-none opacity-20"
           style={{
             backgroundImage: 'radial-gradient(rgba(99, 102, 241, 0.1) 1.5px, transparent 0)',
             backgroundSize: '20px 20px'
           }}
      />
      
      {/* Dynamic decorative light spot */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-900/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-[#0a0f1d] border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10 transition-all">
        {/* Brand logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-3 animate-pulse">
            <Navigation className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-xl font-bold font-mono tracking-wider text-slate-100 uppercase">RELIEFROUTE</h2>
          <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider mt-1 font-mono">Disaster Operations Command Tower</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-900/50 rounded-xl flex items-center space-x-2 text-red-400 text-xs font-mono">
            <AlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email field */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider block">Operator Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. pilot@rescue.org"
              required
              className="w-full px-4 py-2 bg-slate-900 border border-slate-800 focus:border-indigo-500/80 rounded-xl text-sm text-slate-100 placeholder-slate-650 focus:outline-none transition shadow-inner"
            />
          </div>

          {/* Password field */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider block">Security Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                required
                className="w-full pl-4 pr-10 py-2 bg-slate-900 border border-slate-800 focus:border-indigo-500/80 rounded-xl text-sm text-slate-100 placeholder-slate-650 focus:outline-none transition shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password field */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider block">Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              required
              className="w-full px-4 py-2 bg-slate-900 border border-slate-800 focus:border-indigo-500/80 rounded-xl text-sm text-slate-100 placeholder-slate-650 focus:outline-none transition shadow-inner"
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold font-mono text-xs rounded-xl shadow-lg shadow-indigo-500/20 transition flex items-center justify-center uppercase tracking-wider"
          >
            {loading ? (
              <span className="flex items-center space-x-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping"></span>
                <span>CREATING OPERATOR PROFILE...</span>
              </span>
            ) : (
              'REGISTER OPERATOR'
            )}
          </button>
        </form>

        {/* Footer login link */}
        <div className="mt-5 text-center text-xs text-slate-500 font-sans">
          <span>Already registered? </span>
          <Link to="/login" className="text-indigo-400 font-semibold hover:text-indigo-300 transition underline-offset-4 hover:underline">
            Log In to Console
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
