import { NextResponse } from "next/server";

// Mirrors Admin.validate() from the original JavaFX app: a single fixed
// admin account. Override via env vars if you want different credentials.
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const username = (body.username || "").trim();
  const password = (body.password || "").trim();

  if (!username || !password) {
    return NextResponse.json({ error: "Please fill in all fields." }, { status: 400 });
  }

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
}
