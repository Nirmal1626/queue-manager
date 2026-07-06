import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [manager, setManager] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('manager');
    if (stored) setManager(JSON.parse(stored));
    setLoading(false);
  }, []);

  const login = (token, managerData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('manager', JSON.stringify(managerData));
    setManager(managerData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('manager');
    setManager(null);
  };

  return (
    <AuthContext.Provider value={{ manager, login, logout, loading, isAuthenticated: !!manager }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}