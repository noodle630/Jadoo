import { createContext, useContext, useState, useEffect } from "react";
const AuthContext = createContext({
    user: null,
    isLoading: true,
    isAuthenticated: false,
});
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        // 🧪 Fake login for dev mode
        setTimeout(() => {
            setUser({
                id: "local-dev",
                email: "dev@local.test",
                name: "Local Dev",
            });
            setIsLoading(false);
        }, 500); // mimic delay
    }, []);
    return (<AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>);
};
export const useAuth = () => useContext(AuthContext);
