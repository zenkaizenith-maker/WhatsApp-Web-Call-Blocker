let settings = {
    enabled: true,
    mode: "everyone",
    autoDecline: false,
    blockedContacts: []
};

let callDetected = false;
let currentCaller = "";
let declineAttempted = false;


// --------------------------------------------------
// LOAD SETTINGS
// --------------------------------------------------

chrome.storage.local.get(
    [
        "enabled",
        "mode",
        "autoDecline",
        "blockedContacts"
    ],
    (result) => {

        settings.enabled =
            result.enabled ?? true;

        settings.mode =
            result.mode ?? "everyone";

        settings.autoDecline =
            result.autoDecline ?? false;

        settings.blockedContacts =
            result.blockedContacts ?? [];

        checkForCall();
    }
);


// --------------------------------------------------
// SETTINGS CHANGED
// --------------------------------------------------

chrome.storage.onChanged.addListener((changes) => {

    if (changes.enabled) {
        settings.enabled =
            changes.enabled.newValue;
    }

    if (changes.mode) {
        settings.mode =
            changes.mode.newValue;
    }

    if (changes.autoDecline) {
        settings.autoDecline =
            changes.autoDecline.newValue;
    }

    if (changes.blockedContacts) {
        settings.blockedContacts =
            changes.blockedContacts.newValue;
    }

    checkForCall();
});


// --------------------------------------------------
// NORMALIZE CONTACT TEXT
// --------------------------------------------------

function normalize(text) {

    if (!text) {
        return "";
    }

    return text
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}


// --------------------------------------------------
// GET PAGE TEXT
// --------------------------------------------------

function getPageText() {

    if (!document.body) {
        return "";
    }

    return document.body.innerText || "";
}


// --------------------------------------------------
// DETECT INCOMING CALL
// --------------------------------------------------

function isIncomingCall() {

    const text = getPageText();

    /*
     * Current WhatsApp Web incoming call interface
     * contains these buttons.
     */

    const hasVoiceCall =
        text.includes("Voice call");

    const hasDecline =
        text.includes("Decline");

    const hasAccept =
        text.includes("Accept");

    return (
        hasVoiceCall &&
        hasDecline &&
        hasAccept
    );
}


// --------------------------------------------------
// TRY TO IDENTIFY CALLER
// --------------------------------------------------

function findCaller() {

    const text = getPageText();

    /*
     * WhatsApp normally places the caller information
     * close to the Voice call interface.
     *
     * We first look for elements containing "Voice call".
     */

    const elements =
        document.querySelectorAll("div");

    for (const element of elements) {

        const elementText =
            element.innerText?.trim();

        if (!elementText) {
            continue;
        }

        if (
            elementText.includes("Voice call") &&
            elementText.length < 500
        ) {

            const lines =
                elementText
                    .split("\n")
                    .map(x => x.trim())
                    .filter(Boolean);

            /*
             * Remove generic call labels.
             */

            const usefulLines =
                lines.filter(line => {

                    const lower =
                        line.toLowerCase();

                    return (
                        lower !== "voice call" &&
                        lower !== "accept" &&
                        lower !== "decline"
                    );
                });

            if (usefulLines.length > 0) {

                return usefulLines[0];
            }
        }
    }

    return "";
}


// --------------------------------------------------
// CHECK WHETHER CALL SHOULD BE BLOCKED
// --------------------------------------------------

function shouldBlockCall(caller) {

    if (!settings.enabled) {
        return false;
    }


    // Block everyone
    if (settings.mode === "everyone") {
        return true;
    }


    // Selected contacts
    if (settings.mode === "selected") {

        const normalizedCaller =
            normalize(caller);

        if (!normalizedCaller) {
            return false;
        }

        return settings.blockedContacts.some(contact => {

            const normalizedContact =
                normalize(contact);

            return (
                normalizedCaller.includes(normalizedContact) ||
                normalizedContact.includes(normalizedCaller)
            );
        });
    }


    return false;
}


// --------------------------------------------------
// FIND DECLINE BUTTON
// --------------------------------------------------

function findDeclineButton() {

    const elements =
        document.querySelectorAll(
            "button, div[role='button']"
        );

    for (const element of elements) {

        const text =
            element.innerText?.trim();

        const aria =
            element.getAttribute("aria-label");

        if (
            text === "Decline" ||
            aria === "Decline"
        ) {

            return element;
        }
    }

    return null;
}


// --------------------------------------------------
// AUTO DECLINE
// --------------------------------------------------

function autoDeclineCall() {

    if (declineAttempted) {
        return;
    }

    const button =
        findDeclineButton();

    if (!button) {
        return;
    }

    declineAttempted = true;

    console.log(
        "[WhatsApp Call Blocker] Auto-declining call."
    );

    button.click();
}


// --------------------------------------------------
// MAIN CALL CHECK
// --------------------------------------------------

function checkForCall() {

    const incoming =
        isIncomingCall();

    if (incoming) {

        if (!callDetected) {

            callDetected = true;
            declineAttempted = false;

            currentCaller =
                findCaller();

            console.log(
                "[WhatsApp Call Blocker] Incoming call:",
                currentCaller
            );
        }


        const block =
            shouldBlockCall(currentCaller);

        if (block) {

            chrome.runtime.sendMessage({
                type: "INCOMING_CALL"
            });


            if (settings.autoDecline) {

                /*
                 * Give WhatsApp a tiny amount of time
                 * to finish rendering its button.
                 */

                setTimeout(
                    autoDeclineCall,
                    150
                );
            }
        }

    } else {

        if (callDetected) {

            callDetected = false;
            currentCaller = "";
            declineAttempted = false;

            chrome.runtime.sendMessage({
                type: "CALL_ENDED"
            });

            console.log(
                "[WhatsApp Call Blocker] Call ended."
            );
        }
    }
}


// --------------------------------------------------
// WATCH WHATSAPP WEB
// --------------------------------------------------

const observer =
    new MutationObserver(() => {

        checkForCall();

    });


function startObserver() {

    if (!document.documentElement) {

        setTimeout(
            startObserver,
            500
        );

        return;
    }

    observer.observe(
        document.documentElement,
        {
            childList: true,
            subtree: true,
            characterData: true
        }
    );
}


startObserver();


// --------------------------------------------------
// BACKUP CHECK
// --------------------------------------------------

setInterval(() => {

    checkForCall();

}, 1000);