"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body style={{ margin: 0, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0D0F14", color: "#F0EBE0", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ fontSize: 14, color: "#8A90A4", marginBottom: 20 }}>The app hit an unexpected error.</p>
          <button onClick={reset} style={{ padding: "10px 20px", borderRadius: 12, border: "none", color: "#fff", background: "#D4872C", cursor: "pointer" }}>Reload</button>
        </div>
      </body>
    </html>
  );
}
