/* DompetKita - logika aplikasi */
'use strict';

const KEYS = { tx: 'dompetkita_txs', budget: 'dompetkita_budget', theme: 'dompetkita_theme', name: 'dompetkita_name', ob: 'dompetkita_ob', backup: 'dompetkita_backup' };
const CATEGORIES = {
  expense: ['Makan & Minum', 'Kebutuhan Pokok', 'Tagihan', 'Transport & Bensin', 'Belanja', 'Hiburan & Lifestyle', 'Investasi / Tabungan', 'Lainnya'],
  income: ['Gaji / Uang Saku', 'Hasil Usaha / Jualan', 'Bonus & Freelance', 'Hadiah / Kiriman', 'Lainnya']
};
const PRESETS = [
  { label: '☕ Ngopi', cat: 'Makan & Minum', desc: 'Ngopi', amount: 20000 },
  { label: '🍜 Makan siang', cat: 'Makan & Minum', desc: 'Makan siang', amount: 25000 },
  { label: '⛽ Bensin', cat: 'Transport & Bensin', desc: 'Bensin motor', amount: 30000 },
  { label: '🅿️ Parkir', cat: 'Transport & Bensin', desc: 'Parkir', amount: 2000 }
];
const COLORS = ['#10b981', '#38bdf8', '#fbbf24', '#fb7185', '#a78bfa', '#f97316', '#2dd4bf', '#94a3b8'];
const $ = id => document.getElementById(id);

/* ---------- Util ---------- */
const pad = n => String(n).padStart(2, '0');
const toDateStr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => toDateStr(new Date());
const rupiah = n => 'Rp ' + Math.round(Number(n)).toLocaleString('id-ID');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const digits = s => String(s).replace(/\D/g, '');
function load(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch (e) { return fallback; } }
function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { toast('Gagal menyimpan, penyimpanan browser penuh atau diblokir'); } }
function formatInput(el) { const d = digits(el.value); el.value = d ? Number(d).toLocaleString('id-ID') : ''; }

/* ---------- State & migrasi data lama ---------- */
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agu', 'sep', 'okt', 'nov', 'des'];
function parseOldDate(s) {
  const m = /(\d+)\s+([a-zA-Z]+)/.exec(String(s));
  const idx = m ? MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()) : -1;
  if (idx < 0) return todayStr();
  const now = new Date();
  const year = idx > now.getMonth() ? now.getFullYear() - 1 : now.getFullYear();
  return `${year}-${pad(idx + 1)}-${pad(Number(m[1]))}`;
}
function normalize(tx, i) {
  return {
    id: tx.id || Date.now() + i + Math.floor(Math.random() * 1000),
    type: tx.type === 'income' ? 'income' : 'expense',
    amount: Math.abs(Number(tx.amount)) || 0,
    category: String(tx.category || 'Lainnya'),
    desc: String(tx.desc || tx.category || ''),
    date: /^\d{4}-\d{2}-\d{2}$/.test(tx.date) ? tx.date : parseOldDate(tx.date)
  };
}
let transactions = load(KEYS.tx, []).filter(t => t && t.amount).map(normalize);
save(KEYS.tx, transactions);
let budget = Number(load(KEYS.budget, 0)) || 1500000;
let userName = load(KEYS.name, '');
let onboarded = load(KEYS.ob, false);
let viewMonth = todayStr().slice(0, 7);
let txType = 'expense', editId = null, armedId = null;

/* ---------- Tab, tema, toast ---------- */
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(e => e.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(e => e.classList.toggle('active', e.dataset.tab === name));
  $('tab' + name).classList.add('active');
  $('monthNav').hidden = name === 'Add';
  window.scrollTo(0, 0);
}
let toastTimer;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200); }
function setTheme(t) { t = t === 'light' ? 'light' : 'dark'; document.documentElement.dataset.theme = t; $('themeBtn').textContent = t === 'dark' ? '🌙' : '☀️'; save(KEYS.theme, t); }

/* ---------- Bulan ---------- */
function shiftMonth(d) {
  const [y, m] = viewMonth.split('-').map(Number);
  const nd = new Date(y, m - 1 + d, 1);
  viewMonth = `${nd.getFullYear()}-${pad(nd.getMonth() + 1)}`;
  render();
}
const monthTx = () => transactions.filter(t => t.date.slice(0, 7) === viewMonth);

