import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navigation } from "@/components/Navigation/Navigation";
import { MatrixBackground } from "@/components/MatrixBackground/MatrixBackground";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuthStore } from "@/store/useAuthStore";

import Home from "@/pages/Home";
import Explorer from "@/pages/Explorer";
import VisualizerPage from "@/pages/Visualizer";
import Playground from "@/pages/Playground";
import GraphBuilder from "@/pages/GraphBuilder";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import Profile from "@/pages/Profile";

export default function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <div className="min-h-screen text-[#131B2E] relative" style={{ background: "#FAF8FF" }}>
        <MatrixBackground />
        <Navigation />
        <main className="relative z-10">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<Explorer />} />
            <Route path="/visualizer/:id" element={<VisualizerPage />} />
            <Route path="/playground" element={<Playground />} />
            <Route path="/builder" element={<GraphBuilder />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="text-6xl font-bold text-zinc-800">404</div>
      <div className="text-zinc-500">Page not found</div>
    </div>
  );
}
