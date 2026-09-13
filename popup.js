const enabled =
    document.getElementById("enabled");

const mode =
    document.getElementById("mode");

const autoDecline =
    document.getElementById("autoDecline");

const contactInput =
    document.getElementById("contactInput");

const addContactButton =
    document.getElementById("addContact");

const contactList =
    document.getElementById("contactList");

const contactsSection =
    document.getElementById("contactsSection");

const status =
    document.getElementById("status");


let blockedContacts = [];


// --------------------------------------------------
// STATUS
// --------------------------------------------------

function updateStatus() {

    if (!enabled.checked) {

        status.textContent =
            "Call blocker: OFF";

        return;
    }

    status.textContent =
        "Call blocker: ON";
}


// --------------------------------------------------
// SHOW / HIDE CONTACTS
// --------------------------------------------------

function updateContactsVisibility() {

    if (mode.value === "selected") {

        contactsSection.classList.remove(
            "hidden"
        );

    } else {

        contactsSection.classList.add(
            "hidden"
        );
    }
}


// --------------------------------------------------
// SAVE SETTINGS
// --------------------------------------------------

function saveSettings() {

    chrome.storage.local.set({

        enabled:
            enabled.checked,

        mode:
            mode.value,

        autoDecline:
            autoDecline.checked,

        blockedContacts:
            blockedContacts

    });

    updateStatus();
}


// --------------------------------------------------
// DISPLAY CONTACTS
// --------------------------------------------------

function renderContacts() {

    contactList.innerHTML = "";

    blockedContacts.forEach(
        (contact, index) => {

            const item =
                document.createElement("div");

            item.className =
                "contact";

            const name =
                document.createElement("span");

            name.textContent =
                contact;

            const remove =
                document.createElement("button");

            remove.textContent =
                "×";

            remove.title =
                "Remove";

            remove.addEventListener(
                "click",
                () => {

                    blockedContacts.splice(
                        index,
                        1
                    );

                    saveSettings();

                    renderContacts();
                }
            );

            item.appendChild(name);
            item.appendChild(remove);

            contactList.appendChild(item);
        }
    );
}


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

    (settings) => {

        enabled.checked =
            settings.enabled ?? true;

        mode.value =
            settings.mode ?? "everyone";

        autoDecline.checked =
            settings.autoDecline ?? false;

        blockedContacts =
            settings.blockedContacts ?? [];

        updateContactsVisibility();

        renderContacts();

        updateStatus();
    }
);


// --------------------------------------------------
// MAIN SWITCH
// --------------------------------------------------

enabled.addEventListener(
    "change",
    saveSettings
);


// --------------------------------------------------
// MODE
// --------------------------------------------------

mode.addEventListener(
    "change",
    () => {

        updateContactsVisibility();

        saveSettings();
    }
);


// --------------------------------------------------
// AUTO DECLINE
// --------------------------------------------------

autoDecline.addEventListener(
    "change",
    saveSettings
);


// --------------------------------------------------
// ADD CONTACT
// --------------------------------------------------

function addContact() {

    const value =
        contactInput.value.trim();

    if (!value) {
        return;
    }


    // Prevent duplicates

    const exists =
        blockedContacts.some(
            contact =>
                contact.toLowerCase() ===
                value.toLowerCase()
        );


    if (exists) {

        contactInput.value = "";

        return;
    }


    blockedContacts.push(value);

    contactInput.value = "";

    saveSettings();

    renderContacts();
}


addContactButton.addEventListener(
    "click",
    addContact
);


contactInput.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Enter") {

            addContact();
        }
    }
);