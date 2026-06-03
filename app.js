/**
 * ================================================================
 * PAPAN JUARA — app.js
 * ================================================================
 * Berisi semua logika aplikasi:
 *   - Konfigurasi (ubah bagian CONFIG)
 *   - Auth admin sederhana
 *   - Fetch data dari Google Sheet
 *   - Render leaderboard (podium + rank list)
 *   - Deteksi perubahan rank + animasi + suara
 *   - Auto-refresh
 *   - Panel Admin (CRUD manual, simpan ke localStorage)
 * ================================================================
 */

/* ================================================================
   BAGIAN 1 — KONFIGURASI
   Ubah nilai-nilai di bawah sesuai kebutuhan Anda
   ================================================================ */

const CONFIG = {
  // ── Nama & tagline event ──────────────────────────────────────
  // Tampil di header leaderboard. Bisa diubah juga dari admin panel.
  eventTitle  : "SMART CHARACTER FESTIVAL",
  eventTagline: "BUDAYA LOKAL DI ERA GLOBAL",

  // ── Google Sheet ──────────────────────────────────────────────
  // Cara mendapatkan SHEET_ID:
  //   Buka Google Sheet Anda → lihat URL:
  //   https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit
  //   Salin bagian [SHEET_ID]
  //
  // Cara publikasikan Sheet:
  //   File → Bagikan → Publikasikan ke web → Pilih sheet → CSV → Publikasikan
  //
  // Nama sheet (tab bawah Google Sheet):
  //   sheetJawara     = nama tab untuk data jawara
  //   sheetPenjelajah = nama tab untuk data penjelajah
  sheetId         : "1fUtVRcYL1x8yDNNucJ6qCVpUqdoty0MB7hTsos2z3ZM",
  sheetJawara     : "Jawara",
  sheetPenjelajah : "Penjelajah",

  // ── Auto-refresh ──────────────────────────────────────────────
  // Interval dalam milidetik (30000 = 30 detik)
  refreshInterval : 30000,

  // ── Jumlah peserta di leaderboard ────────────────────────────
  topN : 10,

  // ── Admin credentials ─────────────────────────────────────────
  // GANTI password ini sebelum deploy!
  // Username dan password disimpan langsung di kode (tidak butuh server)
  adminUser : "GregAdmin",
  adminPass : "papanjuara2025",

  // ── Suara ─────────────────────────────────────────────────────
  // true  = musik latar otomatis diputar saat halaman terbuka
  // false = harus diklik manual
  musicAutoplay : false,
};

/* ================================================================
   BAGIAN 2 — STATE APLIKASI
   Jangan ubah kecuali tahu apa yang Anda lakukan
   ================================================================ */

// Menyimpan data leaderboard saat ini
// Digunakan untuk mendeteksi perubahan rank
const STATE = {
  jawara     : [],   // Array peserta jawara [ {nama, asal, skor} ]
  penjelajah : [],   // Array peserta penjelajah
  prevJawara : [],   // Data sebelumnya (untuk deteksi rank change)
  prevPenjelajah : [],
  musicOn    : CONFIG.musicAutoplay,
  refreshTimer : null,
  isAdmin    : false,
};

/* ================================================================
   BAGIAN 3 — INISIALISASI
   ================================================================ */

/**
 * Dijalankan saat DOM siap.
 * Cek apakah halaman ini index atau admin, lalu inisialisasi sesuai.
 */
document.addEventListener('DOMContentLoaded', () => {
  loadConfig();        // Muat konfigurasi dari localStorage
  spawnParticles();    // Buat partikel dekoratif

  // Inisialisasi hanya untuk halaman index (leaderboard utama)
  if (document.getElementById('board-jawara')) {
    initLeaderboard();
  }
});

/**
 * Inisialisasi khusus admin — dipanggil dari admin.html
 */
function initAdmin() {
  loadConfig();
  checkAdminSession();
  populateAdminForm();
  refreshPreview();
}

/* ================================================================
   BAGIAN 4 — KONFIGURASI PERSISTEN (localStorage)
   ================================================================ */

/**
 * Muat konfigurasi yang disimpan di localStorage.
 * Menimpa nilai default CONFIG jika ada.
 */