/* ---------- Render ---------- */
function render() {
  const [y, m] = viewMonth.split('-').map(Number);
  $('monthLabel').textContent = new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  $('nextMonth').disabled = viewMonth >= todayStr().slice(0, 7);
  $('userPill').textContent = userName ? 'Halo, ' + userName : 'Halo!';
  $('onboard').hidden = onboarded || transactions.length > 0;
  const ml = $('monthLabel').textContent;
  $('heroNote').textContent = `Akumulasi semua bulan. Ringkasan di bawah khusus ${ml.charAt(0).toUpperCase() + ml.slice(1)}.`;
  renderBackupNote();

  const all = transactions.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
  const list = monthTx();
  const income = list.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = list.filter(t => t.type === 'expense');
  const expense = expenses.reduce((s, t) => s + t.amount, 0);

  $('totalBalance').textContent = rupiah(all);
  $('totalIncome').textContent = rupiah(income);
  $('totalExpense').textContent = rupiah(expense);
  renderBudget(expense);
  renderInsight(expenses, expense, y, m);
  renderBreakdown(expenses, expense);
  renderHistory(list);
}

function renderBudget(expense) {
  const raw = Math.round(expense / budget * 100);
  $('budgetValue').textContent = rupiah(budget);
  $('budgetPercent').textContent = raw + '%';
  const fill = $('budgetFill');
  fill.style.width = Math.min(raw, 100) + '%';
  fill.style.background = raw >= 100 ? 'var(--red)' : raw >= 80 ? 'var(--yellow)' : '#34d399';
  const b = $('banner');
  if (raw >= 100) b.innerHTML = `<div class="banner over">Pengeluaran bulan ini sudah melewati limit sebesar ${rupiah(expense - budget)}.</div>`;
  else if (raw >= 80) b.innerHTML = `<div class="banner warn">Pengeluaran sudah ${raw}% dari limit. Sisa ${rupiah(budget - expense)}.</div>`;
  else b.innerHTML = '';
}

function renderInsight(expenses, expense, y, m) {
  const el = $('insight');
  if (!expenses.length) { el.innerHTML = '<p class="empty">Belum ada pengeluaran bulan ini. Catat transaksi pertamamu di tab Catat.</p>'; return; }
  const daysInMonth = new Date(y, m, 0).getDate();
  const isCurrent = viewMonth === todayStr().slice(0, 7);
  const elapsed = isCurrent ? new Date().getDate() : daysInMonth;
  const avg = expense / elapsed;
  const lines = [`Rata-rata pengeluaranmu <strong>${rupiah(avg)}</strong> per hari.`];
  if (isCurrent && elapsed < 7) lines.push('Proyeksi akhir bulan muncul setelah 7 hari pencatatan, supaya hasilnya tidak menyesatkan.');
  if (isCurrent && elapsed >= 7) {
    const projected = avg * daysInMonth;
    lines.push(`Dengan tempo ini, total pengeluaran bulan ini sekitar <strong>${rupiah(projected)}</strong>.`);
    if (expense < budget && projected > budget) lines.push(`Limit diperkirakan habis sekitar <strong>tanggal ${Math.ceil(budget / avg)}</strong>. Kurangi sekitar ${rupiah((projected - budget) / (daysInMonth - elapsed || 1))} per hari agar cukup sampai akhir bulan.`);
    else if (expense < budget) lines.push('Tempo ini masih aman untuk limit bulananmu.');
  }
  const big = expenses.reduce((a, b) => (b.amount > a.amount ? b : a));
  lines.push(`Pengeluaran terbesar: <strong>${esc(big.desc)}</strong> (${rupiah(big.amount)}).`);
  el.innerHTML = lines.map(l => `<p>${l}</p>`).join('');
}

function renderBreakdown(expenses, expense) {
  const el = $('breakdown');
  if (!expenses.length) { el.innerHTML = '<p class="empty">Rincian per kategori muncul setelah ada pengeluaran.</p>'; return; }
  const totals = {};
  expenses.forEach(t => { totals[t.category] = (totals[t.category] || 0) + t.amount; });
  el.innerHTML = Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([cat, sum], i) => {
    const pct = Math.round(sum / expense * 100);
    return `<div class="cat-row"><div class="cat-top"><span>${esc(cat)}</span><span>${rupiah(sum)} (${pct}%)</span></div>
      <div class="cat-bar"><div style="width:${pct}%;background:${COLORS[i % COLORS.length]}"></div></div></div>`;
  }).join('');
}

