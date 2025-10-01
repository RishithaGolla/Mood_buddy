// --- Constants ---
const SCHEDULER_ALARM_NAME = 'moodBuddyScheduler';
const NOTIFICATION_ID = 'mood-buddy-notification';
const SCHEDULE_PERIOD_MINUTES = 5;

// --- Default Settings ---
const defaultSettings = {
    notificationsEnabled: true,
    reminderIntervalInMinutes: 30, // Reduced from 240 to 30 minutes for more frequent notifications
    activeDays: [1, 2, 3, 4, 5],
    startTime: '09:00',
    endTime: '17:00'
};

/**
 * The core logic. Checks all conditions and shows notification if they are met.
 */
async function checkConditionsAndNotify() {
    console.log('🔍 Checking notification conditions...');
    
    const syncData = await chrome.storage.sync.get({ settings: defaultSettings });
    const localData = await chrome.storage.local.get({ lastNotificationTimestamp: 0 });
    
    const settings = syncData.settings;
    const lastNotificationTime = localData.lastNotificationTimestamp;

    console.log('📋 Current settings:', settings);
    console.log('⏰ Last notification time:', new Date(lastNotificationTime).toLocaleString());

    if (!settings.notificationsEnabled) {
        console.log('❌ Notifications are disabled');
        return;
    }

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);

    console.log('📅 Current day:', currentDay, '(0=Sunday, 1=Monday, etc.)');
    console.log('🕐 Current time:', currentTime);
    console.log('📋 Active days:', settings.activeDays);
    console.log('⏰ Time window:', settings.startTime, '-', settings.endTime);

    const isActiveDay = settings.activeDays.includes(currentDay);
    const isWithinTimeWindow = currentTime >= settings.startTime && currentTime <= settings.endTime;

    console.log('✅ Is active day?', isActiveDay);
    console.log('✅ Is within time window?', isWithinTimeWindow);

    if (!isActiveDay || !isWithinTimeWindow) {
        console.log('❌ Not showing notification: outside active day/time window');
        return;
    }
    
    const intervalMillis = settings.reminderIntervalInMinutes * 60 * 1000;
    const timeSinceLastNotification = now.getTime() - lastNotificationTime;
    
    console.log('⏱️ Interval required (ms):', intervalMillis);
    console.log('⏱️ Time since last notification (ms):', timeSinceLastNotification);
    console.log('⏱️ Minutes since last notification:', Math.round(timeSinceLastNotification / (60 * 1000)));
    
    if (now.getTime() < lastNotificationTime + intervalMillis) {
        console.log('❌ Not showing notification: interval not reached yet');
        return;
    }
    
    // Time to show notification
    console.log('🎉 All conditions met! Showing mood reminder notification');
    
    try {
        // Create notification
        await chrome.notifications.create(NOTIFICATION_ID, {
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Mood Buddy Reminder',
            message: 'Time to log your mood! Click to open the mood tracker.'
        });
        
        console.log('✅ Notification created successfully');
        
        // Update last notification time
        await chrome.storage.local.set({
            lastNotificationTimestamp: now.getTime()
        });
        
        console.log('✅ Last notification timestamp updated');
        
    } catch (error) {
        console.error('❌ Error creating notification:', error);
    }
}

function setupScheduler() {
    console.log('⚙️ Setting up scheduler alarm...');
    try {
        chrome.alarms.create(SCHEDULER_ALARM_NAME, {
            delayInMinutes: 1,
            periodInMinutes: SCHEDULE_PERIOD_MINUTES
        });
        console.log('✅ Scheduler alarm created successfully');
    } catch (error) {
        console.error('❌ Error creating scheduler alarm:', error);
    }
}

/**
 * Show an immediate startup notification for testing
 */
async function showStartupNotification() {
    console.log('🚀 Showing startup notification for immediate testing...');
    try {
        await chrome.notifications.create('startup-notification', {
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Mood Buddy Started',
            message: 'Extension loaded successfully! Notifications are working.'
        });
        console.log('✅ Startup notification created');
    } catch (error) {
        console.error('❌ Error creating startup notification:', error);
    }
}

// --- CHROME API EVENT LISTENERS ---

chrome.runtime.onInstalled.addListener(() => {
    console.log('🔧 Extension installed/updated');
    chrome.storage.sync.set({ settings: defaultSettings });
    setupScheduler();
    
    // Show immediate notification for testing
    setTimeout(() => {
        showStartupNotification();
    }, 2000); // Wait 2 seconds to ensure everything is initialized
});

chrome.alarms.onAlarm.addListener((alarm) => {
    console.log('⏰ Alarm triggered:', alarm.name);
    if (alarm.name === SCHEDULER_ALARM_NAME) {
        checkConditionsAndNotify();
    }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getSettings') {
        getSettings().then(settings => {
            sendResponse(settings);
        });
        return true; // Will respond asynchronously
    } else if (request.action === 'saveSettings') {
        chrome.storage.sync.set(request.settings).then(() => {
            sendResponse({ success: true });
        });
        return true; // Will respond asynchronously
    } else if (request.action === "updateAlarm") {
        checkConditionsAndNotify(); 
        sendResponse({ status: "Scheduler notified of settings change." });
    }
    return true;
});



// Function to get settings
async function getSettings() {
    const result = await chrome.storage.sync.get({ settings: defaultSettings });
    return result.settings;
}

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
    if (notificationId === NOTIFICATION_ID) {
        // Clear the notification
        chrome.notifications.clear(notificationId);
        
        // Create a compact popup window
        chrome.windows.create({
            url: chrome.runtime.getURL('popup.html'),
            type: 'popup',
            width: 340,
            height: 450,
            focused: true
        });
    }
});

