import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('login');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLoginClick = () => {
    setModalMode('login');
    setIsModalOpen(true);
  };

  const handleSignupClick = () => {
    setModalMode('signup');
    setIsModalOpen(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const value = {
    user,
    loading,
    isModalOpen,
    modalMode,
    setModalMode,
    handleLoginClick,
    handleSignupClick,
    handleLogout,
    closeModal,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
