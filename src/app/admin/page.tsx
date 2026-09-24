import type { Metadata } from "next";
import { AdminApp } from "@/components/admin/AdminApp";

export const metadata: Metadata = {
  title: "Administración · Misión Representante",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminApp />;
}
