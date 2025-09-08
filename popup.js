/* popup.js - Mood Buddy (plain JS)
   Features:
   - emoji selection + custom text + action
   - save to chrome.storage.sync under key 'moodHistory'
   - simple label mapping for emoji -> emotion label
   - history view with counts, export CSV, clear
*/

const emojiButtons = document.querySelectorAll('.emoji');
const moodText = document.getElementById('moodText');
const actionText = document.getElementById('actionText');
const saveBtn = document.getElementById('saveBtn');
const statusDiv = document.getElementById('status');
const viewHistoryBtn = document.getElementById('viewHistoryBtn');

const historyArea = document.getElementById('historyArea');
const historyList = document.getElementById('historyList');
const statsDiv = document.getElementById('stats');
const exportBtn = document.getElementById('exportBtn');
const clearBtn = document.getElementById('clearBtn');
const closeHistoryBtn = document.getElementById('closeHistoryBtn');

let selectedEmoji = null;

/* --- Emotion labeling map (emoji -> human-readable label) --- */
const EMOTION_LABELS = {
  '😄': 'Happy',
  '🙂': 'Content',
  '😐': 'Neutral',
  '😢': 'Sad',
  '😡': 'Angry',
  '😴': 'Tired',
  '😍': 'Excited',
  '😰': 'Stressed'
};

/* --- Emoji click handler --- */
emojiButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    selectedEmoji = btn.dataset.emoji || null;
    emojiButtons.forEach(b => b.classList.remove('selected'));
    if (selectedEmoji) btn.classList.add('selected');
  });
});

/* --- Save Mood --- */
saveBtn.addEventListener('click', () => {
  const entry = {
    timestamp: new Date().toISOString(),
    emoji: selectedEmoji || null,
    text: (moodText.value || '').trim(),
    action: (actionText.value || '').trim(),
    label: selectedEmoji ? (EMOTION_LABELS[selectedEmoji] || 'Other') : null
  };

  chrome.storage.sync.get({ moodHistory: [] }, (data) => {
    const history = data.moodHistory || [];
    history.unshift(entry); // newest first
    chrome.storage.sync.set({ moodHistory: history }, () => {
      showStatus('Saved!');
      // clear inputs
      moodText.value = '';
      actionText.value = '';
      selectedEmoji = null;
      emojiButtons.forEach(b => b.classList.remove('selected'));
      // if history view open, refresh it
      if (!historyArea.classList.contains('hidden')) renderHistory(history);
    });
  });
});

/* --- Simple status feedback --- */
function showStatus(text, timeout = 1500) {
  statusDiv.textContent = text;
  setTimeout(() => statusDiv.textContent = '', timeout);
}

/* --- View History UI toggle --- */
viewHistoryBtn.addEventListener('click', () => {
  chrome.storage.sync.get({ moodHistory: [] }, (data) => {
    const history = data.moodHistory || [];
    renderHistory(history);
    historyArea.classList.remove('hidden');
  });
});

closeHistoryBtn.addEventListener('click', () => {
  historyArea.classList.add('hidden');
});

/* --- Render history list + simple stats --- */
function renderHistory(history) {
  // stats: total and counts per label
  const total = history.length;
  const counts = {};
  history.forEach(e => {
    const label = e.label || (e.text ? 'Text' : 'Unknown');
    counts[label] = (counts[label] || 0) + 1;
  });

  let statsHtml = `<strong>Total entries:</strong> ${total}<br>`;
  for (const [label, count] of Object.entries(counts)) {
    statsHtml += `<span style="margin-right:8px">${label}: ${count}</span>`;
  }
  statsDiv.innerHTML = statsHtml;

  // list items (latest first)
  historyList.innerHTML = '';
  history.forEach(entry => {
    const d = new Date(entry.timestamp);
    const timeStr = d.toLocaleString();
    const emoji = entry.emoji ? `<span style="font-size:18px">${entry.emoji}</span>` : '';
    const label = entry.label ? `<em>${entry.label}</em>` : '';
    const text = entry.text ? `<div>${escapeHtml(entry.text)}</div>` : '';
    const action = entry.action ? `<div class="entry-meta">Action: ${escapeHtml(entry.action)}</div>` : '';
    const li = document.createElement('li');
    li.innerHTML = `
      <div>${emoji} ${label} <div class="entry-meta">${timeStr}</div></div>
      ${text}
      ${action}
    `;
    historyList.appendChild(li);
  });
}

/* --- Export as CSV --- */
exportBtn.addEventListener('click', () => {
  chrome.storage.sync.get({ moodHistory: [] }, (data) => {
    const history = data.moodHistory || [];
    if (!history.length) {
      showStatus('No entries to export', 2000);
      return;
    }

    const rows = [
      ['timestamp', 'emoji', 'label', 'text', 'action']
    ];
    history.forEach(e => {
      rows.push([e.timestamp, e.emoji || '', e.label || '', e.text || '', e.action || '']);
    });

    const csvContent = rows.map(r => r.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mood-history-${(new Date()).toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });
});

/* --- Clear history (dangerous -> confirm) --- */
clearBtn.addEventListener('click', () => {
  if (!confirm('Clear all mood history? This cannot be undone.')) return;
  chrome.storage.sync.set({ moodHistory: [] }, () => {
    renderHistory([]);
    showStatus('History cleared', 1500);
  });
});

/* --- Small helpers --- */
function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, (m) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[m]);
}
function escapeCsv(str) {
  if (str == null) return '';
  const s = String(str);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g,'""')}"`;
  }
  return s;
}

/* On load: nothing special */
