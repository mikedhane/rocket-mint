"use client";

export default function NetworkTest() {
  return (
    <div style={{ padding: "40px", fontFamily: "monospace" }}>
      <h1>Network Configuration Test</h1>
      <div style={{ marginTop: "20px", padding: "20px", background: "#f5f5f5", borderRadius: "8px" }}>
        <p><strong>NEXT_PUBLIC_SOLANA_NETWORK:</strong></p>
        <pre style={{ background: "#fff", padding: "10px", borderRadius: "4px" }}>
          {process.env.NEXT_PUBLIC_SOLANA_NETWORK || "undefined"}
        </pre>

        <p style={{ marginTop: "20px" }}><strong>Expected:</strong> mainnet-beta</p>
        <p style={{ marginTop: "10px" }}><strong>Status:</strong> {
          process.env.NEXT_PUBLIC_SOLANA_NETWORK === "mainnet-beta"
            ? "✅ Correct"
            : "❌ Wrong - Still showing " + (process.env.NEXT_PUBLIC_SOLANA_NETWORK || "undefined")
        }</p>
      </div>

      <div style={{ marginTop: "20px", padding: "20px", background: "#fff3cd", borderRadius: "8px" }}>
        <p><strong>Instructions:</strong></p>
        <ul>
          <li>If this shows "devnet", your browser has cached the old bundle</li>
          <li>Try opening this page in a new incognito window</li>
          <li>Or wait 1-2 minutes for CDN cache to clear</li>
        </ul>
      </div>
    </div>
  );
}
