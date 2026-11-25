import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { Navigation } from "@/components/Navigation/Navigation";
import { MatrixBackground } from "@/components/MatrixBackground/MatrixBackground";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthModal } from "@/components/Auth/AuthModal";
import { AppErrorBoundary } from "@/components/common/AppErrorBoundary";
import { useAuthStore } from "@/store/useAuthStore";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

import Home from "@/pages/Home";
import Explorer from "@/pages/Explorer";
import VisualizerPage from "@/pages/Visualizer";
import Playground from "@/pages/Playground";
import GraphBuilder from "@/pages/GraphBuilder";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import Profile from "@/pages/Profile";
import AlgorithmRace from "@/features/comparison/AlgorithmRace";

export default function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <div className="min-h-screen text-[#131B2E] relative" style={{ background: "#FAF8FF" }}>
        {/* Fixed Atmospheric Pastel Ambient Blooms behind frosted glass panels */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
          <div
            className="absolute -top-32 left-[8%] w-[44rem] h-[44rem] rounded-full blur-[110px]"
            style={{ background: "rgba(99, 102, 241, 0.16)" }}
          />
          <div
            className="absolute top-[18%] -right-24 w-[40rem] h-[40rem] rounded-full blur-[120px]"
            style={{ background: "rgba(56, 189, 248, 0.15)" }}
          />
          <div
            className="absolute -bottom-32 left-[24%] w-[42rem] h-[42rem] rounded-full blur-[120px]"
            style={{ background: "rgba(16, 185, 129, 0.10)" }}
          />
        </div>
        <MatrixBackground />
        <Navigation />
        <AuthModal />
        <main className="relative z-10">
          <RoutedContent />
        </main>
      </div>
    </BrowserRouter>
  );
}

function RoutedContent() {
  const location = useLocation();
  return (
    <AppErrorBoundary resetKey={`${location.pathname}${location.search}`}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<Explorer />} />
        <Route path="/explorer" element={<Explorer />} />
        <Route path="/visualizer" element={<VisualizerPage />} />
        <Route path="/visualizer/:id" element={<VisualizerPage />} />
        <Route path="/playground" element={<Playground />} />
        <Route path="/race" element={<AlgorithmRace />} />
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
    </AppErrorBoundary>
  );
}

function NotFound() {
  useDocumentMeta({
    title: "404 — Page Not Found | AlgoLens",
    description: "The requested page does not exist on AlgoLens.",
    canonicalPath: "/",
    noIndex: true,
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="glass-surface rounded-3xl px-10 py-12 max-w-md flex flex-col items-center gap-4">
        <h1 className="text-6xl font-bold text-slate-900">404</h1>
        <p className="text-slate-500 text-sm">The page you are looking for could not be found.</p>
        <Link
          to="/explore"
          className="px-5 py-2.5 rounded-full text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/25 transition-all"
        >
          Browse Algorithms
        </Link>
      </div>
    </div>
  );
}
