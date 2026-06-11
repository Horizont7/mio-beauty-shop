import AdminLayoutShell from "@/components/admin/AdminLayoutShell";
import AdminAuthGuard from "@/components/admin/AdminAuthGuard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthGuard>
      <AdminLayoutShell>{children}</AdminLayoutShell>
    </AdminAuthGuard>
  );
}
