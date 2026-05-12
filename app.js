// app.js — Appointment booking page logic
import { db } from "./firebase.js";
import { requireLogin, logout } from "./auth.js";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Auth guard ────────────────────────────────────────────────────────────────
const currentUser = requireLogin();

// ── DOM refs ──────────────────────────────────────────────────────────────────
const clientNameEl    = document.getElementById("clientName");
const phoneEl         = document.getElementById("phone");
const dateEl          = document.getElementById("date");
const timeEl          = document.getElementById("time");
const bookBtn         = document.getElementById("bookBtn");
const logoutBtn       = document.getElementById("logoutBtn");
const appointmentsList = document.getElementById("appointments");
const welcomeEl       = document.getElementById("welcomeUser");

if (welcomeEl) welcomeEl.textContent = currentUser;

logoutBtn.addEventListener("click", logout);

// ── Book appointment ──────────────────────────────────────────────────────────
bookBtn.addEventListener("click", async () => {
  const clientName = clientNameEl.value.trim();
  const phone      = phoneEl.value.trim();
  const date       = dateEl.value;
  const time       = timeEl.value;

  if (!clientName || !phone || !date || !time) {
    alert("Please fill in all fields.");
    return;
  }

  bookBtn.disabled     = true;
  bookBtn.textContent  = "Booking…";

  try {
    await addDoc(collection(db, "appointments"), {
      clientName,
      phone,
      date,
      time,
      status:    "pending",
      bookedBy:  currentUser,
      createdAt: serverTimestamp()
    });

    // Clear form
    clientNameEl.value = "";
    phoneEl.value      = "";
    dateEl.value       = "";
    timeEl.value       = "";
  } catch (err) {
    alert("Booking failed: " + err.message);
  } finally {
    bookBtn.disabled    = false;
    bookBtn.textContent = "Book Appointment";
  }
});

// ── Real-time appointments list ───────────────────────────────────────────────
const q = query(
  collection(db, "appointments"),
  where("bookedBy", "==", currentUser)
);

onSnapshot(q, (snapshot) => {
  // Sort client-side to avoid needing a Firestore composite index
  const docs = [];
  snapshot.forEach(d => docs.push({ id: d.id, ...d.data() }));
  docs.sort((a, b) => {
    const aKey = (a.date || "") + (a.time || "");
    const bKey = (b.date || "") + (b.time || "");
    return bKey.localeCompare(aKey);
  });

  appointmentsList.innerHTML = "";

  if (docs.length === 0) {
    appointmentsList.innerHTML = `<p class="empty-msg">No appointments yet. Book your first one above!</p>`;
    return;
  }

  docs.forEach(appt => {
    const card = document.createElement("div");
    card.className = "appointment-card";
    card.innerHTML = `
      <div class="appt-info">
        <span class="appt-name">${appt.clientName}</span>
        <span class="appt-phone">📞 ${appt.phone}</span>
        <span class="appt-datetime">📅 ${appt.date} &nbsp;⏰ ${appt.time}</span>
      </div>
      <div class="appt-meta">
        <span class="badge badge-${appt.status}">${appt.status}</span>
        <button class="delete-btn" data-id="${appt.id}">✕</button>
      </div>
    `;
    appointmentsList.appendChild(card);
  });

  // Delete handlers
  appointmentsList.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (confirm("Delete this appointment?")) {
        try {
          await deleteDoc(doc(db, "appointments", btn.dataset.id));
        } catch (err) {
          alert("Delete failed: " + err.message);
        }
      }
    });
  });
});