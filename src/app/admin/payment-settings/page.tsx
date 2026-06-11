import AdminResourcePage from "@/components/admin/AdminResourcePage";

export default function PaymentSettingsPage() {
  return (
    <AdminResourcePage
      title="Payment settings"
      description="Manage cash, card and local payment methods."
      tableName="payment_settings"
      select="id,method_key,method_name,instruction_text,active,created_at"
      orderBy="created_at"
      searchKeys={["method_key", "method_name", "instruction_text"]}
      setupHint="Create payment_settings table from docs/admin-supabase-setup.sql."
      fields={[
        {
          key: "method_key",
          label: "Method key",
          type: "select",
          options: [
            { label: "Cash", value: "cash" },
            { label: "Card", value: "card" },
            { label: "Payme", value: "payme" },
            { label: "Click", value: "click" },
            { label: "Uzum", value: "uzum" },
            { label: "Other", value: "other" },
          ],
        },
        { key: "method_name", label: "Method name", required: true },
        { key: "instruction_text", label: "Instruction text", type: "textarea" },
        { key: "active", label: "Active", type: "checkbox" },
      ]}
      columns={[
        { key: "method_key", label: "Key" },
        { key: "method_name", label: "Name" },
        { key: "instruction_text", label: "Instructions" },
        { key: "active", label: "Status" },
      ]}
    />
  );
}
