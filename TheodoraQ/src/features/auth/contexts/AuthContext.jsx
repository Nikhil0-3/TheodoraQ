import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { authAPI } from '../../../core/services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Decode token whenever it changes to extract user info
  useEffect(() => {
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        // Update user state from decoded token
        if (decodedToken.user) {
          setUser(decodedToken.user);
          setIsAuthenticated(true);
        } else if (decodedToken.id) {
          // Handle case where user data is directly in token
          setUser({
            id: decodedToken.id,
            email: decodedToken.email,
            name: decodedToken.name,
            role: decodedToken.role,
            registrationNumber: decodedToken.registrationNumber,
          });
          setIsAuthenticated(true);
        }
      } catch (error) {
        // Token is invalid or expired
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
      }
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }
  }, [token]);

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        // Verify token is still valid by fetching user data
        const response = await authAPI.getMe();
        setUser(response.user);
        setToken(storedToken);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setToken(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      // Token invalid or expired
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  // Login function - accepts email and password as separate parameters
  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      
      // Store token and user data
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      setUser(response.user);
      setToken(response.token);
      setIsAuthenticated(true);
      
      return response.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Signup function - accepts name, email, password, role, and registrationNumber as separate parameters
  const signup = async (name, email, password, role = 'candidate', registrationNumber = null) => {
    try {
      const signupData = { name, email, password, role };
      
      // Add registration number only if provided (for candidates)
      if (registrationNumber && role === 'candidate') {
        signupData.registrationNumber = registrationNumber;
      }
      
      const response = await authAPI.register(signupData);
      
      // For signup, we just create the account and don't auto-login
      // User will be redirected to login page
      return response;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  // Google Auth function
  const googleAuth = async (credential, role = null) => {
    try {
      const response = await authAPI.googleAuth(credential, role);
      
      // Store token and user data
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      setUser(response.user);
      setToken(response.token);
      setIsAuthenticated(true);
      
      return response.user;
    } catch (error) {
      console.error('Google auth error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage and state
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    login,
    signup,
    googleAuth,
    logout,
    updateUser,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
