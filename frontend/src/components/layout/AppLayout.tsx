
"use client";

import { ReactNode, useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import { useAuth } from "@/hooks/useAuth";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p>Chargement de votre compte...</p>
      </div>
    );
  }

  const role = user?.role ?? null;

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50">
      <Header
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      <div className="flex min-w-0">
        <Sidebar
          role={role}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        <section className="min-w-0 flex-1">
          <main className="p-4 md:p-6 lg:p-8">
            {children}
          </main>
          <Footer />
        </section>
      </div>
    </div>
  );
}