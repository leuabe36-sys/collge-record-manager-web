import { NextResponse } from "next/server";
import { updateStudent, deleteStudents } from "../../../../lib/students";
import { validateStudent } from "../../../../lib/validation";

export async function PUT(request, { params }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid student id." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const { error, data } = validateStudent(body);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    await updateStudent({ id, ...data });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Database error: " + err.message }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid student id." }, { status: 400 });
  }

  try {
    await deleteStudents([id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Database error: " + err.message }, { status: 500 });
  }
}
