// Set default alarm every 8 hours when installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("moodReminder", { periodInMinutes: 480 });
});

// Show notification when alarm triggers
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "moodReminder") {
    chrome.notifications.create({
      type: "basic",
      title: "Mood Buddy 🐢",
      message: "How are you feeling right now?",
      priority: 0
    });
  }
});
