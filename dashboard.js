// dashboard.js — Business dashboard logic
import { db } from "./firebase.js";
import { requireLogin, logout } from "./auth.js";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Auth guard ────────────────────────────────────────────────────────────────
requireLogin();

// ── DOM refs ──────────────────────────────────────────────────────────────────
const logoutBtn  = document.getElementById("logoutBtn");
const listEl     = document.getElementById("dashboardAppointments");

const stats = {
  total:     document.getElementById("totalAppointments"),
  pending:   document.getElementById("pendingAppointments"),
  confirmed: document.getElementById("confirmedAppointments"),
  completed: document.getElementById("completedAppointments"),
  cancelled: document.getElementById("cancelledAppointments"),
};

logoutBtn.addEventListener("click", logout);

// ── Real-time dashboard feed ──────────────────────────────────────────────────
onSnapshot(collection(db, "appointments"), (snapshot) => {
  const all = [];
  snapshot.forEach(d => all.push({ id: d.id, ...d.data() }));

  // Sort by date + time descending
  all.sort((a, b) => {
    const aKey = (a.date || "") + (a.time || "");
    const bKey = (b.date || "") + (b.time || "");
    return bKey.localeCompare(aKey);
  });

  // Update stat counters
  stats.total.textContent     = all.length;
  stats.pending.textContent   = all.filter(a => a.status === "pending").length;
  stats.confirmed.textContent = all.filter(a => a.status === "confirmed").length;
  stats.completed.textContent = all.filter(a => a.status === "completed").length;
  stats.cancelled.textContent = all.filter(a => a.status === "cancelled").length;

  // Render list
  listEl.innerHTML = "";

  if (all.length === 0) {
    listEl.innerHTML = `<p class="empty-msg">No appointments in the system yet.</p>`;
    return;
  }

  all.forEach(appt => {
    const card = document.createElement("div");
    card.className = "appointment-card";
    card.innerHTML = `
      <div class="appt-info">
        <span class="appt-name">${appt.clientName}</span>
        <span class="appt-phone">📞 ${appt.phone}</span>
        <span class="appt-datetime">📅 ${appt.date} &nbsp;⏰ ${appt.time}</span>
        <span class="appt-bookedby">Booked by: <strong>${appt.bookedBy}</strong></span>
      </div>
      <div class="appt-meta">
        <span class="badge badge-${appt.status}">${appt.status}</span>
        <select class="status-select" data-id="${appt.id}">
          <option value="pending"   ${appt.status === "pending"   ? "selected" : ""}>Pending</option>
          <option value="confirmed" ${appt.status === "confirmed" ? "selected" : ""}>Confirmed</option>
          <option value="completed" ${appt.status === "completed" ? "selected" : ""}>Completed</option>
          <option value="cancelled" ${appt.status === "cancelled" ? "selected" : ""}>Cancelled</option>
        </select>
        <button class="delete-btn" data-id="${appt.id}">✕</button>
      </div>
    `;
    listEl.appendChild(card);
  });

  // Status change handler
  listEl.querySelectorAll(".status-select").forEach(select => {
    select.addEventListener("change", async () => {
      try {
        await updateDoc(doc(db, "appointments", select.dataset.id), {
          status: select.value
        });
      } catch (err) {
        alert("Update failed: " + err.message);
      }
    });
  });

  // Delete handler
  listEl.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (confirm("Delete this appointment permanently?")) {
        try {
          await deleteDoc(doc(db, "appointments", btn.dataset.id));
        } catch (err) {
          alert("Delete failed: " + err.message);
        }
      }
    });
  });
});

// ── Reminder system — alerts for appointments within the next 60 minutes ──────
function startReminderSystem() {
  function check() {
    const now      = new Date();
    const soon     = new Date(now.getTime() + 60 * 60 * 1000);
    const nowStr   = now.toISOString().slice(0, 16).replace("T", " ");
    const soonStr  = soon.toISOString().slice(0, 16).replace("T", " ");

    // Get current snapshot from DOM cards (no extra Firestore call needed)
    const cards = listEl.querySelectorAll(".appointment-card");
    cards.forEach(card => {
      const datetimeEl = card.querySelector(".appt-datetime");
      if (!datetimeEl) return;

      const text = datetimeEl.textContent;
      const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
      const timeMatch = text.match(/(\d{2}:\d{2})/);
      if (!dateMatch || !timeMatch) return;

      const apptKey = `${dateMatch[1]} ${timeMatch[1]}`;
      if (apptKey >= nowStr && apptKey <= soonStr) {
        const name = card.querySelector(".appt-name")?.textContent || "Client";
        console.info(`⏰ Reminder: ${name} has an appointment at ${timeMatch[1]}`);
      }
    });
  }

  check(); // Run once immediately
  setInterval(check, 60_000); // Then every minute
}

startReminderSystem();