function renderHistory(list) {
  const q = $('searchInput').value.trim().toLowerCase();
  const shown = list.filter(t => !q || (t.desc + ' ' + t.category).toLowerCase().includes(q))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  $('txCount').textContent = shown.length + ' transaksi';
  $('txList').innerHTML = shown.length ? shown.map(t => {
    const d = new Date(t.date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    return `<li class="tx-item"><div class="tx-info"><strong>${esc(t.desc)}</strong><span>${esc(t.category)} - ${d}</span></div>
      <div class="tx-side"><span class="tx-sum ${t.type}">${t.type === 'income' ? '+' : '-'} ${rupiah(t.amount)}</span>
      <div class="tx-actions"><button data-edit="${t.id}">Ubah</button><button class="del ${armedId === t.id ? 'armed' : ''}" data-del="${t.id}">${armedId === t.id ? 'Yakin hapus?' : 'Hapus'}</button></div></div></li>`;
  }).join('') : `<li class="empty">${q ? 'Tidak ada transaksi yang cocok.' : 'Belum ada transaksi di bulan ini.'}</li>`;
}

/* ---------- Form transaksi ---------- */
function setType(type) {
  txType = type;
  $('segExpense').classList.toggle('active', type === 'expense');
  $('segIncome').classList.toggle('active', type === 'income');
  $('txCategory').innerHTML = CATEGORIES[type].map(c => `<option>${esc(c)}</option>`).join('');
}
function resetForm() {
  editId = null; setType('expense');
  $('txAmount').value = ''; $('txDesc').value = ''; $('txDate').value = todayStr(); $('txDate').max = todayStr();
  $('formError').textContent = ''; $('formTitle').textContent = 'Catat transaksi';
  $('saveTx').textContent = 'Simpan transaksi'; $('cancelEdit').hidden = true;
}
function applyPreset(p) {
  setType('expense');
  $('txCategory').value = p.cat; $('txDesc').value = p.desc; $('txAmount').value = p.amount.toLocaleString('id-ID');
  $('txAmount').focus(); $('txAmount').select();
}
function saveTx() {
  const amount = Number(digits($('txAmount').value));
  const date = $('txDate').value;
  const err = $('formError');
  if (!amount) { err.textContent = 'Isi nominal lebih dari 0.'; $('txAmount').focus(); return; }
  if (!date) { err.textContent = 'Pilih tanggal transaksi.'; return; }
  const category = $('txCategory').value;
  const tx = { id: editId || Date.now(), type: txType, amount, category, desc: $('txDesc').value.trim() || category, date };
  const wasEdit = editId !== null;
  transactions = wasEdit ? transactions.map(t => (t.id === editId ? tx : t)) : [tx, ...transactions];
  save(KEYS.tx, transactions);
  viewMonth = date.slice(0, 7);
  resetForm(); render(); switchTab('History');
  toast(wasEdit ? 'Perubahan disimpan' : 'Transaksi disimpan');
}
function startEdit(id) {
  const t = transactions.find(x => x.id === id); if (!t) return;
  setType(t.type);
  $('txCategory').innerHTML = [...new Set([...CATEGORIES[t.type], t.category])].map(c => `<option>${esc(c)}</option>`).join('');
  $('txCategory').value = t.category; $('txAmount').value = t.amount.toLocaleString('id-ID');
  $('txDesc').value = t.desc; $('txDate').value = t.date; editId = id;
  $('formTitle').textContent = 'Ubah transaksi'; $('saveTx').textContent = 'Simpan perubahan'; $('cancelEdit').hidden = false;
  switchTab('Add');
}
function deleteTx(id) {
  if (armedId !== id) { armedId = id; renderHistory(monthTx()); setTimeout(() => { if (armedId === id) { armedId = null; renderHistory(monthTx()); } }, 3000); return; }
  armedId = null; transactions = transactions.filter(t => t.id !== id);
  save(KEYS.tx, transactions); render(); toast('Transaksi dihapus');
}

/* ---------- Cadangan data ---------- */
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
}
function exportCsv() {
  const q = s => '"' + String(s).replace(/"/g, '""') + '"';
  const rows = ['tanggal,tipe,kategori,catatan,nominal', ...transactions.map(t => [t.date, t.type === 'income' ? 'pemasukan' : 'pengeluaran', q(t.category), q(t.desc), t.amount].join(','))];
  download('dompetkita-' + todayStr() + '.csv', rows.join('\n'), 'text/csv');
}
function importJson(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(r.result);
      const list = Array.isArray(data) ? data : data.transactions;
      if (!Array.isArray(list)) throw new Error();
      const have = new Set(transactions.map(t => t.id));
      const added = list.filter(t => t && t.amount).map(normalize).filter(t => !have.has(t.id));
      transactions = [...added, ...transactions];
      if (!Array.isArray(data)) {
        if (Number(data.budget) > 0) { budget = Number(data.budget); save(KEYS.budget, budget); }
        if (data.name) { userName = String(data.name).slice(0, 20); save(KEYS.name, userName); $('nameInput').value = userName; }
      }
      onboarded = true; save(KEYS.ob, true);
      save(KEYS.tx, transactions); render();
      toast(added.length + ' transaksi dipulihkan');
    } catch (e) { toast('File tidak valid. Pakai file JSON hasil cadangan DompetKita.'); }
  };
  r.readAsText(file);
}