function loadConfig() {
  const saved = localStorage.getItem('papanJuaraConfig');
  if (saved) {
    const cfg = JSON.parse(saved);
    Object.assign(CONFIG, cfg);
  }
  // Terapkan ke halaman
  const elTitle   = document.getElementById('event-title');
  const elTagline = document.getElementById('event-tagline');
  if (elTitle)   elTitle.textContent   = CONFIG.eventTitle;
  if (elTagline) elTagline.textContent = CONFIG.eventTagline;
}

/**
 * Simpan konfigurasi ke localStorage.
 * Dipanggil dari admin panel saat klik "Simpan Pengaturan".
 */
function saveConfig() {
  CONFIG.eventTitle    = document.getElementById('cfg-title').value   || CONFIG.eventTitle;
  CONFIG.eventTagline  = document.getElementById('cfg-tagline').value || CONFIG.eventTagline;
  CONFIG.sheetId       = document.getElementById('cfg-sheet-id').value || CONFIG.sheetId;
  CONFIG.refreshInterval = (parseInt(document.getElementById('cfg-refresh').value) || 30) * 1000;

  localStorage.setItem('papanJuaraConfig', JSON.stringify(CONFIG));
  showAdminToast('✅ Pengaturan berhasil disimpan!');
}

/**
 * Isi form admin dengan nilai konfigurasi saat ini
 */
function populateAdminForm() {
  const f = {
    'cfg-title'    : CONFIG.eventTitle,
    'cfg-tagline'  : CONFIG.eventTagline,
    'cfg-sheet-id' : CONFIG.sheetId,
    'cfg-refresh'  : CONFIG.refreshInterval / 1000,
  };
  for (const [id, val] of Object.entries(f)) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }
}

/* ================================================================
   BAGIAN 5 — AUTENTIKASI ADMIN
   ================================================================ */

/**
 * Proses login admin.
 * Kredensial dibandingkan langsung dengan CONFIG (tidak butuh server).
 * Sesi disimpan di sessionStorage agar tidak perlu login ulang selama tab terbuka.
 */
function doLogin() {
  const user = document.getElementById('inp-user').value.trim();
  const pass = document.getElementById('inp-pass').value;
  const errEl = document.getElementById('login-error');

  if (user === CONFIG.adminUser && pass === CONFIG.adminPass) {
    // Simpan sesi
    sessionStorage.setItem('adminLoggedIn', 'true');
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    STATE.isAdmin = true;
    populateAdminTable('jawara');
    populateAdminTable('penjelajah');
    refreshPreview();
  } else {
    errEl.textContent = '❌ Username atau password salah!';
    // Shake animasi
    const box = document.querySelector('.login-box');
    box.style.animation = 'none';
    setTimeout(() => { box.style.animation = 'shake 0.4s ease'; }, 10);
  }
}

/** Cek apakah sudah login di session ini */
function checkAdminSession() {
  if (sessionStorage.getItem('adminLoggedIn') === 'true') {
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    STATE.isAdmin = true;
    populateAdminTable('jawara');
    populateAdminTable('penjelajah');
  }
}

/** Logout admin */
function doLogout() {
  sessionStorage.removeItem('adminLoggedIn');
  STATE.isAdmin = false;
  location.reload();
}

/** Tangani Enter di form login */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && document.getElementById('login-overlay')) {
    const overlay = document.getElementById('login-overlay');
    if (overlay && overlay.style.display !== 'none') doLogin();
  }
});

/* ================================================================
   BAGIAN 6 — FETCH DATA GOOGLE SHEET
   ================================================================ */

/**
 * Buat URL CSV dari Google Sheet.
 * @param {string} sheetName - Nama tab / sheet
 * @returns {string} URL CSV publik
 */
