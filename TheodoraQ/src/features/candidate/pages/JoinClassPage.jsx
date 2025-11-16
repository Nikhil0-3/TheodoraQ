import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/contexts/AuthContext';

/**
 * Join Class Page for Candidates
 * Allows candidates to join a class using an invite code
 */
function JoinClassPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token, user } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasAttemptedAutoJoin, setHasAttemptedAutoJoin] = useState(false);
  const autoJoinAttemptedRef = React.useRef(false);

  const handleJoinClass = async (e, codeToUse = null) => {
    if (e) e.preventDefault();
    
    // Prevent duplicate calls
    if (isLoading) {
      console.log('⏸️ Already joining, skipping duplicate call');
      return;
    }
    
    setError('');
    setSuccess('');

    const code = codeToUse || inviteCode;
    
    if (!code.trim()) {
      setError('Please enter an invite code');
      return;
    }

    setIsLoading(true);

    console.log('🔵 Attempting to join class with code:', code);
    console.log('Token:', token ? 'Present' : 'Missing');
    console.log('User:', user);

    try {
      const response = await fetch('http://localhost:5000/api/classes/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ inviteCode: code.trim() })
      });

      const data = await response.json();

      console.log('Join response:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to join class');
      }

      setSuccess(`Successfully joined "${data.data.title}"!`);
      setInviteCode('');
      
      // Clear any pending invite code
      localStorage.removeItem('pendingInviteCode');
      
      setTimeout(() => {
        navigate('/candidate/my-classes');
      }, 2000);

    } catch (err) {
      console.error('❌ Error joining class:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Check for invite code in URL and auto-join if logged in
  useEffect(() => {
    console.log('🔍 JoinClassPage useEffect triggered');
    console.log('Current state:', { token: !!token, user: user?.role, hasAttemptedAutoJoin });
    console.log('URL search params:', searchParams.toString());
    console.log('Full URL:', window.location.href);
    console.log('Search string:', window.location.search);
    
    const codeFromUrl = searchParams.get('code');
    console.log('Code from searchParams.get("code"):', codeFromUrl);
    
    if (codeFromUrl) {
      console.log('📧 Invite code from URL:', codeFromUrl);
      setInviteCode(codeFromUrl);
      
      // If user is logged in as candidate, auto-join
      if (token && user && user.role === 'candidate') {
        // Prevent multiple auto-join attempts (including from React StrictMode double render)
        if (!hasAttemptedAutoJoin && !autoJoinAttemptedRef.current) {
          console.log('✅ User authenticated as candidate, auto-joining...');
          autoJoinAttemptedRef.current = true;
          setHasAttemptedAutoJoin(true);
          handleJoinClass(null, codeFromUrl);
        } else {
          console.log('⏸️ Auto-join already attempted, skipping');
        }
      } else if (token && user && user.role === 'admin') {
        console.log('❌ User is admin, cannot join classes');
        setError('Admins cannot join classes. Please login with a candidate account.');
      } else {
        // User not logged in - store code and redirect to login
        console.log('❌ User not authenticated, redirecting to login');
        console.log('Storing invite code in localStorage:', codeFromUrl);
        
        // Store the code synchronously
        try {
          localStorage.setItem('pendingInviteCode', codeFromUrl);
          const savedCode = localStorage.getItem('pendingInviteCode');
          console.log('✅ Verified code saved to localStorage:', savedCode);
          
          // Also save to sessionStorage as backup
          sessionStorage.setItem('pendingInviteCode', codeFromUrl);
          console.log('✅ Also saved to sessionStorage as backup');
        } catch (error) {
          console.error('❌ Error saving to localStorage:', error);
        }
        
        setError(`Please login or sign up to join this class. Redirecting to login... (Code: ${codeFromUrl})`);
        
        // Redirect to login with the code as a URL parameter as well
        setTimeout(() => {
          const verifyCode = localStorage.getItem('pendingInviteCode');
          console.log('🔄 Before redirect, verifying code in localStorage:', verifyCode);
          console.log('🔄 Redirecting to login page...');
          // Pass the code in the URL as well for extra safety
          navigate(`/?redirect=join&inviteCode=${codeFromUrl}`);
        }, 2000);
      }
    } else {
      // No code in URL - check for pending invite code after login
      console.log('📌 No code in URL, checking for pending invite code...');
      const pendingCode = localStorage.getItem('pendingInviteCode');
      console.log('Pending code from localStorage:', pendingCode);
      
      if (pendingCode && token && user && user.role === 'candidate') {
        // Prevent multiple auto-join attempts (including from React StrictMode double render)
        if (!hasAttemptedAutoJoin && !autoJoinAttemptedRef.current) {
          console.log('✅ Found pending invite code, auto-joining...');
          autoJoinAttemptedRef.current = true;
          setInviteCode(pendingCode);
          setHasAttemptedAutoJoin(true);
          localStorage.removeItem('pendingInviteCode');
          handleJoinClass(null, pendingCode);
        } else {
          console.log('⏸️ Auto-join already attempted, skipping');
        }
      } else if (pendingCode) {
        console.log('⚠️ Pending code found but conditions not met:', {
          hasToken: !!token,
          hasUser: !!user,
          userRole: user?.role
        });
      }
    }
  }, [token, user, searchParams]);

  const TheodoraQLogo = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      <img 
        src="/src/assets/dark_mode_theodoraQ_logo.svg" 
        alt="TheodoraQ Logo" 
        className="h-7 w-auto"
      />
      <span className="font-semibold text-xl text-gray-900">
        TheodoraQ
      </span>
    </div>
  );

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-100px)] p-4 -mt-6">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
          <TheodoraQLogo />
          
          <div className="mb-6">
            <h1 className="text-3xl font-semibold text-gray-900 mb-2 text-center">
              Join a Class
            </h1>
            <p className="text-sm text-gray-600 text-center">
              Enter the invite code provided by your instructor
            </p>
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-lg">
              <p className="text-xs text-red-800 font-medium">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 rounded-lg">
              <p className="text-xs text-green-800 font-medium">{success}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleJoinClass} className="space-y-4">
            <div>
              <label 
                htmlFor="inviteCode" 
                className="text-sm font-semibold text-gray-900 block mb-2"
              >
                Invite Code
              </label>
              <input
                type="text"
                id="inviteCode"
                name="inviteCode"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="CS101-A8B2K"
                className="w-full px-4 py-3 text-sm rounded-xl bg-gray-50 border-2 border-gray-200 focus:bg-white focus:border-gray-900 focus:outline-none transition-all uppercase font-mono tracking-wide"
                autoFocus
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Example: CS101-A8B2K
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !inviteCode.trim()}
              className="w-full py-3 px-6 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Joining...
                </span>
              ) : (
                'Join Class'
              )}
            </button>
          </form>

          {/* Help Text */}
          <div className="mt-5 pt-5 border-t border-gray-200">
            <div className="flex gap-2.5">
              <div className="shrink-0 w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-900 mb-1">Need help?</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Contact your instructor to get the class invite code. You'll have instant access after joining.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default JoinClassPage;
