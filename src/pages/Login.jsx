import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { setToken } from "../utils/auth";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const header = document.querySelector("header");
    const sidebar = document.querySelector(".sidebar");
    if (header) header.style.display = "none";
    if (sidebar) sidebar.style.display = "none";
    return () => {
      if (header) header.style.display = "";
      if (sidebar) sidebar.style.display = "";
    };
  }, []);

  const validate = () => {
    if (!email.trim()) return "Email is required.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Enter a valid email address.";
    if (!password) return "Password is required.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email, password }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        throw new Error("Invalid server response");
      }

      if (!res.ok) throw new Error(data.message || "Login failed");

      if (data.token && data.user) {
        setToken(data.token, data.user, remember);
      }

      navigate("/biblioteca");
    } catch (err) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        maxWidth: 420,
        margin: "48px auto",
        padding: 24,
        borderRadius: 8,
        boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
        fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial",
      }}
    >
      <h2 style={{ margin: 0, marginBottom: 6 }}>Sign in</h2>
      <p style={{ marginTop: 0, marginBottom: 18, color: "#6b7280" }}>
        Enter your credentials to access your account.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="email" style={{ fontSize: 13, color: "#111827" }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 6,
              border: "1px solid #d0d7de",
              marginTop: 6,
              fontSize: 14,
              boxSizing: "border-box",
            }}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label htmlFor="password" style={{ fontSize: 13, color: "#111827" }}>
            Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                paddingRight: 90,
                borderRadius: 6,
                border: "1px solid #d0d7de",
                marginTop: 6,
                fontSize: 14,
                boxSizing: "border-box",
              }}
              placeholder="Your password"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              style={{
                position: "absolute",
                right: 8,
                top: 8,
                padding: "6px 8px",
                borderRadius: 6,
                border: "1px solid #e5e7eb",
                background: "white",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 8,
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span style={{ fontSize: 13, color: "#374151" }}>Remember me</span>
          </label>
          <a
            href="/forgot-password"
            style={{ fontSize: 13, color: "#2563eb", textDecoration: "none" }}
          >
            Forgot password?
          </a>
        </div>

        {error && (
          <div
            role="alert"
            style={{ marginTop: 12, color: "#b91c1c", fontSize: 13 }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 6,
            border: "none",
            background: "#2563eb",
            color: "white",
            fontWeight: 600,
            cursor: "pointer",
            marginTop: 12,
          }}
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => navigate("/signup")}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 6,
          border: "1px solid #2563eb",
          background: "white",
          color: "#2563eb",
          fontWeight: 600,
          cursor: "pointer",
          marginTop: 12,
        }}
      >
        Create Account
      </button>
    </main>
  );
}
