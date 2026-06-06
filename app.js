// app.js — Zyvora Main App Logic
import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection, addDoc, query, where, orderBy,
  onSnapshot, doc, updateDoc, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getUserPlan, getUsageCount, incrementUsage, PLAN_LIMITS } from "./plans.js";

let currentUser = null;
let currentPlan = "free";
let unsubscribeAppts = null;
window.currentAppointments = [];

// ── Auth guard ──────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;

  const name = user.displayName || user.email.split("@")[0];
  const el = document.getElementById("welcomeUser");
  if (el) el.textContent = name;

  const avatar = document.getElementById("userAvatar");
  if (avatar) avatar.textContent = name[0].toUpperCase();

  await refreshPlanUI();
  loadAppointments();
});

// ── Logout ───────────────────────────────────────────────────
document.getElementById("logoutBtn")?.addEventListener("click", () => {
  signOut(auth).then(() => window.location.href = "login.html");
});

// ── Plan / Usage UI ──────────────────────────────────────────
async function refreshPlanUI() {
  try {
    const planData = await getUserPlan(currentUser.uid);
    currentPlan = planData?.plan || "free";
  } catch (e) {
    currentPlan = "free";
  }

  const limit = PLAN_LIMITS[currentPlan] ?? 10;

  const badge = document.getElementById("planBadge");
  if (badge) {
    badge.textContent = currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1);
    badge.className = "plan-badge " + currentPlan;
  }

  let usageCount = 0;
  try {
    usageCount = await getUsageCount(currentUser.uid);
  } catch (e) {
    usageCount = 0;
  }

  const pct = limit === Infinity ? 0 : Math.min((usageCount / limit) * 100, 100);

  const bar = document.getElementById("usageBar");
  const label = document.getElementById("usageLabel");
  if (bar) {
    bar.style.width = pct + "%";
    bar.classList.toggle("danger", pct >= 80);
  }
  if (label) {
    label.textContent = limit === Infinity
      ? usageCount + " appointments booked"
      : usageCount + " / " + limit + " appointments used";
  }

  const chip = document.getElementById("goToPricingChip");
  if (pct >= 80 && chip) chip.style.display = "block";

  const limitBanner = document.getElementById("limitBanner");
  if (limitBanner) {
    limitBanner.style.display = (limit !== Infinity && usageCount >= limit) ? "flex" : "none";
  }

  return { usageCount, limit };
}

// ── Book appointment ─────────────────────────────────────────
document.getElementById("bookBtn")?.addEventListener("click", async () => {
  const name = document.getElementById("clientName")?.value.trim();
  const phone = document.getElementById("phone")?.value.trim();
  const date = document.getElementById("date")?.value;
  const time = document.getElementById("time")?.value;
  const service = document.getElementById("serviceType")?.value;
  const duration = document.getElementById("duration")?.value;
  const notes = document.getElementById("notes")?.value.trim();

  if (!name || !phone || !date || !time) {
    alert("Please fill in Client Name, Phone, Date and Time.");
    return;
  }

  // Check limit
  let usageCount = 0;
  let limit = 10;
  try {
    const result = await refreshPlanUI();
    usageCount = result.usageCount;
    limit = result.limit;
  } catch (e) {}

  if (limit !== Infinity && usageCount >= limit) {
    document.getElementById("upgradeModal").style.display = "flex";
    return;
  }

  const btn = document.getElementById("bookBtn");
  const btnText = document.getElementById("bookBtnText");
  const btnLoader = document.getElementById("bookBtnLoader");
  btn.disabled = true;
  if (btnText) btnText.style.display = "none";
  if (btnLoader) btnLoader.style.display = "inline";

  try {
    const hour = parseInt((time || "0").split(":")[0]);
    const dayOfWeek = new Date(date).getDay();
    const riskLevel = (dayOfWeek === 1 || hour >= 16) ? "high" : "low";

    await addDoc(collection(db, "appointments"), {
      uid: currentUser.uid,
      clientName: name,
      phone,
      date,
      time,
      service: service || "General",
      duration: duration || "60",
      notes: notes || "",
      status: "pending",
      noShowRisk: riskLevel,
      createdAt: Timestamp.now()
    });

    try { await incrementUsage(currentUser.uid); } catch (e) {}

    // Clear form
    document.getElementById("clientName").value = "";
    document.getElementById("phone").value = "";
    document.getElementById("time").value = "";
    document.getElementById("notes").value = "";
    const svc = document.getElementById("serviceType");
    if (svc) svc.value = "";
    document.getElementById("date").valueAsDate = new Date();

    await refreshPlanUI();
  } catch (err) {
    console.error("Booking error:", err);
    alert("Failed to book: " + err.message);
  } finally {
    btn.disabled = false;
    if (btnText) btnText.style.display = "inline";
    if (btnLoader) btnLoader.style.display = "none";
  }
});