function buildSheetUrl(sheetName) {
  // Format URL publik Google Sheets (CSV)
  return `https://docs.google.com/spreadsheets/d/${CONFIG.sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}

/**
 * Ambil & parse CSV dari Google Sheet.
 * Kolom yang diharapkan (baris 1 = header):
 *   Sheet Jawara     : Nama | Asal | Menang
 *   Sheet Penjelajah : Nama | Asal | IkutLomba
 *
 * @param {string} sheetName - Nama tab Google Sheet
 * @returns {Promise<Array>} Array of objects {nama, asal, skor}
 */
async function fetchSheetData(sheetName) {
  const url = buildSheetUrl(sheetName);
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  return parseCSV(text);
}

/**
 * Parse teks CSV menjadi array of objects.
 * Baris pertama dianggap header → diabaikan.
 * Kolom: [0]=Nama, [1]=Asal, [2]=Skor (angka)
 *
 * @param {string} csv - Isi file CSV
 * @returns {Array<{nama:string, asal:string, skor:number}>}
 */
function parseCSV(csv) {
  const lines = csv.trim().split('\n');
  // Skip baris header (baris pertama)
  return lines.slice(1)
    .map(line => {
      // Hapus tanda kutip yang mungkin ada dari Google Sheets
      const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
      return {
        nama : cols[0] || '',
        asal : cols[1] || '',
        skor : parseInt(cols[2]) || 0,
      };
    })
    // Filter baris kosong
    .filter(r => r.nama !== '')
    // Urutkan dari terbesar
    .sort((a, b) => b.skor - a.skor)
    // Ambil top N
    .slice(0, CONFIG.topN);
}

/* ================================================================
   BAGIAN 7 — DATA MANUAL (localStorage override)
   ================================================================ */

/**
 * Simpan data manual dari tabel admin ke localStorage.
 * Data ini akan dipakai jika Google Sheet tidak terhubung
 * atau admin sengaja override.
 */
function saveManualData() {
  const jawaraData     = readTableData('jawara');
  const penjelajahData = readTableData('penjelajah');
  localStorage.setItem('papanJuaraJawara',     JSON.stringify(jawaraData));
  localStorage.setItem('papanJuaraPenjelajah', JSON.stringify(penjelajahData));
  showAdminToast('✅ Data berhasil disimpan & diterapkan!');
  refreshPreview();
}

/**
 * Baca data dari tabel HTML admin.
 * @param {'jawara'|'penjelajah'} type
 * @returns {Array<{nama, asal, skor}>}
 */
function readTableData(type) {
  const rows = document.querySelectorAll(`#tbody-${type} tr`);
  return Array.from(rows).map(row => {
    const inputs = row.querySelectorAll('input');
    return {
      nama : inputs[0]?.value.trim() || '',
      asal : inputs[1]?.value.trim() || '',
      skor : parseInt(inputs[2]?.value) || 0,
    };
  }).filter(r => r.nama !== '')
    .sort((a, b) => b.skor - a.skor)
    .slice(0, CONFIG.topN);
}

/**
 * Muat data manual dari localStorage ke tabel admin
 * @param {'jawara'|'penjelajah'} type
 */
function populateAdminTable(type) {
  const key  = type === 'jawara' ? 'papanJuaraJawara' : 'papanJuaraPenjelajah';
  const data = JSON.parse(localStorage.getItem(key) || '[]');
  const tbody = document.getElementById(`tbody-${type}`);
  if (!tbody) return;
  tbody.innerHTML = '';
  data.forEach((row, i) => addRow(type, row));
}

/**
 * Tambah baris baru ke tabel admin.
 * @param {'jawara'|'penjelajah'} type
 * @param {{nama,asal,skor}} [data] - Data awal (opsional)
 */
