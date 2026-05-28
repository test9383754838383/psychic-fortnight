import React from "react";
import { useCurrentUser } from "./AuthContext";

export const RequireAuth: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading, signIn } = useCurrentUser();

  if (loading) {
    return (
      <div className="app-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <div style={{ color: "var(--text-secondary)", fontSize: "1.2rem" }}>Loading session...</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="error-container">
        <div className="error-card">
          <div className="error-icon" style={{ background: "rgba(56, 189, 248, 0.1)", color: "var(--accent-primary)" }}>🔑</div>
          <h2 className="error-title">Authentication Required</h2>
          <p className="error-message">This zone is guarded. Please log in using the stub interface.</p>
          <button className="btn-retry" onClick={() => void signIn("operator")}>
            Sign In as Operator (Stub)
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
