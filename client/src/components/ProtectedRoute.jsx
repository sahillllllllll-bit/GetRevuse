import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // 🔥 Handle loading state (VERY important)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <p className="text-blue-600 animate-pulse">Checking session...</p>
      </div>
    );
  }

  // 🔒 Not logged in → go to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}