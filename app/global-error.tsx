"use client";

// Last-resort boundary: catches a failure in the root layout itself, where
// even the normal error boundary is inside the broken tree. Shows plain
// words only (docs/00-global.md §6: no raw errors).

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          margin: 0,
          background: "#F7F8FA",
          color: "#101828",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 600, margin: 0 }}>
            PondScale could not start that page
          </h1>
          <p style={{ color: "#475467", marginTop: "8px" }}>
            Nothing was saved. Try again in a moment.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: "20px",
              height: "48px",
              padding: "0 16px",
              border: 0,
              borderRadius: "8px",
              background: "#0B63CE",
              color: "#fff",
              fontSize: "16px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
