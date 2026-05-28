/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from "react";
import { apiClient } from "../api/client";
import type { components } from "../api/schema";

export type User = components["schemas"]["UserResponseDTO"];

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signIn: (username: string, password?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrateUser = async () => {
    setLoading(true);
    try {
      const { data, response } = await apiClient.GET("/api/v1/auth/me");
      if (response.ok && data) {
        setCurrentUser(data);
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      console.error("Failed to hydrate user", err);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void hydrateUser();
  }, []);

  const signIn = async (username: string, password?: string) => {
    setLoading(true);
    try {
      const { data, error, response } = await apiClient.POST(
        "/api/v1/auth/login",
        {
          body: { username, password: password ?? "password" },
        },
      );
      if (response.ok && data) {
        setCurrentUser(data);
      } else {
        const errorDetail = (error as { detail?: unknown })?.detail ?? "Login failed";
        throw new Error(
          typeof errorDetail === "string"
            ? errorDetail
            : JSON.stringify(errorDetail),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await apiClient.POST("/api/v1/auth/logout");
      setCurrentUser(null);
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      setLoading(false);
    }
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
