import AdminResourcePage from "@/components/admin/AdminResourcePage";

export default function AdminUsersPage() {
  return (
    <AdminResourcePage
      title="Admin users"
      description="Prepare admin roles. Supabase Auth connection is required for real login and permissions."
      tableName="admin_users"
      select="id,email,full_name,role,active,created_at"
      orderBy="created_at"
      searchKeys={["email", "full_name", "role"]}
      setupHint="Create admin_users table from docs/admin-supabase-setup.sql and connect it to Supabase Auth user IDs before enforcing roles."
      fields={[
        { key: "email", label: "Email", type: "email", required: true },
        { key: "full_name", label: "Full name" },
        {
          key: "role",
          label: "Role",
          type: "select",
          options: [
            { label: "Owner", value: "owner" },
            { label: "Admin", value: "admin" },
            { label: "Manager", value: "manager" },
            { label: "Operator", value: "operator" },
          ],
        },
        { key: "active", label: "Active", type: "checkbox" },
      ]}
      columns={[
        { key: "email", label: "Email" },
        { key: "full_name", label: "Name" },
        { key: "role", label: "Role" },
        { key: "active", label: "Status" },
      ]}
    />
  );
}
