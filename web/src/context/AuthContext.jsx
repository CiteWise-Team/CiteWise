// import { createContext, useContext, useState } from "react";

// const AuthContext = createContext();

// export function AuthProvider({ children }) {
//   const [user, setUser] = useState(
//     JSON.parse(localStorage.getItem("user"))
//   );

//   const isAuthenticated = !!user;

//   function login(userData, token) {
//     localStorage.setItem("user", JSON.stringify(userData));
//     localStorage.setItem("token", token);
//     setUser(userData);
//   }

//   function logout() {
//     // localStorage.clear();
    
//     localStorage.removeItem("user");
//     localStorage.removeItem("token");
//     setUser(null);
//   }

//   return (
//     <AuthContext.Provider
//       value={{ user, isAuthenticated, login, logout }}
//     >
//       {children}
//     </AuthContext.Provider>
//   );
// }

// export function useAuth() {
//   return useContext(AuthContext);
// }

import { createContext, useContext, useEffect, useState } from "react";
import { clearSession, SESSION_EXPIRED_EVENT } from "../api/http";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Safely initialize user from localStorage
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      console.error("Failed to parse user from localStorage:", error);
      return null;
    }
  });

  const isAuthenticated = !!user;

  function login(userData, token) {
    // if (!userData || !token) {
    //   console.error("Invalid login data, not saving to localStorage");
    //   return;
    // }
    try {
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("token", token);
      setUser(userData);
    } catch (error) {
      console.error("Failed to save user to localStorage:", error);
    }
  }

  function logout() {
    clearSession();
    setUser(null);
  }

  // The HTTP layer clears storage when a token can no longer be refreshed, but
  // `user` also lives in React state, so without this the current tab kept
  // rendering the signed-in navbar (and passing route guards) after the session
  // was already dead.
  useEffect(() => {
    const handleSessionExpired = () => setUser(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, []);

  // CATalyst and CiteWise are served from the same origin and therefore share one
  // session. Signing out in one tab has to sign out the others too, instead of
  // leaving them showing an account that no longer has a token.
  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== null && event.key !== "user" && event.key !== "token") return;

      const token = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");
      if (!token || !savedUser) {
        setUser(null);
        return;
      }
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        setUser(null);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}