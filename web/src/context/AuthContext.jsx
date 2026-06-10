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

import { createContext, useContext, useState } from "react";

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
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      setUser(null);
    } catch (error) {
      console.error("Failed to remove user from localStorage:", error);
    }
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}