function exportJson() {
  download('dompetkita-' + todayStr() + '.json', JSON.stringify({ transactions, budget, name: userName }, null, 2), 'application/json');
  save(KEYS.backup, todayStr()); renderBackupNote(); toast('Cadangan diunduh');
}
function renderBackupNote() {
  const last = load(KEYS.backup, '');
  const days = last ? Math.floor((Date.now() - new Date(last + 'T00:00:00')) / 864e5) : null;
  const need = transactions.length >= 5 && (days === null || days > 30);
  $('backupNote').innerHTML = need ? `<div class="banner info">${days === null ? 'Datamu belum pernah dicadangkan.' : 'Sudah ' + days + ' hari sejak cadangan terakhir.'} Simpan cadangan agar catatanmu aman.<button class="btn-small" id="backupNow">Cadangkan sekarang</button></div>` : '';
}
function finishOnboarding(useInput) {
  if (useInput) {
    const n = $('obName').value.trim(), v = Number(digits($('obBudget').value));
    if (n) { userName = n; save(KEYS.name, n); $('nameInput').value = n; }
    if (v) { budget = v; save(KEYS.budget, v); }
  }
  onboarded = true; save(KEYS.ob, true); render();
  if (useInput) toast('Siap! Catat transaksi pertamamu di tab Catat');
}

/* ---------- Event ---------- */
document.querySelectorAll('.nav-item').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
$('themeBtn').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
$('prevMonth').addEventListener('click', () => shiftMonth(-1));
$('nextMonth').addEventListener('click', () => shiftMonth(1));
$('segExpense').addEventListener('click', () => setType('expense'));
$('segIncome').addEventListener('click', () => setType('income'));
$('txAmount').addEventListener('input', e => formatInput(e.target));
$('budgetInput').addEventListener('input', e => formatInput(e.target));
$('saveTx').addEventListener('click', saveTx);
$('cancelEdit').addEventListener('click', () => { resetForm(); switchTab('History'); });
$('searchInput').addEventListener('input', () => renderHistory(monthTx()));
$('saveBudget').addEventListener('click', () => {
  const v = Number(digits($('budgetInput').value));
  if (!v) return toast('Isi limit lebih dari 0');
  budget = v; save(KEYS.budget, v); $('budgetInput').value = ''; render(); toast('Limit diperbarui');
});
$('saveName').addEventListener('click', () => { userName = $('nameInput').value.trim(); save(KEYS.name, userName); render(); toast('Nama disimpan'); });
$('txList').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.edit) startEdit(Number(b.dataset.edit));
  if (b.dataset.del) deleteTx(Number(b.dataset.del));
});
$('exportJson').addEventListener('click', exportJson);
$('backupNote').addEventListener('click', e => { if (e.target.id === 'backupNow') exportJson(); });
$('obBudget').addEventListener('input', e => formatInput(e.target));
$('obSave').addEventListener('click', () => finishOnboarding(true));
$('obSkip').addEventListener('click', () => finishOnboarding(false));
let resetArmed = false;
$('resetAll').addEventListener('click', e => {
  const b = e.currentTarget;
  if (!resetArmed) { resetArmed = true; b.textContent = 'Yakin? Semua data terhapus'; setTimeout(() => { resetArmed = false; b.textContent = 'Hapus semua data'; }, 4000); return; }
  Object.values(KEYS).filter(k => k !== KEYS.theme).forEach(k => localStorage.removeItem(k));
  location.reload();
});
$('exportCsv').addEventListener('click', exportCsv);
$('importBtn').addEventListener('click', () => $('importFile').click());
$('importFile').addEventListener('change', e => { if (e.target.files[0]) importJson(e.target.files[0]); e.target.value = ''; });

/* ---------- Mulai ---------- */
$('presets').innerHTML = PRESETS.map((p, i) => `<button class="chip" data-i="${i}">${p.label}</button>`).join('');
$('presets').addEventListener('click', e => { const b = e.target.closest('button'); if (b) applyPreset(PRESETS[b.dataset.i]); });
$('nameInput').value = userName;
setTheme(document.documentElement.dataset.theme);
resetForm(); render();

/* PWA: aktif hanya saat dibuka lewat http(s) */
if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
