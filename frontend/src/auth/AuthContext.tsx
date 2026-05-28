/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from "react";

export interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
}

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signIn: (username: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Instantly hydrate with backend-matching stub identity
    setCurrentUser({
      id: "test-user-id",
      username: "operator",
      email: "operator@dimmare.com",
      roles: ["operator"],
    });
    setLoading(false);
  }, []);

  const signIn = async (username: string) => {
    setLoading(true);
    await Promise.resolve();
    setCurrentUser({
      id: "test-user-id",
      username: username || "operator",
      email: `${username || "operator"}@dimmare.com`,
      roles: ["operator"],
    });
    setLoading(false);
  };

  const signOut = async () => {
    setLoading(true);
    await Promise.resolve();
    setCurrentUser(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useCurrentUser = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useCurrentUser must be used within an AuthProvider");
  }
  return context;
};
