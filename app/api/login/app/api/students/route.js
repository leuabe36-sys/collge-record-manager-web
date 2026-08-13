import { NextResponse } from "next/server";
import { getAllStudents, insertStudent } from "../../../lib/students";
import { validateStudent } from "../../../lib/validation";

export async function GET() {
  try {
    const students = await getAllStudents();
    return NextResponse.json({ students });
  } catch (err) {
    return NextResponse.json({ error: "Database error: " + err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { error, data } = validateStudent(body);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    const id = await insertStudent(data);
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Database error: " + err.message }, { status: 500 });
  }
}
