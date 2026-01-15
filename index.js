/**
 * CT-PressToEdit Extension
 * Provides easy message editing via long-press (desktop) or double-tap (mobile)
 */

// Module name for settings storage - must be unique
const MODULE_NAME = "ct-press-to-edit";

// Default settings
const defaultSettings = Object.freeze({
    enabled: true,
    duration: 300, // Long-press duration for desktop (ms)
    doubleTapSpeed: 300, // Max time between taps for mobile (ms)
});

/**
 * Get or initialize extension settings
 * @returns {object} The extension settings
 */
function getSettings() {
    const { extensionSettings } = SillyTavern.getContext();

    // Initialize settings if they don't exist
    if (!extensionSettings[MODULE_NAME]) {
        extensionSettings[MODULE_NAME] = structuredClone(defaultSettings);
    }

    // Ensure all default keys exist (helpful after updates)
    for (const key of Object.keys(defaultSettings)) {
        if (!Object.hasOwn(extensionSettings[MODULE_NAME], key)) {
            extensionSettings[MODULE_NAME][key] = defaultSettings[key];
        }
    }

    return extensionSettings[MODULE_NAME];
}

/**
 * Save settings to the server
 */
function saveSettings() {
    const { saveSettingsDebounced } = SillyTavern.getContext();
    saveSettingsDebounced();
}

/**
 * Trigger the edit mode for a message
 * @param {HTMLElement} mesElement - The .mes element to edit
 */
function triggerEdit(mesElement) {
    // Check if already in edit mode
    if (document.querySelector(".edit_textarea")) {
        return;
    }

    // Find and click the edit button
    const editButton = mesElement.querySelector(".mes_edit");
    if (editButton) {
        editButton.click();
    }
}

/**
 * Check if device is primarily touch-based
 * @returns {boolean}
 */
function isTouchDevice() {
    return window.matchMedia("(pointer: coarse)").matches;
}

/**
 * Initialize mobile (touch) double-tap handler
 */
function initMobileHandler() {
    const settings = getSettings();
    let lastTap = { time: 0, target: null, x: 0, y: 0 };
    const moveThreshold = 15; // Allow 15px of movement before cancelling

    // Handle touch start - detect double-tap
    document.addEventListener(
        "touchstart",
        function (e) {
            if (!settings.enabled) return;

            // Find the closest .mes_text element
            const mesText = e.target.closest(".mes .mes_text");
            if (!mesText) return;

            const currentTime = Date.now();
            const timeSinceLastTap = currentTime - lastTap.time;
            const touch = e.touches[0];

            // Check if this is a valid double-tap (same element, within time threshold)
            if (
                timeSinceLastTap < settings.doubleTapSpeed &&
                mesText === lastTap.target
            ) {
                // Prevent zoom on double-tap
                e.preventDefault();

                // Get the parent .mes element and trigger edit
                const mesElement = mesText.closest(".mes");
                if (mesElement) {
                    triggerEdit(mesElement);
                }

                // Reset to prevent triple-tap
                lastTap = { time: 0, target: null, x: 0, y: 0 };
            } else {
                // First tap - record for potential double-tap
                lastTap = {
                    time: currentTime,
                    target: mesText,
                    x: touch.clientX,
                    y: touch.clientY,
                };
            }
        },
        { passive: false }
    );

    // Cancel pending double-tap if user scrolls/drags
    document.addEventListener(
        "touchmove",
        function (e) {
            if (!lastTap.target) return;

            const touch = e.touches[0];
            const distance = Math.sqrt(
                Math.pow(touch.clientX - lastTap.x, 2) +
                    Math.pow(touch.clientY - lastTap.y, 2)
            );

            if (distance > moveThreshold) {
                lastTap = { time: 0, target: null, x: 0, y: 0 };
            }
        },
        { passive: true }
    );
}

/**
 * Initialize desktop (mouse) long-press handler
 */
function initDesktopHandler() {
    const settings = getSettings();
    let pressTimer = null;
    let pressTarget = null;

    /**
     * Start the long-press timer
     * @param {MouseEvent} e
     */
    function startPress(e) {
        if (!settings.enabled) return;

        // Ignore right-click
        if (e.button === 2) return;

        // Find the closest .mes_text element
        const mesText = e.target.closest(".mes .mes_text");
        if (!mesText) return;

        pressTarget = mesText;

        pressTimer = window.setTimeout(function () {
            // Don't trigger if user has selected text
            if (window.getSelection().toString()) {
                cancelPress();
                return;
            }

            const mesElement = pressTarget.closest(".mes");
            if (mesElement) {
                triggerEdit(mesElement);
            }
            pressTimer = null;
            pressTarget = null;
        }, settings.duration);
    }

    /**
     * Cancel the long-press timer
     */
    function cancelPress() {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
        pressTarget = null;
    }

    // Event listeners for long-press detection
    document.addEventListener("mousedown", startPress);
    document.addEventListener("mouseup", cancelPress);
    document.addEventListener("mouseleave", cancelPress);
    document.addEventListener("scroll", cancelPress, { passive: true });

    // Cancel on mouse move if moved too far (indicates drag, not press)
    let startX = 0,
        startY = 0;
    const moveThreshold = 10;

    document.addEventListener("mousedown", function (e) {
        startX = e.clientX;
        startY = e.clientY;
    });

    document.addEventListener("mousemove", function (e) {
        if (!pressTimer) return;

        const distance = Math.sqrt(
            Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2)
        );

        if (distance > moveThreshold) {
            cancelPress();
        }
    });
}

