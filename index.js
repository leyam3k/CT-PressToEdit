(function () {
    // Define the extension's name and path
    const extensionName = 'press-to-edit';
    const extensionFolderPath = `extensions/${extensionName}`;

    // Default settings for the extension
    let settings = {
        enabled: true,
        duration: 500, // Long-press duration for desktop
        doubleTapSpeed: 300, // Max time between taps for mobile (in ms)
    };

    // Function to save the current settings to localStorage
    function saveSettings() {
        localStorage.setItem(`${extensionName}_settings`, JSON.stringify(settings));
    }

    // Function to load settings from localStorage
    function loadSettings() {
        const savedSettings = localStorage.getItem(`${extensionName}_settings`);
        if (savedSettings) {
            settings = { ...settings, ...JSON.parse(savedSettings) };
        }
    }

    // This function runs when the DOM is ready
    jQuery(async () => {
        loadSettings();

        // Load the companion CSS file
        const cssPath = `${extensionFolderPath}/style.css`;
        if ($(`link[href="${cssPath}"]`).length === 0) {
            $('head').append(`<link rel="stylesheet" type="text/css" href="${cssPath}">`);
        }
        
        // --- Device Detection ---
        // This is the most reliable way to check for a touch-first vs mouse-first device.
        const isMobile = window.matchMedia("(pointer: coarse)").matches;

        // --- Create Settings UI ---
        // The UI will now show different labels based on the detected device.
        const settingsHtml = `
            <div id="press-to-edit-settings" class="press-to-edit-settings">
                <div class="inline-drawer">
                    <div class="inline-drawer-toggle inline-drawer-header">
                        <b>Press To Edit</b>
                        <div class="inline-drawer-icon fa-solid fa-chevron-circle-down"></div>
                    </div>
                    <div class="inline-drawer-content">
                        <div class="checkbox_item">
                            <input id="pte_enabled" type="checkbox" ${settings.enabled ? 'checked' : ''}>
                            <label for="pte_enabled">Enable quick editing</label>
                        </div>
                        ${isMobile ? `
                            <p><b>On this device (touch):</b> Double-tap a message to edit. Long-press to select text.</p>
                            <div class="range_slider">
                                <label for="pte_doubleTapSpeed">Double-tap speed: <span id="pte_doubleTapSpeed_value">${settings.doubleTapSpeed}</span> ms</label>
                                <input id="pte_doubleTapSpeed" type="range" value="${settings.doubleTapSpeed}" min="150" max="500" step="10">
                            </div>
                        ` : `
                            <p><b>On this device (mouse):</b> Long-press a message to edit.</p>
                            <div class="range_slider">
                                <label for="pte_duration">Press duration: <span id="pte_duration_value">${settings.duration}</span> ms</label>
                                <input id="pte_duration" type="range" value="${settings.duration}" min="200" max="1500" step="50">
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
        $('#extensions_settings').append(settingsHtml);

        // --- Settings Event Handlers ---
        $('#pte_enabled').on('change', function () { settings.enabled = $(this).is(':checked'); saveSettings(); });
        $('#pte_duration').on('input', function () { const val = $(this).val(); settings.duration = parseInt(val, 10); $('#pte_duration_value').text(val); }).on('change', saveSettings);
        $('#pte_doubleTapSpeed').on('input', function () { const val = $(this).val(); settings.doubleTapSpeed = parseInt(val, 10); $('#pte_doubleTapSpeed_value').text(val); }).on('change', saveSettings);


        // --- Main Logic ---
        if (isMobile) {
            // --- MOBILE: DOUBLE-TAP LOGIC ---
            let lastTap = { time: 0, target: null, x: 0, y: 0 };
            const moveThreshold = 15; // Allow 15px of movement before cancelling

            $(document).on('touchstart', 'body .mes .mes_text', function(e) {
                if (!settings.enabled) return;

                const currentTime = new Date().getTime();
                const timeSinceLastTap = currentTime - lastTap.time;
                const touch = e.originalEvent.touches[0];

                if (timeSinceLastTap < settings.doubleTapSpeed && e.currentTarget === lastTap.target) {
                    // This is a valid double-tap
                    e.preventDefault(); // Prevent zoom

                    if (!$('.edit_textarea').length) {
                        $(this).closest('.mes').find('.mes_edit').trigger('click');
                    }

                    // Reset last tap info to prevent triple-taps
                    lastTap = { time: 0, target: null, x: 0, y: 0 };
                } else {
                    // This is the first tap (or a tap that was too slow/on a different element)
                    lastTap = {
                        time: currentTime,
                        target: e.currentTarget,
                        x: touch.clientX,
                        y: touch.clientY
                    };
                }
            });

            // If the user starts scrolling/dragging, cancel the pending double-tap
            $(document).on('touchmove', 'body .mes .mes_text', function(e) {
                if (!lastTap.target) return; // No pending tap
                
                const touch = e.originalEvent.touches[0];
                const distance = Math.sqrt(
                    Math.pow(touch.clientX - lastTap.x, 2) +
                    Math.pow(touch.clientY - lastTap.y, 2)
                );

                if (distance > moveThreshold) {
                    // User is dragging, not tapping. Cancel the double-tap.
                    lastTap = { time: 0, target: null, x: 0, y: 0 };
                }
            });

        } else {
            // --- DESKTOP: LONG-PRESS LOGIC ---
            let pressTimer = null;

            const startPress = function(e) {
                if (!settings.enabled || e.button === 2) return;
                const $this = $(this);
                pressTimer = window.setTimeout(function () {
                    if (window.getSelection().toString() || $('.edit_textarea').length) return;
                    $this.closest('.mes').find('.mes_edit').trigger('click');
                    pressTimer = null;
                }, settings.duration);
            };

            const cancelPress = function() {
                if (pressTimer) clearTimeout(pressTimer);
                pressTimer = null;
            };

            $(document).on('mousedown', 'body .mes .mes_text', startPress);
            $(document).on('mouseup mouseleave', 'body .mes .mes_text', cancelPress);
            $(document).on('scroll', cancelPress); // Also cancel if user scrolls the page
        }
    });
})();