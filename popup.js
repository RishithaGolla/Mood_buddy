document.addEventListener('DOMContentLoaded', () => {
    // Cache DOM elements for better performance
    const elements = {
        tabs: document.querySelectorAll('.tab-link'),
        contents: document.querySelectorAll('.tab-content'),
        saveBtn: document.getElementById('saveBtn'),
        emojiButtons: document.querySelectorAll('.emoji'),
        moodText: document.getElementById('moodText'),
        actionText: document.getElementById('actionText'),
        statusDiv: document.getElementById('status'),
        historyList: document.getElementById('historyList'),
        statsDiv: document.getElementById('stats'),
        exportBtn: document.getElementById('exportBtn'),
        clearBtn: document.getElementById('clearBtn'),
        confirmClearModal: document.getElementById('confirmClearModal'),
        confirmDeleteModal: document.getElementById('confirmDeleteModal'),
        enableNotifications: document.getElementById('enableNotifications'),
        advancedSettingsDiv: document.getElementById('advanced-settings'),
        dayToggles: document.querySelectorAll('.day-toggle'),
        startTimeInput: document.getElementById('startTime'),
        endTimeInput: document.getElementById('endTime'),
        intervalSelect: document.getElementById('reminderIntervalInMinutes'),

        settingsStatus: document.getElementById('settingsStatus')
    };
    
    // Destructure for easier access
    const { tabs, contents, saveBtn, emojiButtons, moodText, actionText, statusDiv,
            historyList, statsDiv, exportBtn, clearBtn, confirmClearModal, confirmDeleteModal,
            enableNotifications, advancedSettingsDiv, dayToggles, startTimeInput, endTimeInput,
            intervalSelect, saveSettingsBtn, settingsStatus } = elements;

    let selectedEmoji = null;
    let historyData = [];
    const EMOTION_LABELS = { '😄': 'Happy', '🙂': 'Content', '😐': 'Neutral', '😔': 'Sad', '😡': 'Angry', '😴': 'Tired', '😍': 'Excited', '😰': 'Stressed' };

    // --- Tab Navigation ---
    tabs.forEach((tab, index) => {
        // Add keyboard navigation attributes
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-selected', tab.classList.contains('active'));
        tab.setAttribute('tabindex', tab.classList.contains('active') ? '0' : '-1');
        
        tab.addEventListener('click', () => {
            switchTab(tab);
        });
        
        // Keyboard support for tabs
        tab.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                switchTab(tab);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                const nextIndex = (index + 1) % tabs.length;
                switchTab(tabs[nextIndex]);
                tabs[nextIndex].focus();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                const prevIndex = (index - 1 + tabs.length) % tabs.length;
                switchTab(tabs[prevIndex]);
                tabs[prevIndex].focus();
            }
        });
    });
    
    function switchTab(tab) {
        // Use requestAnimationFrame for smoother transitions
        requestAnimationFrame(() => {
            tabs.forEach(item => {
                item.classList.remove('active');
                item.setAttribute('aria-selected', 'false');
                item.setAttribute('tabindex', '-1');
            });
            contents.forEach(content => content.classList.remove('active'));
            
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            tab.setAttribute('tabindex', '0');
            document.getElementById(tab.dataset.tab).classList.add('active');
            
            if (tab.dataset.tab === 'history') loadHistory();
            if (tab.dataset.tab === 'settings') loadSettings();
        });
    }

    // --- Mood Logging ---
    emojiButtons.forEach((btn, index) => {
        // Add keyboard navigation
        btn.setAttribute('tabindex', '0');
        btn.setAttribute('role', 'button');
        btn.setAttribute('aria-label', `Select ${EMOTION_LABELS[btn.dataset.emoji] || 'mood'} mood`);
        
        btn.addEventListener('click', () => {
            selectEmoji(btn);
        });
        
        // Keyboard support
        btn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectEmoji(btn);
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                const nextIndex = (index + 1) % emojiButtons.length;
                emojiButtons[nextIndex].focus();
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                const prevIndex = (index - 1 + emojiButtons.length) % emojiButtons.length;
                emojiButtons[prevIndex].focus();
            }
        });
    });
    
    function selectEmoji(btn) {
        emojiButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedEmoji = btn.dataset.emoji;
        
        // Add subtle animation feedback
        btn.style.transform = 'scale(1.2)';
        setTimeout(() => {
            btn.style.transform = '';
        }, 150);
    }

    saveBtn.addEventListener('click', () => {
        if (!selectedEmoji) {
            showStatus('Please select a mood emoji.', statusDiv, true);
            return;
        }
        
        // Add loading state
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        saveBtn.style.opacity = '0.7';
        
        const entry = {
            timestamp: new Date().toISOString(),
            emoji: selectedEmoji,
            text: moodText.value.trim(),
            action: actionText.value.trim(),
            label: EMOTION_LABELS[selectedEmoji] || 'Other'
        };
        
        chrome.storage.sync.get({ moodHistory: [] }, data => {
            const history = data.moodHistory;
            history.unshift(entry);
            chrome.storage.sync.set({ moodHistory: history }, () => {
                // Success animation
                saveBtn.style.backgroundColor = 'var(--success-color)';
                saveBtn.textContent = '✓ Saved!';
                
                setTimeout(() => {
                    showStatus('Mood saved successfully!', statusDiv);
                    moodText.value = '';
                    actionText.value = '';
                    emojiButtons.forEach(b => b.classList.remove('selected'));
                    selectedEmoji = null;
                    
                    // Reset button
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Save Mood';
                    saveBtn.style.opacity = '';
                    saveBtn.style.backgroundColor = '';
                }, 800);
            });
        });
    });

    // --- History Management (UPDATED with Edit/Delete) ---
    function loadHistory() {
        // Show loading state
        historyList.innerHTML = '<div class="loading-state">Loading history...</div>';
        
        chrome.storage.sync.get({ moodHistory: [] }, data => {
            historyData = data.moodHistory;
            renderHistory();
        });
    }

    function renderHistory() {
        historyList.innerHTML = '';
        if (historyData.length === 0) {
            historyList.innerHTML = '<li>No moods logged yet.</li>';
            statsDiv.innerHTML = '<strong>Total entries:</strong> 0';
            return;
        }
        const counts = {};
        historyData.forEach(e => {
            const label = e.label || 'Other';
            counts[label] = (counts[label] || 0) + 1;
        });
        
        let statsHtml = `<strong>Total entries:</strong> ${historyData.length}<br>`;
        statsDiv.innerHTML = statsHtml + Object.entries(counts).map(([label, count]) => `${label}: ${count}`).join(' | ');

        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        
        historyData.forEach((entry, index) => {
            const d = new Date(entry.timestamp);
            const li = document.createElement('li');
            li.dataset.index = index;
            li.setAttribute('tabindex', '0');
            li.setAttribute('role', 'article');
            li.setAttribute('aria-label', `Mood entry: ${entry.label} on ${d.toLocaleDateString()}`);
            li.innerHTML = `
                <div class="history-entry-view">
                    <div class="history-entry-header">
                        <span class="emoji">${entry.emoji}</span>
                        <span class="history-entry-label">${entry.label}</span>
                        <div class="history-entry-actions">
                            <button class="button-icon edit-btn" aria-label="Edit this mood entry">Edit</button>
                            <button class="button-icon delete-btn" aria-label="Delete this mood entry">Delete</button>
                        </div>
                        <span class="history-entry-time">${d.toLocaleString()}</span>
                    </div>
                    ${entry.text ? `<div class="history-entry-text">${escapeHtml(entry.text)}</div>` : ''}
                    ${entry.action ? `<div class="history-entry-action">Action: ${escapeHtml(entry.action)}</div>` : ''}
                </div>
                <div class="history-edit-form hidden">
                    <div class="edit-emoji-section">
                        <label class="edit-label">Mood:</label>
                        <div class="edit-emoji-grid">
                            <button class="emoji edit-emoji" data-emoji="😄">😄</button>
                            <button class="emoji edit-emoji" data-emoji="🙂">🙂</button>
                            <button class="emoji edit-emoji" data-emoji="😐">😐</button>
                            <button class="emoji edit-emoji" data-emoji="😔">😔</button>
                            <button class="emoji edit-emoji" data-emoji="😡">😡</button>
                            <button class="emoji edit-emoji" data-emoji="😴">😴</button>
                            <button class="emoji edit-emoji" data-emoji="😍">😍</button>
                            <button class="emoji edit-emoji" data-emoji="😰">😰</button>
                        </div>
                    </div>
                    <textarea class="edit-text" rows="3" placeholder="A few words about your feeling...">${escapeHtml(entry.text)}</textarea>
                    <input type="text" class="edit-action" value="${escapeHtml(entry.action)}" placeholder="A small action..." />
                    <div class="edit-form-actions">
                        <button class="button-secondary cancel-edit-btn">Cancel</button>
                        <button class="button-primary save-edit-btn">Save</button>
                    </div>
                </div>
            `;
            fragment.appendChild(li);
        });
        
        historyList.appendChild(fragment);
    }

    // Use event delegation for all history list actions
    historyList.addEventListener('click', (e) => {
        const target = e.target;
        const li = target.closest('li');
        if (!li) return;
        const index = parseInt(li.dataset.index);

        if (target.classList.contains('edit-btn')) {
            const editForm = li.querySelector('.history-edit-form');
            li.querySelector('.history-entry-view').classList.add('hidden');
            editForm.classList.remove('hidden');
            
            // Set current emoji as selected in edit form
            const currentEmoji = historyData[index].emoji;
            const editEmojis = editForm.querySelectorAll('.edit-emoji');
            editEmojis.forEach(btn => {
                btn.classList.toggle('selected', btn.dataset.emoji === currentEmoji);
            });
        }
        if (target.classList.contains('cancel-edit-btn')) {
            li.querySelector('.history-entry-view').classList.remove('hidden');
            li.querySelector('.history-edit-form').classList.add('hidden');
        }
        if (target.classList.contains('save-edit-btn')) {
            const newText = li.querySelector('.edit-text').value.trim();
            const newAction = li.querySelector('.edit-action').value.trim();
            const selectedEmojiBtn = li.querySelector('.edit-emoji.selected');
            const newEmoji = selectedEmojiBtn ? selectedEmojiBtn.dataset.emoji : historyData[index].emoji;
            
            historyData[index].text = newText;
            historyData[index].action = newAction;
            historyData[index].emoji = newEmoji;
            historyData[index].label = getEmojiLabel(newEmoji);
            saveHistoryAndRerender();
        }
        if (target.classList.contains('delete-btn')) {
            confirmDeleteModal.classList.remove('hidden');
            confirmDeleteModal.dataset.indexToDelete = index;
        }
        if (target.classList.contains('edit-emoji')) {
            // Handle emoji selection in edit form
            const editForm = target.closest('.history-edit-form');
            const editEmojis = editForm.querySelectorAll('.edit-emoji');
            editEmojis.forEach(btn => btn.classList.remove('selected'));
            target.classList.add('selected');
        }
    });
    
    function saveHistoryAndRerender() {
        chrome.storage.sync.set({ moodHistory: historyData }, () => {
            renderHistory();
        });
    }

    function handleDelete(index) {
        historyData.splice(index, 1);
        saveHistoryAndRerender();
        confirmDeleteModal.classList.add('hidden');
    }

    // Modal Handlers
    confirmClearModal.addEventListener('click', (e) => {
        if(e.target.dataset.action === 'close') confirmClearModal.classList.add('hidden');
        if(e.target.dataset.action === 'confirm') {
            historyData = [];
            saveHistoryAndRerender();
            confirmClearModal.classList.add('hidden');
        }
    });
    clearBtn.addEventListener('click', () => confirmClearModal.classList.remove('hidden'));

    confirmDeleteModal.addEventListener('click', (e) => {
        if(e.target.dataset.action === 'close') confirmDeleteModal.classList.add('hidden');
        if(e.target.dataset.action === 'confirm') {
            const index = parseInt(confirmDeleteModal.dataset.indexToDelete);
            handleDelete(index);
        }
    });

    exportBtn.addEventListener('click', () => {
        if (!historyData.length) return;
        const rows = [['timestamp', 'emoji', 'label', 'text', 'action']];
        historyData.forEach(e => rows.push([e.timestamp, e.emoji || '', e.label || '', e.text || '', e.action || '']));
        const csvContent = rows.map(r => r.map(escapeCsv).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mood-history-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    });

    // --- Settings Management ---
    const defaultSettings = { notificationsEnabled: true, reminderIntervalInMinutes: 240, activeDays: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '17:00' };
    function loadSettings() {
        chrome.storage.sync.get({ settings: defaultSettings }, data => {
            const settings = data.settings;
            enableNotifications.checked = settings.notificationsEnabled;
            intervalSelect.value = settings.reminderIntervalInMinutes;
            startTimeInput.value = settings.startTime;
            endTimeInput.value = settings.endTime;
            dayToggles.forEach(btn => {
                btn.classList.toggle('active', settings.activeDays.includes(parseInt(btn.dataset.day)));
            });
            toggleAdvancedSettings();
        });
    }
    function saveSettings() {
        const activeDays = Array.from(dayToggles).filter(btn => btn.classList.contains('active')).map(btn => parseInt(btn.dataset.day));
        const newSettings = {
            notificationsEnabled: enableNotifications.checked,
            reminderIntervalInMinutes: parseInt(intervalSelect.value),
            activeDays: activeDays,
            startTime: startTimeInput.value,
            endTime: endTimeInput.value
        };
        chrome.storage.sync.set({ settings: newSettings }, () => {
            chrome.runtime.sendMessage({ action: "updateAlarm" }, (response) => {
                 if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError.message);
                    showStatus('Error saving settings.', settingsStatus, true);
                 } else {
                    console.log(response?.status);
                    showStatus('Settings saved!', settingsStatus);
                 }
            });
        });
    }
    enableNotifications.addEventListener('change', () => {
        toggleAdvancedSettings();
        autoSaveSettings();
    });
    function toggleAdvancedSettings() {
        advancedSettingsDiv.classList.toggle('hidden', !enableNotifications.checked);
    }
    
    // Auto-save settings when changed
    intervalSelect.addEventListener('change', autoSaveSettings);
    startTimeInput.addEventListener('change', autoSaveSettings);
    endTimeInput.addEventListener('change', autoSaveSettings);
    dayToggles.forEach(btn => btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        autoSaveSettings();
    }));
    
    function autoSaveSettings() {
        // Small delay to ensure UI updates are complete
        setTimeout(() => {
            saveSettings();
        }, 100);
    }

    // --- Utility Functions ---
    function getMoodValue(emoji) {
        // Assign numeric values to emojis for trend analysis (1-5 scale)
        const moodMap = {
            '😄': 5, // Very happy
            '🙂': 4, // Happy
            '😍': 5, // Love/very positive
            '😐': 3, // Neutral
            '😔': 2, // Sad
            '😡': 1, // Angry
            '😰': 1, // Anxious
            '😴': 3  // Tired/neutral
        };
        return moodMap[emoji] || 3; // Default to neutral if emoji not found
    }
    
    function getEmojiLabel(emoji) {
        return EMOTION_LABELS[emoji] || 'Unknown';
    }
    
    function showStatus(text, element, isError = false) {
        element.textContent = text;
        element.style.color = isError ? 'var(--danger-color)' : 'var(--primary-color)';
        element.style.backgroundColor = isError ? 'rgba(244, 67, 54, 0.1)' : 'rgba(76, 175, 80, 0.1)';
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
        
        // Fade out animation
        setTimeout(() => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                element.textContent = '';
                element.style.backgroundColor = '';
                element.style.opacity = '';
                element.style.transform = '';
            }, 300);
        }, 2500);
    }
    function escapeHtml(str) { return (str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
    function escapeCsv(str) {
        if (str == null) return '';
        const s = String(str);
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    }

    // Initial load
    loadHistory();
});

