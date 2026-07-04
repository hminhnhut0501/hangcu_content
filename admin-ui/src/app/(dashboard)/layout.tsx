import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import DashboardLayout from "../../components/Layout/DashboardLayout";

export default function DashboardRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
}
