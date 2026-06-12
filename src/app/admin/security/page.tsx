"use client";

import AdminResourcePage from "@/components/admin/AdminResourcePage";

export default function AdminSecurityPage() {
  return (
    <AdminResourcePage
      title="Security"
      description="Review recent authentication, authorization, and rate-limit events."
      tableName="security_audit_logs"
      select="id,event_type,actor_user_id,actor_admin_user_id,resource_type,resource_id,ip_address,user_agent,metadata,created_at"
      orderBy="created_at"
      allowCreate={false}
      allowEdit={false}
      allowDelete={false}
      allowActiveToggle={false}
      searchKeys={["event_type", "actor_user_id", "resource_type", "resource_id", "ip_address"]}
      setupHint="Apply the enterprise security hardening migration and sign in as an owner."
      fields={[
        { key: "event_type", label: "Event type", required: true },
        { key: "resource_type", label: "Resource type" },
        { key: "resource_id", label: "Resource ID" },
        { key: "ip_address", label: "IP address" },
        { key: "user_agent", label: "User agent", type: "textarea" },
      ]}
      columns={[
        { key: "created_at", label: "Time" },
        { key: "event_type", label: "Event" },
        { key: "actor_user_id", label: "Actor" },
        { key: "resource_type", label: "Resource" },
        { key: "ip_address", label: "IP" },
        { key: "user_agent", label: "User agent" },
      ]}
    />
  );
}