function addRow(type, data = {}) {
  const tbody = document.getElementById(`tbody-${type}`);
  if (!tbody) return;
  const idx = tbody.rows.length + 1;
  const scoreLabel = type === 'jawara' ? 'Jml Point' : 'Jml Point';
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${idx}</td>
    <td><input type="text" value="${data.nama || ''}" placeholder="Nama Peserta" /></td>
    <td><input type="text" value="${data.asal || ''}" placeholder="Kelas" /></td>
    <td><input type="number" value="${data.skor || 0}" min="0" placeholder="${scoreLabel}" /></td>
    <td><button class="tbl-del-btn" onclick="this.closest('tr').remove()">🗑</button></td>
  `;
  tbody.appendChild(tr);
}

/**
 * Reset semua data (hapus dari localStorage & tampilkan konfirmasi).
 */
function resetData() {
  if (!confirm('⚠️ Apakah Anda yakin ingin menghapus SEMUA data leaderboard?')) return;
  localStorage.removeItem('papanJuaraJawara');
  localStorage.removeItem('papanJuaraPenjelajah');
  document.getElementById('tbody-jawara').innerHTML     = '';
  document.getElementById('tbody-penjelajah').innerHTML = '';
  refreshPreview();
  showAdminToast('🗑️ Semua data berhasil direset!');
}

/* ================================================================
   BAGIAN 8 — LOAD DATA (gabungkan Sheet + Manual)
   ================================================================ */

/**
 * Ambil data untuk salah satu papan.
 * Prioritas: Sheet → jika gagal, pakai data manual dari localStorage.
 *
 * @param {'jawara'|'penjelajah'} type
 * @returns {Promise<Array>}
 */
async function loadData(type) {
  const sheetName = type === 'jawara' ? CONFIG.sheetJawara : CONFIG.sheetPenjelajah;
  const localKey  = type === 'jawara' ? 'papanJuaraJawara' : 'papanJuaraPenjelajah';

  // Coba ambil dari Google Sheet
  try {
    if (CONFIG.sheetId && CONFIG.sheetId !== 'GANTI_DENGAN_SHEET_ID_ANDA') {
      const data = await fetchSheetData(sheetName);
      if (data.length > 0) return data;
    }
  } catch (e) {
    console.warn(`[PapanJuara] Gagal fetch sheet (${type}):`, e.message);
  }

  // Fallback ke data manual
  const manual = localStorage.getItem(localKey);
  return manual ? JSON.parse(manual) : [];
}

/* ================================================================
   BAGIAN 9 — RENDER LEADERBOARD
   ================================================================ */

/**
 * Inisialisasi leaderboard: load data, render, mulai auto-refresh
 */
async function initLeaderboard() {
  await refreshLeaderboard();
  scheduleRefresh();

  // Mulai musik jika autoplay aktif
  if (CONFIG.musicAutoplay) {
    setTimeout(() => playBGM(), 1000);
  }
}

/**
 * Refresh kedua papan leaderboard.
 * Deteksi perubahan rank dan tampilkan animasi/notifikasi.
 */
async function refreshLeaderboard() {
  // Update indikator loading
  setRefreshIndicator('loading');

  try {
    const [jawaraData, penjelajahData] = await Promise.all([
      loadData('jawara'),
      loadData('penjelajah'),
    ]);

    // Deteksi perubahan rank sebelum render
    const jawaraChanges     = detectRankChanges(STATE.prevJawara, jawaraData);
    const penjelajahChanges = detectRankChanges(STATE.prevPenjelajah, penjelajahData);

    // Simpan state sebelumnya
    STATE.prevJawara     = [...STATE.jawara];
    STATE.prevPenjelajah = [...STATE.penjelajah];

    // Update state
    STATE.jawara     = jawaraData;
    STATE.penjelajah = penjelajahData;

    // Render ke DOM
    renderBoard('jawara',     jawaraData,     jawaraChanges);
    renderBoard('penjelajah', penjelajahData, penjelajahChanges);

    // Efek rank change (animasi + suara)
    handleRankChanges(jawaraChanges, penjelajahChanges);

    // Update footer
    updateFooter(jawaraData.length + penjelajahData.length);

    setRefreshIndicator('live');
  } catch (e) {
    console.error('[PapanJuara] Error refresh:', e);
    setRefreshIndicator('error');
  }
}

/**
 * Render satu papan leaderboard (podium + list rank 4-10).
 *
 * @param {'jawara'|'penjelajah'} type
 * @param {Array<{nama,asal,skor}>} data - Data peserta (sudah diurutkan)
 * @param {Map} changes - Perubahan rank dari detectRankChanges
 */
function renderBoard(type, data, changes) {
  const podiumEl = document.getElementById(`podium-${type}`);
  const listEl   = document.getElementById(`list-${type}`);
  if (!podiumEl || !listEl) return;

  // ── Podium: 3 besar ──
  const top3   = data.slice(0, 3);
   const scoreUnit = type === 'jawara' ? 'Point' : 'Point';

  podiumEl.innerHTML = top3.map((p, i) => {
    const rank   = i + 1;
    const letter = p.nama.charAt(0).toUpperCase();
    const change = changes.get(p.nama);
    return `
      <div class="podium-item rank-${rank}" title="${p.asal}">
        <div class="podium-avatar">${letter}</div>
        <div class="podium-name">${escapeHtml(p.nama)}</div>
        <div class="podium-score">${p.skor} ${scoreUnit}</div>
        <div class="podium-base">#${rank}</div>
      </div>
    `;
  }).join('');

  // ── List: rank 4–10 ──
  const rest = data.slice(3);
  listEl.innerHTML = rest.map((p, i) => {
    const rank     = i + 4;
    const change   = changes.get(p.nama) || 'same';
    const direction = change === 'up' ? 'up' : (change === 'down' ? 'down' : 'same');
    const arrow     = direction === 'up' ? '▲' : (direction === 'down' ? '▼' : '');
    const animate   = type === 'jawara' ? 'slideInLeft' : 'slideInRight';

    return `
      <li class="rank-item ${change !== 'same' ? 'changed' : ''}"
          style="animation: ${animate} ${0.3 + i * 0.07}s var(--ease-bounce) both"
          title="${escapeHtml(p.asal)}">
        <div class="rank-change ${direction}"></div>
        <div class="rank-num">${rank}</div>
        <div class="rank-info">
          <div class="rank-name">${escapeHtml(p.nama)}</div>
          <div class="rank-origin">${escapeHtml(p.asal)}</div>
        </div>
        <div class="rank-score">
          ${p.skor} ${scoreUnit}
          ${arrow ? `<span style="font-size:0.6rem;color:${direction==='up'?'#4CAF50':'#F44336'}">${arrow}</span>` : ''}
        </div>
      </li>
    `;
  }).join('');

  // Efek confetti untuk juara 1 pertama kali tampil
  if (top3.length > 0 && STATE.prevJawara.length === 0 && type === 'jawara') {
    setTimeout(() => fireConfetti(), 800);
  }
}

/* ================================================================
   BAGIAN 10 — DETEKSI PERUBAHAN RANK
   ================================================================ */

/**
 * Bandingkan data lama vs baru dan deteksi perubahan posisi.
 *
 * @param {Array} prev - Data sebelumnya
 * @param {Array} curr - Data saat ini
 * @returns {Map<string, 'up'|'down'|'same'>} Map nama → arah perubahan
 */
function detectRankChanges(prev, curr) {
  const changes = new Map();
  if (prev.length === 0) return changes;

  // Buat index posisi lama (nama → rank lama)
  const prevRanks = new Map();
  prev.forEach((p, i) => prevRanks.set(p.nama, i + 1));

  curr.forEach((p, i) => {
    const currRank = i + 1;
    const prevRank = prevRanks.get(p.nama);
    if (prevRank === undefined)  changes.set(p.nama, 'up');   // peserta baru
    else if (currRank < prevRank) changes.set(p.nama, 'up');
    else if (currRank > prevRank) changes.set(p.nama, 'down');
    else                          changes.set(p.nama, 'same');
  });

  return changes;
}

/**
 * Handle efek dari perubahan rank: toast + suara.
 * @param {Map} jawaraChanges
 * @param {Map} penjelajahChanges
 */
function handleRankChanges(jawaraChanges, penjelajahChanges) {
  const allChanges = [...jawaraChanges.entries(), ...penjelajahChanges.entries()];
  const rankUps   = allChanges.filter(([, dir]) => dir === 'up');
  const rankDowns = allChanges.filter(([, dir]) => dir === 'down');

  if (rankUps.length > 0) {
    playSound('sfx-rank-up');
    // Tampilkan toast untuk peserta yang naik pertama
    const [name] = rankUps[0];
    showRankToast('⬆️', `${name} naik posisi!`);
  } else if (rankDowns.length > 0) {
    playSound('sfx-rank-down');
    const [name] = rankDowns[0];
    showRankToast('⬇️', `${name} turun posisi`);
  }
}

/* ================================================================
   BAGIAN 11 — UI HELPERS
   ================================================================ */

/**
 * Tampilkan toast notifikasi perubahan rank
 * @param {string} icon - Emoji ikon
 * @param {string} msg  - Pesan teks
 */
function showRankToast(icon, msg) {
  const toast   = document.getElementById('rank-toast');
  const iconEl  = document.getElementById('rank-toast-icon');
  const msgEl   = document.getElementById('rank-toast-msg');
  if (!toast) return;

  iconEl.textContent = icon;
  msgEl.textContent  = msg;
  toast.classList.add('show');

  // Hilang setelah 3 detik
  setTimeout(() => toast.classList.remove('show'), 3000);
}

/** Update indikator live/loading/error di header */
function setRefreshIndicator(state) {
  const dot   = document.querySelector('.refresh-dot');
  const label = document.querySelector('.refresh-label');
  if (!dot) return;

  if (state === 'live') {
    dot.style.background = '#4CAF50';
    if (label) label.textContent = 'Live';
  } else if (state === 'loading') {
    dot.style.background = '#FFC107';
    if (label) label.textContent = 'Refresh...';
  } else if (state === 'error') {
    dot.style.background = '#F44336';
    if (label) label.textContent = 'Error';
  }
}

/** Update footer info */
function updateFooter(totalPeserta) {
  const elUpdate  = document.getElementById('last-update');
  const elTotal   = document.getElementById('total-peserta');
  if (elUpdate) {
    const now = new Date();
    elUpdate.textContent = now.toLocaleTimeString('id-ID');
  }
  if (elTotal) elTotal.textContent = totalPeserta;
}

/** Jadwal auto-refresh */
function scheduleRefresh() {
  if (STATE.refreshTimer) clearInterval(STATE.refreshTimer);
  STATE.refreshTimer = setInterval(refreshLeaderboard, CONFIG.refreshInterval);
}

/** Escape HTML untuk keamanan */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ================================================================
   BAGIAN 12 — AUDIO
   ================================================================ */

/** Putar efek suara berdasarkan ID elemen audio */
function playSound(id) {
  try {
    const el = document.getElementById(id);
    if (!el) return;
    el.currentTime = 0;
    el.volume = 0.5;
    el.play().catch(() => {}); // Abaikan error autoplay policy browser
  } catch (e) {}
}

/** Toggle musik latar */
function toggleMusic() {
  const bgm = document.getElementById('bgm-loop');
  const btn = document.getElementById('btn-music');
  if (!bgm) return;

  if (STATE.musicOn) {
    bgm.pause();
    STATE.musicOn = false;
    if (btn) btn.textContent = '🔇';
  } else {
    playBGM();
    STATE.musicOn = true;
    if (btn) btn.textContent = '🎵';
  }
}

/** Mulai putar BGM */
function playBGM() {
  const bgm = document.getElementById('bgm-loop');
  if (!bgm) return;
  bgm.volume = 0.15;
  bgm.play().catch(() => {
    // Browser blokir autoplay → tampilkan petunjuk klik
    console.info('[PapanJuara] Autoplay diblokir browser. Klik tombol musik untuk memutar.');
  });
}

/* ================================================================
   BAGIAN 13 — CONFETTI EFEK JUARA 1
   ================================================================ */

/**
 * Tembakkan confetti ala perayaan untuk juara 1.
 * Menggunakan library canvas-confetti (dimuat di index.html)
 */
function fireConfetti() {
  if (typeof confetti === 'undefined') return;

  // Tembakan pertama: banyak warna emas & merah
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.6 },
    colors: ['#F5C842', '#FFE68A', '#9B1B30', '#1A6B4A', '#FDF3DC'],
    scalar: 1.2,
  });

  // Tembakan kedua setelah 600ms: dari kiri & kanan
  setTimeout(() => {
    confetti({ particleCount: 60, angle: 60,  spread: 55, origin: { x: 0 }, colors: ['#F5C842','#9B1B30'] });
    confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#1A6B4A','#FFE68A'] });
  }, 600);

  // Bunyikan sfx
  playSound('sfx-confetti');
}

/* ================================================================
   BAGIAN 14 — PARTIKEL DEKORATIF
   ================================================================ */

/**
 * Buat elemen partikel dekoratif (daun, kipas, bintang)
 * yang melayang di background
 */
function spawnParticles() {
  const container = document.getElementById('particles');
  if (!container) return;

  // Ikon dekoratif khas Indonesia
  const icons = ['🍃', '🌺', '✨', '🌸', '🎋', '⭐', '🌿', '💫'];
  const count = 18;

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'particle';
    el.textContent = icons[Math.floor(Math.random() * icons.length)];

    // Posisi acak
    el.style.left     = `${Math.random() * 100}%`;
    el.style.fontSize = `${0.8 + Math.random() * 1.2}rem`;

    // Durasi & delay acak agar tidak sinkron
    const duration = 12 + Math.random() * 18;
    const delay    = Math.random() * 20;
    el.style.animationDuration = `${duration}s`;
    el.style.animationDelay   = `${delay}s`;

    container.appendChild(el);
  }
}

/* ================================================================
   BAGIAN 15 — ADMIN: TAB & STATUS
   ================================================================ */

/**
 * Switch tab di admin panel (Jawara / Penjelajah)
 * @param {'tab-jawara'|'tab-penjelajah'} tabId
 */
function switchTab(tabId) {
  // Nonaktifkan semua tab & konten
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  // Aktifkan yang dipilih
  document.getElementById(tabId).classList.add('active');
  // Cari tombol tab yang sesuai
  const tabBtns = document.querySelectorAll('.tab');
  tabBtns.forEach(btn => {
    if (btn.getAttribute('onclick').includes(tabId)) btn.classList.add('active');
  });
}

/**
 * Test koneksi ke Google Sheet
 */
async function testConnection() {
  const dot = document.querySelector('.status-dot');
  const msg = document.getElementById('conn-msg');
  if (!dot || !msg) return;

  dot.className = 'status-dot loading';
  msg.textContent = 'Menghubungkan...';

  try {
    const data = await fetchSheetData(CONFIG.sheetJawara);
    dot.className = 'status-dot ok';
    msg.textContent = `✅ Terhubung! ${data.length} baris ditemukan di sheet "${CONFIG.sheetJawara}"`;
    refreshPreview();
  } catch (e) {
    dot.className = 'status-dot error';
    msg.textContent = `❌ Gagal: ${e.message}. Pastikan Sheet sudah dipublikasikan ke web sebagai CSV.`;
  }
}

/**
 * Refresh preview di admin panel
 */
async function refreshPreview() {
  const [jawaraData, penjelajahData] = await Promise.all([
    loadData('jawara'),
    loadData('penjelajah'),
  ]);

  const elJ = document.getElementById('preview-jawara');
  const elP = document.getElementById('preview-penjelajah');

  if (elJ) {
    elJ.innerHTML = jawaraData.length
      ? jawaraData.map((p,i) => `<li><strong>${p.nama}</strong> (${p.asal}) — ${p.skor} Point</li>`).join('')
      : '<li><em>Belum ada data</em></li>';
  }
  if (elP) {
    elP.innerHTML = penjelajahData.length
      ? penjelajahData.map((p,i) => `<li><strong>${p.nama}</strong> (${p.asal}) — ${p.skor} Point</li>`).join('')
      : '<li><em>Belum ada data</em></li>';
  }
}

/**
 * Tampilkan toast notifikasi di admin panel
 * @param {string} msg
 */
function showAdminToast(msg) {
  // Buat elemen toast sederhana jika belum ada
  let toast = document.getElementById('admin-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'admin-toast';
    toast.style.cssText = `
      position:fixed;bottom:2rem;right:2rem;z-index:9999;
      background:linear-gradient(135deg,#2A1000,#4A2000);
      border:1.5px solid var(--gold-dark);border-radius:10px;
      padding:.7rem 1.3rem;color:var(--gold-light);
      font-family:var(--font-ui);font-size:.82rem;
      box-shadow:0 8px 30px rgba(0,0,0,.7);
      opacity:0;transform:translateY(20px);
      transition:all .3s ease;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
  }, 3000);
}

/* ================================================================
   BAGIAN 16 — KEYFRAME TAMBAHAN (inject via JS)
   Beberapa animasi lebih praktis di-inject dari JS
   ================================================================ */

(function injectKeyframes() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shake {
      0%,100% { transform: translateX(0); }
      20%      { transform: translateX(-8px); }
      40%      { transform: translateX(8px); }
      60%      { transform: translateX(-6px); }
      80%      { transform: translateX(6px); }
    }
  `;
  document.head.appendChild(style);
})();
