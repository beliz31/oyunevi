// ── Firebase SDK (CDN üzerinden yüklenir, kurulum gerekmez) ──
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, get, onValue, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey:            "AIzaSyB6Xq0_T9m91C6ipc9ya3_6ZcX2aLrRpKc",
  authDomain:        "oyunevi-f15d3.firebaseapp.com",
  databaseURL:       "https://oyunevi-f15d3-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "oyunevi-f15d3",
  storageBucket:     "oyunevi-f15d3.firebasestorage.app",
  messagingSenderId: "951375448199",
  appId:             "1:951375448199:web:de5e9f9ae8262574261022"
};

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

// ── Online Sayısı ──
const onlineRef = ref(db, 'online_count');
onValue(onlineRef, (snapshot) => {
  const el = document.getElementById('onlineCount');
  if (!el) return;
  const count = snapshot.val() || 0;
  el.textContent = count + ' kişi';
});

async function incrementOnline() {
  const snap = await get(onlineRef);
  await set(onlineRef, (snap.val() || 0) + 1);
}
async function decrementOnline() {
  const snap = await get(onlineRef);
  const c = snap.val() || 0;
  if (c > 0) await set(onlineRef, c - 1);
}
incrementOnline();
window.addEventListener('beforeunload', decrementOnline);

// ── Modal ──
const overlay   = document.getElementById('modalOverlay');
const createBtn = document.getElementById('createBtn');
const joinBtn   = document.getElementById('joinBtn');
const closeBtn  = document.getElementById('modalClose');

function openModal(mode) {
  document.getElementById('createContent').style.display = mode === 'create' ? 'block' : 'none';
  document.getElementById('joinContent').style.display   = mode === 'join'   ? 'block' : 'none';
  document.getElementById('modalTitle').textContent = mode === 'create' ? 'Oyun Oluştur' : 'Odaya Katıl';
  document.getElementById('modalSub').textContent   = mode === 'create' ? 'Bir oyun seç, oda kodunu paylaş.' : 'Oda kodunu gir ve oyuna katıl.';
  document.getElementById('modalIcon').textContent  = mode === 'create' ? '🎮' : '🔑';
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  overlay.classList.remove('open');
  document.body.style.overflow = '';
  selectedGame = null;
  document.querySelectorAll('.modal-game-item').forEach(el => el.classList.remove('active'));
  ['playerNameCreate','playerNameJoin','roomCodeInput'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

createBtn?.addEventListener('click', () => openModal('create'));
joinBtn?.addEventListener('click',   () => openModal('join'));
closeBtn?.addEventListener('click',  closeModal);
overlay?.addEventListener('click',   (e) => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

// ── Oyun Seçimi ──
let selectedGame = null;
window.selectGame = function(el) {
  document.querySelectorAll('.modal-game-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
  selectedGame = el.dataset.game;
};

// ── Oda Kodu Üret ──
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ── Oda Oluştur ──
window.createRoom = async function() {
  const name = document.getElementById('playerNameCreate').value.trim();
  if (!selectedGame) { alert('Lütfen bir oyun seç!'); return; }
  if (!name)         { alert('Lütfen adını gir!'); return; }
  const code = generateRoomCode();
  await set(ref(db, `rooms/${code}`), {
    game: selectedGame, host: name, createdAt: Date.now(),
    players: { [name]: { name, score: 0, joinedAt: Date.now() } },
    status: 'waiting'
  });
  sessionStorage.setItem('playerName', name);
  sessionStorage.setItem('roomCode', code);
  sessionStorage.setItem('isHost', 'true');
  window.location.href = `games/${selectedGame}.html?room=${code}&name=${encodeURIComponent(name)}&host=1`;
};

// ── Odaya Katıl ──
window.joinRoom = async function() {
  const code = document.getElementById('roomCodeInput').value.trim().toUpperCase();
  const name = document.getElementById('playerNameJoin').value.trim();
  if (code.length !== 6) { alert('Oda kodu 6 haneli olmalı!'); return; }
  if (!name)             { alert('Lütfen adını gir!'); return; }
  const snap = await get(ref(db, `rooms/${code}`));
  if (!snap.exists()) { alert('Oda bulunamadı! Kodu kontrol et.'); return; }
  const room = snap.val();
  await update(ref(db, `rooms/${code}/players`), {
    [name]: { name, score: 0, joinedAt: Date.now() }
  });
  sessionStorage.setItem('playerName', name);
  sessionStorage.setItem('roomCode', code);
  sessionStorage.setItem('isHost', 'false');
  window.location.href = `games/${room.game}.html?room=${code}&name=${encodeURIComponent(name)}&host=0`;
};

// ── Input: büyük harfe çevir ──
const roomInput = document.getElementById('roomCodeInput');
roomInput?.addEventListener('input', () => {
  roomInput.value = roomInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
});
