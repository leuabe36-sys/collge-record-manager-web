"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const REFRESH_INTERVAL_MS = 3000;

export default function DashboardPage() {
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [form, setForm] = useState({ firstName: "", lastName: "", course: "", gpa: "", age: "" });
  const [status, setStatus] = useState({ text: "", color: "green" });
  const [confirmDelete, setConfirmDelete] = useState(null); // { ids, names }
  const pollRef = useRef(null);

  // Basic client-side guard: bounce back to login if no session marker.
  useEffect(() => {
    if (typeof window !== "undefined" && !sessionStorage.getItem("crm_admin_session")) {
      router.replace("/");
    }
  }, [router]);

  const loadStudents = async (silent = false) => {
    try {
      const res = await fetch("/api/students");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to load students.");
      setStudents(body.students);
      return true;
    } catch (err) {
      if (!silent) {
        setStatus({ text: "Could not connect to database: " + err.message, color: "red" });
      }
      return false;
    }
  };

  useEffect(() => {
    loadStudents();
    pollRef.current = setInterval(() => {
      // Skip the silent poll while something is selected/being edited, so it
      // never clobbers an in-progress edit — same as the JavaFX auto-refresh.
      setSelectedIds((current) => {
        if (current.length === 0) {
          loadStudents(true);
        }
        return current;
      });
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedStudent =
    selectedIds.length === 1 ? students.find((s) => s.id === selectedIds[0]) : null;

  const handleRowClick = (student, e) => {
    const multi = e.ctrlKey || e.metaKey || e.shiftKey;
    setSelectedIds((current) => {
      if (multi) {
        return current.includes(student.id)
          ? current.filter((id) => id !== student.id)
          : [...current, student.id];
      }
      return [student.id];
    });
  };

  useEffect(() => {
    if (selectedStudent) {
      setForm({
        firstName: selectedStudent.firstName,
        lastName: selectedStudent.lastName,
        course: selectedStudent.course,
        gpa: String(selectedStudent.gpa),
        age: String(selectedStudent.age),
      });
      setStatus({ text: "", color: "green" });
    }
  }, [selectedStudent]);

  const clearFields = () => {
    setForm({ firstName: "", lastName: "", course: "", gpa: "", age: "" });
  };

  const handleAdd = async () => {
    setStatus({ text: "", color: "green" });
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) {
        setStatus({ text: body.error, color: "red" });
        return;
      }
      clearFields();
      await loadStudents();
      setStatus({ text: `Student added successfully (ID: ${body.id}).`, color: "green" });
    } catch (err) {
      setStatus({ text: "Error: " + err.message, color: "red" });
    }
  };

  const handleUpdate = async () => {
    setStatus({ text: "", color: "green" });
    if (!selectedStudent) {
      setStatus({ text: "Please select a student from the table to edit.", color: "orange" });
      return;
    }
    try {
      const res = await fetch(`/api/students/${selectedStudent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) {
        setStatus({ text: body.error, color: "red" });
        return;
      }
      setSelectedIds([]);
      clearFields();
      await loadStudents();
      setStatus({ text: "Student updated successfully.", color: "green" });
    } catch (err) {
      setStatus({ text: "Error updating: " + err.message, color: "red" });
    }
  };

  const askDelete = () => {
    setStatus({ text: "", color: "green" });
    if (selectedIds.length === 0) {
      setStatus({ text: "Please select one or more students to delete.", color: "orange" });
      return;
    }
    const names = students
      .filter((s) => selectedIds.includes(s.id))
      .map((s) => `${s.firstName} ${s.lastName}`);
    setConfirmDelete({ ids: selectedIds, names });
  };

  const confirmDeleteNow = async () => {
    if (!confirmDelete) return;
    const { ids } = confirmDelete;
    setConfirmDelete(null);
    try {
      const res = await fetch("/api/students/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const body = await res.json();
      if (!res.ok) {
        setStatus({ text: body.error, color: "red" });
        return;
      }
      setSelectedIds([]);
      clearFields();
      await loadStudents();
      setStatus({
        text: ids.length === 1 ? "Student deleted successfully." : `${ids.length} students deleted successfully.`,
        color: "green",
      });
    } catch (err) {
      setStatus({ text: "Error: " + err.message, color: "red" });
    }
  };

  const handleClear = () => {
    setSelectedIds([]);
    clearFields();
    setStatus({ text: "", color: "green" });
  };

  const handleRefresh = async () => {
    setSelectedIds([]);
    clearFields();
    const ok = await loadStudents();
    if (ok) setStatus({ text: "Refreshed from database.", color: "green" });
  };

  const handleLogout = () => {
    clearInterval(pollRef.current);
    sessionStorage.removeItem("crm_admin_session");
    router.replace("/");
  };

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Student Records (Admin)</h1>
      <p style={{ fontSize: 12, color: "#888", margin: "0 0 16px" }}>
        Click a row to edit. Ctrl/Cmd/Shift-click to select multiple rows to delete.
      </p>

      <div style={{ overflowX: "auto", border: "1px solid #e0e0e0", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#1F3864", color: "white", textAlign: "left" }}>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Course</th>
              <th style={thStyle}>GPA</th>
              <th style={thStyle}>Age</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, idx) => (
              <tr
                key={s.id}
                onClick={(e) => handleRowClick(s, e)}
                style={{
                  cursor: "pointer",
                  background: selectedIds.includes(s.id)
                    ? "#cfe3ff"
                    : idx % 2 === 0
                    ? "#ffffff"
                    : "#f7f9fc",
                }}
              >
                <td style={tdStyle}>{s.id}</td>
                <td style={tdStyle}>{s.firstName} {s.lastName}</td>
                <td style={tdStyle}>{s.course}</td>
                <td style={tdStyle}>{s.gpa.toFixed(2)}</td>
                <td style={tdStyle}>{s.age}</td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td style={tdStyle} colSpan={5}>
                  No students yet — add one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 20 }}>
        <Field label="First Name" value={form.firstName}
               onChange={(v) => setForm({ ...form, firstName: v })} placeholder="First Name" />
        <Field label="Last Name" value={form.lastName}
               onChange={(v) => setForm({ ...form, lastName: v })} placeholder="Last Name" />
        <Field label="GPA" value={form.gpa}
               onChange={(v) => setForm({ ...form, gpa: v })} placeholder="0.0 - 4.0" />
        <Field label="Age" value={form.age}
               onChange={(v) => setForm({ ...form, age: v })} placeholder="18 - 100" />
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Course" value={form.course}
                 onChange={(v) => setForm({ ...form, course: v })} placeholder="Course Name" />
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
        <button onClick={handleAdd} style={{ ...actionButton, background: "#2196F3" }}>Add Student</button>
        <button onClick={handleUpdate} style={{ ...actionButton, background: "#FF9800" }}>Update Selected</button>
        <button onClick={askDelete} style={{ ...actionButton, background: "#f44336" }}>Delete Selected</button>
        <button onClick={handleClear} style={{ ...actionButton, background: "#9e9e9e" }}>Clear Fields</button>
        <button onClick={handleRefresh} style={{ ...actionButton, background: "#607D8B" }}>Refresh</button>
        <div style={{ flex: 1 }} />
        <button onClick={handleLogout} style={{ ...actionButton, background: "#757575" }}>Logout</button>
      </div>

      {status.text && (
        <p style={{ color: status.color, marginTop: 14, fontSize: 13 }}>{status.text}</p>
      )}

      {confirmDelete && (
        <ConfirmDialog
          names={confirmDelete.names}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={confirmDeleteNow}
        />
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 4 }}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "8px 10px",
          fontSize: 14,
          border: "1px solid #ccc",
          borderRadius: 6,
        }}
      />
    </div>
  );
}

function ConfirmDialog({ names, onCancel, onConfirm }) {
  const count = names.length;
  return (
    <div style={overlayStyle}>
      <div style={dialogStyle}>
        <h3 style={{ margin: "0 0 8px" }}>{count === 1 ? "Delete Student" : `Delete ${count} Students`}</h3>
        <p style={{ fontSize: 13, color: "#444" }}>
          {count === 1
            ? `Are you sure you want to delete ${names[0]}?`
            : `Are you sure you want to delete these ${count} students?\n${names.join(", ")}`}
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
          <button onClick={onCancel} style={{ ...actionButton, background: "#9e9e9e" }}>Cancel</button>
          <button onClick={onConfirm} style={{ ...actionButton, background: "#f44336" }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

const thStyle = { padding: "10px 12px", fontWeight: 600, fontSize: 12 };
const tdStyle = { padding: "9px 12px", borderTop: "1px solid #eee" };

const actionButton = {
  padding: "9px 16px",
  border: "none",
  borderRadius: 6,
  color: "white",
  fontSize: 13,
  cursor: "pointer",
};

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const dialogStyle = {
  background: "white",
  borderRadius: 10,
  padding: 20,
  width: 380,
  boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
};
