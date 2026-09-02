"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { User } from "@/types/chat";

export const GUEST_USER: User = {
  id: 1,
  name: "Guest",
  email: "guest@safespace.ai",
};

interface AuthContextType {
  user: User;
}

const AuthContext = createContext<AuthContextType>({ user: GUEST_USER });

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={{ user: GUEST_USER }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}