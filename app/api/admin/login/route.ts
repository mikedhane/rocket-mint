// app/api/admin/login/route.ts
import { NextResponse } from "next/server";
import { generateToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { password } = await req.json();

    // Check password against environment variable
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    if (password === adminPassword) {
      // Generate JWT token
      const token = generateToken({ authenticated: true });

      console.log("Login successful - JWT generated");
      return NextResponse.json({ success: true, token });
    }

    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
