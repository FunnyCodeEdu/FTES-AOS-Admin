import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./features/auth/LoginPage";
import AdminShell from "./shell/AdminShell";
import { useAuthStore } from "./auth/store";

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.accessToken !== null);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={isAuthenticated ? <AdminShell /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
}
