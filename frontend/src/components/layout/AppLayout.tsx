"use client";

import { ReactNode, useState } from "react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import { ToastProvider } from "@/components/ui/ToastProvider";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <ProtectedRoute>
      <ToastProvider>
      <div className="min-h-screen bg-slate-50 lg:flex">
        <Sidebar
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            mobileMenuOpen={mobileMenuOpen}
            setMobileMenuOpen={setMobileMenuOpen}
          />

          <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>

          <Footer />
        </div>
      </div>
      </ToastProvider>
    </ProtectedRoute>
  );
}
