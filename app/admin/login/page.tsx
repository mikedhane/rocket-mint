"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      console.log("Login response:", { ok: res.ok, status: res.status, data });

      if (res.ok && data.success && data.token) {
        // Store JWT token in localStorage
        localStorage.setItem("admin_token", data.token);
        console.log("Token stored, redirecting to /admin");

        // Use window.location instead of router.push to force a full page reload
        window.location.href = "/admin";
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-zinc-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Access</h1>
          <p className="text-zinc-400">Enter password to continue</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-violet-600 focus:outline-none transition"
                required
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/50 px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3 transition"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-zinc-800">
            <button
              onClick={() => router.push("/")}
              className="text-sm text-zinc-400 hover:text-white transition"
            >
              ← Back to home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
