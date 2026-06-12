"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.user) {
      setMessage(error?.message || "Login failed.");
      setLoading(false);
      return;
    }

    const loginResponse = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accessToken: data.session?.access_token }),
    });

    if (!loginResponse.ok) {
      const loginError = (await loginResponse.json().catch(() => null)) as {
        error?: string;
      } | null;
      await supabase.auth.signOut();
      setMessage(loginError?.error || "Your account is not enabled for admin access.");
      setLoading(false);
      return;
    }

    const nextPath =
      new URLSearchParams(window.location.search).get("next") || "/admin";
    router.replace(nextPath.startsWith("/admin") ? nextPath : "/admin");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f4f2] px-4 py-10">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-[30px] border border-white bg-white p-6 shadow-[0_28px_100px_rgba(45,45,45,0.08)]"
      >
        <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#B96C5C]">
          MIO Beauty
        </p>
        <h1 className="mt-3 text-3xl font-bold text-gray-950">
          Admin login
        </h1>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          Sign in with a Supabase Auth account that exists in active
          admin_users.
        </p>

        <label className="mt-6 block">
          <span className="text-sm font-bold text-gray-700">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            className="mt-2 h-12 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none transition focus:border-[#EEA391] focus:ring-4 focus:ring-[#EEA391]/20"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-bold text-gray-700">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
            className="mt-2 h-12 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none transition focus:border-[#EEA391] focus:ring-4 focus:ring-[#EEA391]/20"
          />
        </label>

        {message && (
          <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 h-12 w-full rounded-full bg-[#EEA391] text-sm font-bold text-white shadow-lg shadow-[#EEA391]/25 transition hover:bg-[#df8f7c] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
