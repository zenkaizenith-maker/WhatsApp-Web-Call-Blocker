let mutedTabs = new Map();

chrome.runtime.onMessage.addListener((message, sender) => {

    if (!sender.tab || !sender.tab.id) {
        return;
    }

    const tabId = sender.tab.id;

    // Incoming call detected
    if (message.type === "INCOMING_CALL") {

        chrome.tabs.get(tabId, (tab) => {

            if (chrome.runtime.lastError || !tab) {
                return;
            }

            // Remember the original mute state
            if (!mutedTabs.has(tabId)) {

                mutedTabs.set(
                    tabId,
                    tab.mutedInfo?.muted ?? false
                );
            }

            // Mute WhatsApp Web
            if (!tab.mutedInfo?.muted) {

                chrome.tabs.update(tabId, {
                    muted: true
                });
            }
        });

        return;
    }


    // Call ended
    if (message.type === "CALL_ENDED") {

        if (!mutedTabs.has(tabId)) {
            return;
        }

        const originalMuteState = mutedTabs.get(tabId);

        chrome.tabs.update(tabId, {
            muted: originalMuteState
        });

        mutedTabs.delete(tabId);

        return;
    }


    // Force unmute
    if (message.type === "RESTORE_AUDIO") {

        if (mutedTabs.has(tabId)) {

            const originalMuteState = mutedTabs.get(tabId);

            chrome.tabs.update(tabId, {
                muted: originalMuteState
            });

            mutedTabs.delete(tabId);
        }
    }
});


// Clean up when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {

    mutedTabs.delete(tabId);

});