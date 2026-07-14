"use client";

import { useState } from "react";

export default function Login() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    try {
      const form = event.currentTarget;
      const formData = new FormData(form);
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password")
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || "Não foi possível entrar.");
        setLoading(false);
        return;
      }

      window.location.reload();
    } catch (err) {
      setError("Não foi possível entrar.");
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-brand">
          <Logo />
          <div>
            <span className="word">verve marketing</span>
            <br />
            <span className="sub">Painel administrativo</span>
          </div>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            <span>E-mail</span>
            <input autoComplete="email" className="form-input" disabled={loading} name="email" required type="email" />
          </label>
          <label>
            <span>Senha</span>
            <input autoComplete="current-password" className="form-input" disabled={loading} name="password" required type="password" />
          </label>
          {error ? <p className="login-error">{error}</p> : null}
          <button className={`btn login-submit ${loading ? "is-loading" : ""}`} disabled={loading} type="submit">
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}

function Logo() {
  return (
    <svg className="mark" height="28" viewBox="0 0 100 100" width="28" aria-hidden="true">
      {[0, 60, 120, 180, 240, 300].map((rotation) => (
        <path d="M47 8 L53 8 L53 38 L47 38 Z" key={rotation} transform={`rotate(${rotation} 50 50)`} />
      ))}
    </svg>
  );
}