/**
 * Create and inject the settings UI panel
 */
function createSettingsUI() {
    const settings = getSettings();
    const isMobile = isTouchDevice();

    const settingsHtml = `
        <div id="ct-press-to-edit-settings" class="ct-press-to-edit-settings">
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b data-i18n="PressToEdit">Press To Edit</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content">
                    <div class="ct-pte-setting-row">
                        <label class="checkbox_label" for="ct_pte_enabled">
                            <input id="ct_pte_enabled" type="checkbox" ${
                                settings.enabled ? "checked" : ""
                            }>
                            <span data-i18n="Enable quick message editing">Enable quick message editing</span>
                        </label>
                    </div>
                    ${
                        isMobile
                            ? `
                        <div class="ct-pte-info">
                            <i class="fa-solid fa-circle-info"></i>
                            <span data-i18n="Double-tap a message to edit. Long-press to select text.">Double-tap a message to edit. Long-press to select text.</span>
                        </div>
                        <div class="ct-pte-setting-row">
                            <label for="ct_pte_doubleTapSpeed" data-i18n="Double-tap speed">Double-tap speed</label>
                            <div class="ct-pte-slider-container">
                                <input id="ct_pte_doubleTapSpeed" type="range" 
                                    value="${settings.doubleTapSpeed}" 
                                    min="150" max="500" step="10">
                                <span id="ct_pte_doubleTapSpeed_value" class="ct-pte-value">${settings.doubleTapSpeed}ms</span>
                            </div>
                        </div>
                    `
                            : `
                        <div class="ct-pte-info">
                            <i class="fa-solid fa-circle-info"></i>
                            <span data-i18n="Long-press a message to edit.">Long-press a message to edit.</span>
                        </div>
                        <div class="ct-pte-setting-row">
                            <label for="ct_pte_duration" data-i18n="Press duration">Press duration</label>
                            <div class="ct-pte-slider-container">
                                <input id="ct_pte_duration" type="range" 
                                    value="${settings.duration}" 
                                    min="200" max="1500" step="50">
                                <span id="ct_pte_duration_value" class="ct-pte-value">${settings.duration}ms</span>
                            </div>
                        </div>
                    `
                    }
                </div>
            </div>
        </div>
    `;

    // Append to extensions settings panel
    const extensionsSettings = document.getElementById("extensions_settings");
    if (extensionsSettings) {
        extensionsSettings.insertAdjacentHTML("beforeend", settingsHtml);
        bindSettingsEvents();
    }
}

/**
 * Bind event handlers for settings UI
 */
function bindSettingsEvents() {
    const settings = getSettings();

    // Enable/disable toggle
    const enabledCheckbox = document.getElementById("ct_pte_enabled");
    if (enabledCheckbox) {
        enabledCheckbox.addEventListener("change", function () {
            settings.enabled = this.checked;
            saveSettings();
        });
    }

    // Duration slider (desktop)
    const durationSlider = document.getElementById("ct_pte_duration");
    const durationValue = document.getElementById("ct_pte_duration_value");
    if (durationSlider && durationValue) {
        durationSlider.addEventListener("input", function () {
            settings.duration = parseInt(this.value, 10);
            durationValue.textContent = `${this.value}ms`;
        });
        durationSlider.addEventListener("change", saveSettings);
    }

    // Double-tap speed slider (mobile)
    const doubleTapSlider = document.getElementById("ct_pte_doubleTapSpeed");
    const doubleTapValue = document.getElementById(
        "ct_pte_doubleTapSpeed_value"
    );
    if (doubleTapSlider && doubleTapValue) {
        doubleTapSlider.addEventListener("input", function () {
            settings.doubleTapSpeed = parseInt(this.value, 10);
            doubleTapValue.textContent = `${this.value}ms`;
        });
        doubleTapSlider.addEventListener("change", saveSettings);
    }
}

/**
 * Initialize the extension
 */
function init() {
    const { eventSource, event_types } = SillyTavern.getContext();

    // Wait for app to be ready before initializing
    eventSource.on(event_types.APP_READY, function () {
        console.log(`[${MODULE_NAME}] Extension loaded`);

        // Create settings UI
        createSettingsUI();

        // Initialize appropriate handler based on device type
        if (isTouchDevice()) {
            console.log(`[${MODULE_NAME}] Initializing mobile (touch) handler`);
            initMobileHandler();
        } else {
            console.log(
                `[${MODULE_NAME}] Initializing desktop (mouse) handler`
            );
            initDesktopHandler();
        }
    });
}

// Start the extension
init();
