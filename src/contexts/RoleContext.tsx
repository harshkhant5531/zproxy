import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth, type Role } from "./AuthContext";

interface RoleContextType {
  role: Role;
  setRole: (role: Role) => void;
}

const RoleContext = createContext<RoleContextType>({ role: "student", setRole: () => { } });

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [role, setRole] = useState<Role>("student");

  useEffect(() => {
    if (user?.role) {
      setRole(user.role);
    }
  }, [user]);

  return <RoleContext.Provider value={{ role, setRole }}>{children}</RoleContext.Provider>;
};

export const useRole = () => useContext(RoleContext);