// ── Load & render appointments ────────────────────────────────
function loadAppointments() {
  if (unsubscribeAppts) unsubscribeAppts();

  // Use single orderBy on createdAt to avoid needing a composite index
  const q = query(
    collection(db, "appointments"),
    where("uid", "==", currentUser.uid),
    orderBy("createdAt", "desc")
  );

  unsubscribeAppts = onSnapshot(q, (snap) => {
    window.currentAppointments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAppointments();
  }, (err) => {
    console.error("Snapshot error:", err);
    // Fallback: no ordering — works without any index
    const qSimple = query(
      collection(db, "appointments"),
      where("uid", "==", currentUser.uid)
    );
    onSnapshot(qSimple, (snap) => {
      window.currentAppointments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderAppointments();
    }, (e2) => console.error("Fallback error:", e2));
  });
}

function renderAppointments() {
  const container = document.getElementById("appointments");
  if (!container) return;

  const filter = window.currentFilter || "all";
  const today = new Date().toISOString().split("T")[0];

  let list = [...window.currentAppointments];

  if (filter === "upcoming") list = list.filter(a => a.date >= today && a.status !== "cancelled");
  if (filter === "past") list = list.filter(a => a.date < today || a.status === "completed");

  if (!list.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📋</span>
        <p>No appointments here.<br>Book your first one above!</p>
      </div>`;
    return;
  }

  container.innerHTML = list.map(appt => {
    const initials = (appt.clientName || "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    const statusTag = `<span class="tag tag-${appt.status || 'pending'}">${appt.status || 'pending'}</span>`;
    const serviceTag = appt.service ? `<span class="tag tag-service">${appt.service}</span>` : "";
    const riskTag = appt.noShowRisk === "high" ? `<span class="tag tag-risk">⚠ Risk</span>` : "";
    const durationTag = appt.duration ? `<span class="tag tag-service">${appt.duration}min</span>` : "";

    return `
      <div class="appt-card status-${appt.status || 'pending'} ${appt.noShowRisk === 'high' ? 'risk-high' : ''}">
        <div class="appt-avatar">${initials}</div>
        <div class="appt-info">
          <div class="appt-name">${esc(appt.clientName)}</div>
          <div class="appt-meta">
            <span>📅 ${appt.date}</span>
            <span>⏰ ${appt.time}</span>
            <span>📞 ${esc(appt.phone || '')}</span>
          </div>
          ${appt.notes ? `<div class="appt-meta" style="margin-top:4px;font-style:italic;">💬 ${esc(appt.notes)}</div>` : ''}
          <div class="appt-tags">${statusTag}${serviceTag}${durationTag}${riskTag}</div>
        </div>
        <div class="appt-actions">
          ${appt.status === 'pending' ? `<button class="appt-action-btn" onclick="confirmAppt('${appt.id}')">✓ Confirm</button>` : ''}
          ${appt.status === 'confirmed' ? `<button class="appt-action-btn" onclick="completeAppt('${appt.id}')">✔ Done</button>` : ''}
          <button class="appt-action-btn" onclick="generateReminder(${JSON.stringify(appt).replace(/"/g,'&quot;')})">📱 Remind</button>
          <button class="appt-action-btn danger" onclick="cancelAppt('${appt.id}')">✕ Cancel</button>
        </div>
      </div>`;
  }).join("");
}

window.renderAppointments = renderAppointments;

window.confirmAppt = async (id) => {
  await updateDoc(doc(db, "appointments", id), { status: "confirmed" });
};

window.completeAppt = async (id) => {
  await updateDoc(doc(db, "appointments", id), { status: "completed" });
};

window.cancelAppt = async (id) => {
  if (confirm("Cancel this appointment?")) {
    await updateDoc(doc(db, "appointments", id), { status: "cancelled" });
  }
};

function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
