/* =========================================================
   ACCESSMAP - SCRIPT.JS
   Works with the supplied AccessMap HTML + CSS
   Uses Leaflet + OpenStreetMap
   ========================================================= */


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let currentUser = null;
let currentPlace = null;
let currentTravelMode = "WALKING";
let selectedReviewPlaceId = null;
let communityReviewsRequest = 0;

let map = null;
let routeMap = null;

let userMarker = null;
let routeUserMarker = null;

let placeMarkers = [];

let currentPosition = null;

// Theme state (persisted in localStorage)
let currentTheme = localStorage.getItem("accessMapTheme") || "dark";
document.documentElement.setAttribute("data-theme", currentTheme);


/* =========================================================
   DEMO DATA
   ========================================================= */

let places = [
    {
        name: "City Hospital",
        type: "Hospital",
        lat: 28.6139,
        lng: 77.2090,
        distance: "1.2 km",
        rating: "4.7",
        match: "94%",
        facilities: [
            "Ramp & accessible entrance",
            "Tactile path",
            "Assistance available",
            "Accessible route"
        ],
        details: [
            "Main entrance is accessible.",
            "Connects entrance to reception.",
            "Helper desk near reception.",
            "Low-barrier route prioritised for your profile."
        ],
        tags: ["Ramp", "Tactile", "Helper"]
    },

    {
        name: "Central Mall",
        type: "Mall",
        lat: 28.6280,
        lng: 77.2180,
        distance: "2.4 km",
        rating: "4.4",
        match: "89%",
        facilities: [
            "Accessible entrance",
            "Elevator",
            "Accessible toilet",
            "Accessible parking"
        ],
        details: [
            "Main entrance has an accessible ramp.",
            "Elevators connect all major floors.",
            "Accessible toilets available.",
            "Reserved accessible parking available."
        ],
        tags: ["Elevator", "Toilet", "Parking"]
    },

    {
        name: "Green Café",
        type: "Cafe",
        lat: 28.6200,
        lng: 77.1950,
        distance: "3.1 km",
        rating: "4.2",
        match: "82%",
        facilities: [
            "Ramp",
            "Wide entrance",
            "Accessible seating",
            "Ground-floor access"
        ],
        details: [
            "Ramp available at the entrance.",
            "Entrance is wide enough for wheelchair access.",
            "Accessible seating is available.",
            "Main seating area is on the ground floor."
        ],
        tags: ["Ramp", "Wide entrance"]
    },

    {
        name: "Metro Accessibility Centre",
        type: "Transport",
        lat: 28.6320,
        lng: 77.2250,
        distance: "3.8 km",
        rating: "4.5",
        match: "91%",
        facilities: [
            "Elevator",
            "Tactile path",
            "Audio announcements",
            "Assistance"
        ],
        details: [
            "Step-free elevator access available.",
            "Tactile guidance connects major entrances.",
            "Audio announcements are available.",
            "Station assistance desk available."
        ],
        tags: ["Elevator", "Tactile", "Audio"]
    }
];


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    applyTheme(currentTheme);
    initializeNavigation();
    initializeFilters();
    initializeLogin();

    loadSavedUser();

    // Initialize map only when Explore page is opened.
});


/* =========================================================
   THEME SWITCHING (DARK / LIGHT)
   ========================================================= */

function applyTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("accessMapTheme", theme);
    updateThemeButtons();
}

function toggleTheme() {
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    toast(`${nextTheme === "light" ? "Light" : "Dark"} mode enabled`);
}

function updateThemeButtons() {
    const isLight = currentTheme === "light";
    const icon = isLight ? "🌙" : "☀️";
    const text = isLight ? "Dark mode" : "Light mode";

    const topBtn = document.getElementById("themeToggleBtn");
    if (topBtn) {
        const iconEl = topBtn.querySelector("#themeIcon") || topBtn.querySelector(".theme-icon");
        const textEl = topBtn.querySelector("#themeText") || topBtn.querySelector(".theme-text");
        if (iconEl) iconEl.textContent = icon;
        if (textEl) textEl.textContent = text;
        topBtn.setAttribute("aria-label", `Switch to ${text.toLowerCase()}`);
    }

    const sideIcon = document.getElementById("sidebarThemeIcon");
    const sideText = document.getElementById("sidebarThemeText");
    if (sideIcon) sideIcon.textContent = icon;
    if (sideText) sideText.textContent = text;

    const authIcon = document.querySelector(".auth-theme-icon");
    if (authIcon) authIcon.textContent = icon;
}


/* =========================================================
   LOGIN / AUTHENTICATION
   ========================================================= */

const API_BASE_URL = "https://accessmap-xz75.onrender.com/api";

let accessMapToken = localStorage.getItem("accessMapToken") || null;

function initializeLogin() {
    const form = document.getElementById("loginForm");
    if (!form || form.dataset.initialized === "true") return;

    form.dataset.initialized = "true";

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value;
        const mode = form.dataset.mode || "login";

        if (!email || !password) {
            toast("Enter your email and password.");
            return;
        }

        let name = "";

        if (mode === "signup") {
            name = document.getElementById("signupName")?.value.trim() || "";

            if (!name) {
                toast("Please enter your name.");
                return;
            }

            if (password.length < 6) {
                toast("Password must be at least 6 characters.");
                return;
            }
        }

        const button = form.querySelector("button[type='submit']");
        if (button) button.disabled = true;

        try {
            const response = await fetch(
                `${API_BASE_URL}/auth/${mode === "signup" ? "register" : "login"}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(
                        mode === "signup"
                            ? { name, email, password }
                            : { email, password }
                    )
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success || !data.token || !data.user) {
                throw new Error(data.message || "Authentication failed.");
            }

            accessMapToken = data.token;
            localStorage.setItem("accessMapToken", data.token);

            form.dataset.mode = "login";
            loginUser(data.user);

            // Restore the normal login screen state for the next visit.
            const nameInput = document.getElementById("signupName");
            if (nameInput) nameInput.remove();

            toast(mode === "signup" ? "Account created successfully!" : "Login successful!");
        } catch (error) {
            console.error("Authentication error:", error);
            toast(error.message || "Could not connect to the backend.");
        } finally {
            if (button) button.disabled = false;
        }
    });
}


/* =========================================================
   LOGIN USER
   ========================================================= */

function loginUser(user) {

    currentUser = user;

    const remember =
        document.getElementById("rememberMe")?.checked;

    if (remember) {

        localStorage.setItem(
            "accessMapUser",
            JSON.stringify(user)
        );

    } else {

        sessionStorage.setItem(
            "accessMapUser",
            JSON.stringify(user)
        );
    }

    showApplication();

    toast(`Welcome back, ${user.name}!`);
}


/* =========================================================
   LOAD SAVED USER
   ========================================================= */

function loadSavedUser() {

    const savedUser =
        localStorage.getItem("accessMapUser") ||
        sessionStorage.getItem("accessMapUser");

    if (!savedUser) return;

    try {

        currentUser = JSON.parse(savedUser);

        showApplication();

    } catch (error) {

        console.error("Could not load saved user:", error);

    }
}


/* =========================================================
   SHOW APPLICATION
   ========================================================= */

function showApplication() {

    const authScreen =
        document.getElementById("authScreen");

    const app =
        document.getElementById("app");

    if (authScreen) {
        authScreen.classList.add("hidden");
    }

    if (app) {
        app.classList.remove("hidden");
    }

    updateUserUI();
    updateThemeButtons();
}


/* =========================================================
   UPDATE USER UI
   ========================================================= */

function updateUserUI() {

    if (!currentUser) return;

    const userName =
        document.getElementById("userName");

    if (userName) {
        userName.textContent = currentUser.name;
    }

    const profileAvatar =
        document.getElementById("profileAvatar");

    if (profileAvatar) {

        profileAvatar.textContent =
            currentUser.name
                ? currentUser.name.charAt(0).toUpperCase()
                : "U";
    }
}


/* =========================================================
   LOGOUT
   ========================================================= */

function logout() {
    localStorage.removeItem("accessMapUser");
    sessionStorage.removeItem("accessMapUser");

    // Clear the authentication token too
    localStorage.removeItem("accessMapToken");
    accessMapToken = null;

    currentUser = null;

    const app = document.getElementById("app");
    const authScreen = document.getElementById("authScreen");

    if (app) {
        app.classList.add("hidden");
    }

    if (authScreen) {
        authScreen.classList.remove("hidden");
    }

    const loginForm = document.getElementById("loginForm");

    if (loginForm) {
        loginForm.reset();
        loginForm.dataset.mode = "login";
    }

    toast("You have been logged out.");
}


/* =========================================================
   PASSWORD VISIBILITY
   ========================================================= */

function togglePassword(inputId, button) {

    const input =
        document.getElementById(inputId);

    if (!input) return;

    if (input.type === "password") {

        input.type = "text";
        button.textContent = "Hide";

    } else {

        input.type = "password";
        button.textContent = "Show";
    }
}


/* =========================================================
   SIGNUP SCREEN
   ========================================================= */

function showSignup() {
    const title = document.getElementById("authTitle");
    const subtitle = document.getElementById("authSubtitle");
    const form = document.getElementById("loginForm");

    if (!title || !subtitle || !form) return;

    title.textContent = "Create your account";
    subtitle.textContent = "Create your personalised AccessMap profile.";

    let nameInput = document.getElementById("signupName");

    if (!nameInput) {
        const label = document.createElement("label");
        label.htmlFor = "signupName";
        label.id = "signupNameLabel";
        label.textContent = "Full name";

        nameInput = document.createElement("input");
        nameInput.id = "signupName";
        nameInput.type = "text";
        nameInput.placeholder = "Enter your full name";
        nameInput.autocomplete = "name";
        nameInput.required = true;
        nameInput.style.marginBottom = "16px";

        const emailInput = document.getElementById("loginEmail");
        emailInput.parentNode.insertBefore(label, emailInput);
        emailInput.parentNode.insertBefore(nameInput, emailInput);
    }

    form.dataset.mode = "signup";

    const button = form.querySelector("button[type='submit']");
    if (button) button.textContent = "Create account";

    const switchText = document.querySelector(".auth-switch");
    if (switchText) {
        switchText.innerHTML =
            'Already have an account? <button type="button" class="text-btn" onclick="showLogin()">Sign in</button>';
    }

    toast("Enter your name, email and password.");
}

function showLogin() {
    const title = document.getElementById("authTitle");
    const subtitle = document.getElementById("authSubtitle");
    const form = document.getElementById("loginForm");

    if (!title || !subtitle || !form) return;

    title.textContent = "Welcome back";
    subtitle.textContent =
        "Sign in to access your personalised accessibility dashboard.";

    document.getElementById("signupName")?.remove();
    document.getElementById("signupNameLabel")?.remove();

    form.dataset.mode = "login";

    const button = form.querySelector("button[type='submit']");
    if (button) button.textContent = "Sign in";

    const switchText = document.querySelector(".auth-switch");
    if (switchText) {
        switchText.innerHTML =
            'Don\'t have an account? <button type="button" class="text-btn" onclick="showSignup()">Create account</button>';
    }
}


/* =========================================================
   FORGOT PASSWORD
   ========================================================= */

function showForgotPassword() {

    show("forgotModal");

    const loginEmail =
        document.getElementById("loginEmail");

    const resetEmail =
        document.getElementById("resetEmail");

    if (
        loginEmail &&
        resetEmail &&
        loginEmail.value
    ) {

        resetEmail.value =
            loginEmail.value;
    }
}


function resetPassword() {

    const input =
        document.getElementById("resetEmail");

    if (!input) return;

    const email =
        input.value.trim();

    if (!email) {

        toast("Please enter your email address.");
        return;
    }

    if (!email.includes("@")) {

        toast("Please enter a valid email address.");
        return;
    }

    hide("forgotModal");

    toast(
        `Reset link sent to ${email}`
    );
}


/* =========================================================
   GOOGLE LOGIN DEMO
   ========================================================= */

function demoGoogleLogin() {
    toast("Google sign-in is not configured yet.");
}


/* =========================================================
   PAGE NAVIGATION
   ========================================================= */

function initializeNavigation() {

    const navButtons =
        document.querySelectorAll(".nav button[data-page]");

    navButtons.forEach(button => {

        button.addEventListener("click", () => {

            const page =
                button.dataset.page;

            go(page);

        });
    });
}


function go(pageName) {

    const pages =
        document.querySelectorAll(".page");

    pages.forEach(page => {

        page.classList.remove("active");

    });

    const target =
        document.getElementById(pageName);

    if (!target) return;

    target.classList.add("active");

    const navButtons =
        document.querySelectorAll(".nav button[data-page]");

    navButtons.forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.page === pageName
        );

    });

    if (pageName === "explore") {
        setTimeout(() => {

            initializeMap();

            if (map) {
                map.invalidateSize();
            }

        }, 100);
    }

    if (pageName === "community") {
        loadCommunityReviews();
    }
}


/* =========================================================
   SEARCH
   ========================================================= */

function searchPlace(query) {

    query = (query || "").trim();

    if (!query) {

        toast("Please enter a place or category.");
        return;
    }

    go("explore");

    setTimeout(() => {

        initializeMap();

        const results =
            places.filter(place => {

                const text =
                    `${place.name} ${place.type} ${place.tags.join(" ")}`
                        .toLowerCase();

                return text.includes(query.toLowerCase());

            });

        if (results.length === 0) {

            toast(`No matching places found for "${query}".`);

            showAllPlaces();

            return;
        }

        showSearchResults(results);

        if (map) {

            const first = results[0];

            map.setView(
                [first.lat, first.lng],
                15
            );
        }

        toast(
            `${results.length} accessible place${results.length > 1 ? "s" : ""} found.`
        );

    }, 150);
}


/* =========================================================
   FILTERS
   ========================================================= */

function initializeFilters() {

    const filters =
        document.querySelectorAll(".filter");

    filters.forEach(filter => {

        filter.addEventListener("click", () => {

            filter.classList.toggle("active");

            applyFilters();

        });
    });
}


function applyFilters() {

    const activeFilters =
        [...document.querySelectorAll(".filter.active")]
            .map(el => el.textContent.trim().toLowerCase());

    let filtered =
        [...places];

    if (activeFilters.some(f => f.includes("ramp"))) {

        filtered =
            filtered.filter(place =>
                place.tags.some(tag =>
                    tag.toLowerCase().includes("ramp")
                )
            );
    }

    if (activeFilters.some(f => f.includes("tactile"))) {

        filtered =
            filtered.filter(place =>
                place.tags.some(tag =>
                    tag.toLowerCase().includes("tactile")
                )
            );
    }

    if (activeFilters.some(f => f.includes("elevator"))) {

        filtered =
            filtered.filter(place =>
                place.tags.some(tag =>
                    tag.toLowerCase().includes("elevator")
                )
            );
    }

    showSearchResults(filtered);

    if (map) {

        clearMarkers();

        filtered.forEach(place =>
            addPlaceMarker(place)
        );
    }
}


/* =========================================================
   MAP INITIALIZATION
   ========================================================= */

function initializeMap() {

    if (map) return;

    const mapElement =
        document.getElementById("googleMap");

    if (!mapElement) return;

    map = L.map("googleMap").setView(
        [28.6139, 77.2090],
        13
    );

    L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
        {
            maxZoom: 19,
            attribution: "Tiles &copy; Esri"
        }
    ).addTo(map);

    // Prefer real places from MongoDB; keep demo places as a fallback.
    loadPlacesFromBackend()
        .then(() => showAllPlaces())
        .catch(error => {
            console.warn("Using demo places because the backend places could not be loaded:", error);
            showAllPlaces();
        });
}


async function loadPlacesFromBackend() {
    const response = await fetch(`${API_BASE_URL}/places?limit=500`);
    if (!response.ok) throw new Error(`Places API returned ${response.status}`);
    const result = await response.json();
    if (!Array.isArray(result.places) || result.places.length === 0) {
        throw new Error("The places API returned no places");
    }

    places = result.places
        .filter(item => Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude)))
        .map(item => {
            const accessibility = item.accessibility || {};
            const status = value => normalizeAccessibilityStatus(value);
            const facilities = [
                { key: "wheelchair", label: "Wheelchair access" },
                { key: "tactile_paving", label: "Tactile paving" },
                { key: "ramp", label: "Ramp" },
                { key: "elevator", label: "Elevator" },
                { key: "toilets_wheelchair", label: "Wheelchair-accessible toilet" },
                { key: "entrance", label: "Accessible entrance" },
                { key: "parking", label: "Accessible parking" },
                { key: "braille", label: "Braille information" },
                { key: "hearing_loop", label: "Hearing loop" },
                { key: "sign_language", label: "Sign-language support" }
            ];
            const tags = facilities
                .filter(feature => ["yes", "designated"].includes(status(accessibility[feature.key])))
                .map(feature => feature.label);
            return {
                id: item._id,
                name: item.name || "Unnamed place",
                type: item.category || "Other",
                lat: Number(item.latitude),
                lng: Number(item.longitude),
                distance: "Distance depends on your location",
                rating: "Not rated",
                match: calculatePlaceMatch(accessibility),
                facilities: facilities.map(feature => feature.label),
                details: facilities.map(feature => describeAccessibilityStatus(accessibility[feature.key])),
                tags,
                accessibility,
                address: item.address || "",
                website: item.website || "",
                phone: item.phone || ""
            };
        });

    if (!places.length) throw new Error("No places with valid coordinates were returned");
}

function normalizeAccessibilityStatus(value) {
    if (value === null || value === undefined) return "unknown";
    const status = String(value).trim().toLowerCase();
    if (!status) return "unknown";
    if (["yes", "designated", "available", "true"].includes(status)) return "yes";
    if (["limited", "partial", "limited;yes"].includes(status)) return "limited";
    if (["no", "false"].includes(status)) return "no";
    if (["incorrect"].includes(status)) return "incorrect";
    return status;
}

function describeAccessibilityStatus(value) {
    const status = normalizeAccessibilityStatus(value);
    const descriptions = {
        yes: "Yes — the dataset reports this feature as available.",
        limited: "Limited — the dataset reports restricted or partial access.",
        no: "No — the dataset reports this feature as unavailable.",
        incorrect: "Marked incorrect in the source data; verify before travelling.",
        unknown: "Unknown — no value is recorded in the dataset."
    };
    return descriptions[status] || `Reported status: ${String(value).trim()}.`;
}

function statusScore(value) {
    const status = normalizeAccessibilityStatus(value);
    if (status === "yes") return 1;
    if (status === "limited") return 0.5;
    if (status === "no" || status === "incorrect") return 0;
    return null; // Missing data is unknown, not a confirmed failure.
}

function getRelevantAccessibilityKeys() {
    let profile = {};
    try {
        profile = JSON.parse(localStorage.getItem("accessMapProfile") || "{}");
    } catch (_) {}
    const disability = Array.isArray(profile.disability) ? profile.disability : [];
    const priority = Array.isArray(profile.priority) ? profile.priority : [];
    const keys = new Set();

    if (disability.includes("Mobility support")) ["wheelchair", "ramp", "elevator", "toilets_wheelchair", "entrance", "parking"].forEach(k => keys.add(k));
    if (disability.includes("Visual support")) ["tactile_paving", "braille"].forEach(k => keys.add(k));
    if (disability.includes("Hearing support")) ["hearing_loop", "sign_language"].forEach(k => keys.add(k));
    if (disability.includes("Speech / communication support")) ["sign_language"].forEach(k => keys.add(k));
    if (priority.includes("Ramps & accessible entrances")) ["ramp", "entrance", "wheelchair"].forEach(k => keys.add(k));
    if (priority.includes("Tactile paths")) keys.add("tactile_paving");
    if (priority.includes("Route barriers")) ["wheelchair", "surface", "width"].forEach(k => keys.add(k));
    if (priority.includes("Voice information")) ["hearing_loop", "sign_language", "braille"].forEach(k => keys.add(k));

    if (!keys.size) ["wheelchair", "tactile_paving", "ramp", "elevator", "toilets_wheelchair", "entrance", "parking", "braille", "hearing_loop", "sign_language"].forEach(k => keys.add(k));
    return [...keys];
}

function calculatePlaceMatch(accessibility = {}) {
    const keys = getRelevantAccessibilityKeys();
    const scores = keys
        .map(key => statusScore(accessibility[key]))
        .filter(score => score !== null);
    if (!scores.length) return "Unknown";
    return `${Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length * 100)}%`;
}


/* =========================================================
   SHOW ALL PLACES
   ========================================================= */

function showAllPlaces() {

    if (!map) return;

    clearMarkers();

    places.forEach(place => {

        addPlaceMarker(place);

    });
}


/* =========================================================
   ADD PLACE MARKER
   ========================================================= */

function addPlaceMarker(place) {

    if (!map) return;

    const marker =
        L.marker([
            place.lat,
            place.lng
        ]).addTo(map);

    marker.bindPopup(`
        <div class="access-popup">

            <strong>${escapeHTML(place.name)}</strong>

            <small>
                ${escapeHTML(place.type)}
                · ${escapeHTML(place.distance)}
                · ⭐ ${escapeHTML(place.rating)}
            </small>

            <ul>
                ${place.facilities
                    .slice(0, 3)
                    .map(item =>
                        `<li>${escapeHTML(item)}</li>`
                    )
                    .join("")
                }
            </ul>

            <button
                class="btn primary popup-route"
                onclick="openPlace('${escapeAttribute(place.name)}')"
            >
                View details
            </button>

        </div>
    `);

    placeMarkers.push(marker);

    return marker;
}


/* =========================================================
   CLEAR MAP MARKERS
   ========================================================= */

function clearMarkers() {

    placeMarkers.forEach(marker => {

        if (map) {
            map.removeLayer(marker);
        }

    });

    placeMarkers = [];
}


/* =========================================================
   GOOGLE MAPS DIRECTIONS
   ========================================================= */

function googleMapsDirections(place) {
    if (!place || !Number.isFinite(Number(place.lat)) || !Number.isFinite(Number(place.lng))) {
        return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(place?.name || "accessible place");
    }

    // Omitting origin lets Google Maps use the user's current location.
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${place.lat},${place.lng}`)}&travelmode=walking`;
}

/* Speak the destination when either Directions link is clicked. */
function speakDirections(placeName) {
    speak(
        `Opening directions to ${placeName} in Google Maps. ` +
        `Please follow the navigation instructions.`
    );
}

/* Handle Directions links created dynamically in search results and place details. */
document.addEventListener("click", event => {
    const directionsLink = event.target.closest(
        ".result-directions, .google-maps-directions"
    );

    if (!directionsLink) return;

    const placeName =
        directionsLink.dataset.placeName ||
        currentPlace?.name ||
        "the selected place";

    speakDirections(placeName);
});


/* =========================================================
   PLACE DETAILS
   ========================================================= */

function openPlace(placeName) {
    const place = places.find(p => p.name === placeName || p.id === placeName);
    if (!place) {
        toast("Place information not found.");
        return;
    }
    currentPlace = place;

    const title = document.getElementById("placeTitle");
    if (title) title.textContent = place.name;

    const bannerText = document.querySelector("#placeModal .detail-banner p");
    if (bannerText) {
        const locationText = place.address ? `${place.address} · ` : "";
        bannerText.textContent = `${locationText}${place.type || "Place"}${place.rating && place.rating !== "Not rated" ? ` · ${place.rating}` : ""}`;
    }

    const match = document.querySelector("#placeModal .match b");
    if (match) match.textContent = place.accessibility ? calculatePlaceMatch(place.accessibility) : (place.match || "Unknown");

    // Rebuild the accessibility list from the actual place record, preserving values like yes/limited/no/unknown.
    const modalBox = document.querySelector("#placeModal .modalbox");
    const actions = modalBox?.querySelector(".modal-actions");
    if (modalBox && actions) {
        modalBox.querySelectorAll(".facility, .accessibility-status-list").forEach(el => el.remove());
        const list = document.createElement("div");
        list.className = "accessibility-status-list";
        const featureLabels = {
            wheelchair: "Wheelchair access",
            tactile_paving: "Tactile paving",
            ramp: "Ramp",
            elevator: "Elevator",
            toilets_wheelchair: "Wheelchair-accessible toilet",
            entrance: "Accessible entrance",
            parking: "Accessible parking",
            braille: "Braille information",
            hearing_loop: "Hearing loop",
            sign_language: "Sign-language support"
        };
        const accessibility = place.accessibility || {};
        Object.entries(featureLabels).forEach(([key, label]) => {
            const raw = accessibility[key];
            const status = normalizeAccessibilityStatus(raw);
            const visibleStatus = status === "unknown" ? "Unknown" : status.charAt(0).toUpperCase() + status.slice(1);
            const row = document.createElement("div");
            row.className = "facility";
            const icon = document.createElement("div");
            icon.className = "tick";
            icon.textContent = status === "yes" ? "✓" : status === "limited" ? "!" : status === "no" ? "×" : "?";
            const copy = document.createElement("div");
            const heading = document.createElement("b");
            heading.textContent = label;
            const description = document.createElement("small");
            description.textContent = `${visibleStatus} — ${describeAccessibilityStatus(raw).replace(/^[^—]+—\s*/, "")}`;
            copy.append(heading, document.createElement("br"), description);
            row.append(icon, copy);
            list.appendChild(row);
        });
        modalBox.insertBefore(list, actions);
    }

    // Add a direct Google Maps route link for this exact place.
    if (actions) {
        let directionsLink = actions.querySelector(".google-maps-directions");
        if (!directionsLink) {
            directionsLink = document.createElement("a");
            directionsLink.className = "btn primary google-maps-directions";
            directionsLink.target = "_blank";
            directionsLink.rel = "noopener noreferrer";
            directionsLink.textContent = "Get directions on Google Maps";
            actions.insertBefore(directionsLink, actions.firstChild);
        }
        directionsLink.href = googleMapsDirections(place);
        directionsLink.dataset.placeName = place.name;
    }

    show("placeModal");
}


/* =========================================================
   SEARCH RESULTS
   ========================================================= */

function showSearchResults(results) {

    const resultCard =
        document.querySelector(
            "#explore .grid.two .card"
        );

    if (!resultCard) return;

    const heading =
        resultCard.querySelector(".section-head h2");

    if (heading) {
        heading.textContent = "Nearby results";
    }

    const badge =
        resultCard.querySelector(".section-head .badge");

    if (badge) {

        badge.textContent =
            `${results.length} match${results.length !== 1 ? "es" : ""}`;
    }

    /*
     * Keep section heading and recreate result list.
     */

    const oldPlaces =
        resultCard.querySelectorAll(".place");

    oldPlaces.forEach(place => place.remove());

    results.forEach(place => {

        const div =
            document.createElement("div");

        div.className = "place";

        div.innerHTML = `
            <div class="place-icon">
                ${escapeHTML(place.type)}
            </div>

            <div style="flex:1">

                <h3>${escapeHTML(place.name)}</h3>

                <p>
                    ${escapeHTML(place.distance)}
                    · ${escapeHTML(place.rating)}
                </p>

                <div class="badges">

                    ${place.tags
                        .map(tag =>
                            `<span class="badge">
                                ${escapeHTML(tag)}
                            </span>`
                        )
                        .join("")
                    }

                </div>

            </div>

            <div class="place-actions">
                <button
                    class="btn light"
                    onclick="openPlace('${escapeAttribute(place.id || place.name)}')"
                >
                    Details
                </button>
                <a
                    class="btn primary result-directions"
                    data-place-name="${escapeHTML(place.name)}"
                    href="${escapeHTML(googleMapsDirections(place))}"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Get directions to ${escapeHTML(place.name)} on Google Maps"
                >
                    Directions
                </a>
            </div>
        `;

        resultCard.appendChild(div);
    });
}


/* =========================================================
   LOCATION
   ========================================================= */

function useMyLocation() {

    if (!navigator.geolocation) {

        toast(
            "Geolocation is not supported by this browser."
        );

        return;
    }

    toast("Getting your location...");

    navigator.geolocation.getCurrentPosition(

        position => {

            const lat =
                position.coords.latitude;

            const lng =
                position.coords.longitude;

            currentPosition = {
                lat,
                lng
            };

            initializeMap();

            if (!map) return;

            map.setView(
                [lat, lng],
                15
            );

            if (userMarker) {
                map.removeLayer(userMarker);
            }

            userMarker =
                L.marker([lat, lng])
                    .addTo(map)
                    .bindPopup(
                        "<b>Your location</b>"
                    )
                    .openPopup();

            toast("Your location has been found.");

        },

        error => {

            console.error(error);

            toast(
                "Unable to access your location. Please allow location permission."
            );
        },

        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}


/* =========================================================
   SAVE PROFILE
   ========================================================= */

async function saveProfile() {
    const switches = document.querySelectorAll("#profile .switch");

    const disabilityOptions = [
        "Mobility support",
        "Visual support",
        "Hearing support",
        "Speech / communication support"
    ];

    const priorityOptions = [
        "Ramps & accessible entrances",
        "Tactile paths",
        "Route barriers",
        "Voice information"
    ];

    // Collect the options that are currently ON.
    const disability = [];
    const priority = [];

    switches.forEach((element, index) => {
        if (!element.classList.contains("on")) return;

        if (index < 4) {
            disability.push(disabilityOptions[index]);
        } else if (index < 8) {
            priority.push(priorityOptions[index - 4]);
        }
    });

    const token = localStorage.getItem("accessMapToken");

    if (!token) {
        toast("Please log in again.");
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/profile`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    disability,
                    priority
                })
            }
        );

        const result = await response.json();

        if (!response.ok) {
            console.error("Profile save failed:", result);
            toast(result.message || "Could not save your profile.");
            return;
        }

        // Keep a local copy for the frontend.
        localStorage.setItem(
            "accessMapProfile",
            JSON.stringify({ disability, priority })
        );

        console.log("Profile saved:", { disability, priority });
        toast("Accessibility profile saved!");

    } catch (error) {
        console.error("Profile save error:", error);
        toast("Cannot connect to the backend.");
    }
}


/* =========================================================
   VOICE ASSISTANT
   ========================================================= */

function showVoice() {

    show("voiceModal");
}


/* =========================================================
   COMMUNITY REVIEWS
   ========================================================= */

async function openCommunityReviews() {
    hide("placeModal");

    // Make sure places have real MongoDB IDs before filtering reviews.
    try {
        await loadPlacesFromBackend();
        if (currentPlace) {
            const match = places.find(place =>
                (currentPlace.id && place.id === currentPlace.id) ||
                place.name.toLowerCase() === String(currentPlace.name || "").toLowerCase()
            );
            if (match) currentPlace = match;
        }
    } catch (error) {
        console.warn("Could not refresh places before loading reviews:", error);
    }

    selectedReviewPlaceId = currentPlace?.id || null;
    go("community");
}

async function openReviewForm() {
    try {
        await loadPlacesFromBackend();
    } catch (error) {
        console.warn("Could not load places for review form:", error);
    }

    const select = document.getElementById("reviewPlace");
    if (!select) return;

    const existingValue = currentPlace?.id || "";
    select.innerHTML = '<option value="">Choose a place</option>';

    places.forEach(place => {
        if (!place.id) return;
        const option = document.createElement("option");
        option.value = place.id;
        option.textContent = `${place.name} (${place.type || "Place"})`;
        select.appendChild(option);
    });

    if (existingValue && places.some(place => place.id === existingValue)) {
        select.value = existingValue;
    } else if (currentPlace?.name) {
        const matchingPlace = places.find(place =>
            place.name.toLowerCase() === currentPlace.name.toLowerCase()
        );
        if (matchingPlace?.id) select.value = matchingPlace.id;
    }

    if (!accessMapToken) {
        toast("You can view reviews, but sign in before submitting one.");
    }

    show("reviewModal");
}

async function submitReview() {
    const placeId = document.getElementById("reviewPlace")?.value;
    const rating = Number(document.getElementById("reviewRating")?.value);
    const comment = document.getElementById("reviewComment")?.value.trim();
    const button = document.getElementById("submitReviewBtn");

    if (!accessMapToken) {
        toast("Please sign in before submitting a review.");
        return;
    }
    if (!placeId) {
        toast("Please choose the place you are reviewing.");
        return;
    }
    if (!comment) {
        toast("Please write a short review first.");
        return;
    }

    if (button) {
        button.disabled = true;
        button.textContent = "Submitting...";
    }

    try {
        const response = await fetch(`${API_BASE_URL}/reviews`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessMapToken}`
            },
            body: JSON.stringify({
                place_id: placeId,
                rating,
                comment
            })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.message || "Could not submit your review.");
        }

        const place = places.find(item => item.id === placeId);
        currentPlace = place || currentPlace;
        selectedReviewPlaceId = placeId;

        document.getElementById("reviewComment").value = "";
        hide("reviewModal");
        go("community");
        toast("Your review was saved successfully.");
    } catch (error) {
        console.error("Review submission failed:", error);
        toast(error.message || "Could not submit your review.");
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = "Submit review";
        }
    }
}

async function loadCommunityReviews() {
    const container = document.getElementById("communityReviews");
    if (!container) return;

    const requestId = ++communityReviewsRequest;
    container.innerHTML = '<p class="review-empty">Loading reviews...</p>';

    const selectedPlace = selectedReviewPlaceId
        ? places.find(place => place.id === selectedReviewPlaceId)
        : null;

    try {
        const endpoint = selectedReviewPlaceId
            ? `${API_BASE_URL}/reviews/place/${encodeURIComponent(selectedReviewPlaceId)}`
            : `${API_BASE_URL}/reviews`;

        const response = await fetch(endpoint);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.message || "Could not load reviews.");
        }
        if (requestId !== communityReviewsRequest) return;

        const reviews = Array.isArray(data.reviews) ? data.reviews : [];
        const heading = selectedPlace
            ? `Reviews for ${selectedPlace.name}`
            : "All place reviews";

        container.innerHTML = `
            <div class="reviews-toolbar">
                <b>${escapeHTML(heading)}</b>
                ${selectedReviewPlaceId ? '<button class="btn light reviews-show-all" type="button" onclick="showAllCommunityReviews()">Show all reviews</button>' : ""}
            </div>
        `;

        if (!reviews.length) {
            const empty = document.createElement("p");
            empty.className = "review-empty";
            empty.textContent = selectedPlace
                ? `No reviews yet for ${selectedPlace.name}. Be the first to add one.`
                : "No reviews yet. Add the first community review.";
            container.appendChild(empty);
            return;
        }

        reviews.forEach(review => {
            const place = review.place_id && typeof review.place_id === "object"
                ? review.place_id
                : null;
            const author = review.user_id && typeof review.user_id === "object"
                ? review.user_id.name
                : "Community member";
            const card = document.createElement("article");
            card.className = "review";
            const title = document.createElement("b");
            title.textContent = place?.name || selectedPlace?.name || "Place";
            const stars = document.createElement("div");
            stars.className = "stars";
            const rating = Math.max(0, Math.min(5, Number(review.rating) || 0));
            stars.textContent = "★".repeat(rating) + "☆".repeat(5 - rating);
            stars.setAttribute("aria-label", `${rating} out of 5 stars`);
            const comment = document.createElement("p");
            comment.textContent = review.comment || "";
            const meta = document.createElement("small");
            const date = review.created_at ? new Date(review.created_at) : null;
            const dateText = date && !Number.isNaN(date.getTime())
                ? date.toLocaleDateString()
                : "";
            meta.textContent = `Reviewed by ${author}${dateText ? ` · ${dateText}` : ""}`;
            card.append(title, stars, comment, meta);
            container.appendChild(card);
        });
    } catch (error) {
        if (requestId !== communityReviewsRequest) return;
        console.error("Could not load community reviews:", error);
        container.innerHTML = "";
        const message = document.createElement("p");
        message.className = "review-empty";
        message.textContent = "Could not load reviews. Check that the backend is running, then refresh this page.";
        container.appendChild(message);
    }
}

function showAllCommunityReviews() {
    selectedReviewPlaceId = null;
    loadCommunityReviews();
}


function showReport() {

    show("reportModal");
}


async function submitReport() {
    const type = document.getElementById("rtype")?.value;
    const text = document.getElementById("rtext")?.value.trim();

    if (!text) {
        toast("Please describe the issue first.");
        return;
    }

    if (!accessMapToken) {
        toast("Please log in before submitting a report.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/reports`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessMapToken}`
            },
            body: JSON.stringify({
                report_type: type,
                description: text,
                place_id: currentPlace?._id || null
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Could not submit report.");
        }

        document.getElementById("rtext").value = "";
        hide("reportModal");
        toast("Report saved to the database!");
    } catch (error) {
        console.error("Report submission failed:", error);
        toast(error.message || "Could not connect to the backend.");
    }
}


/* =========================================================
   ROUTING
   ========================================================= */

function showRoute() {

    if (!currentPlace) {

        toast("Please select a place first.");
        return;
    }

    const destination =
        document.getElementById("routeDestination");

    const title =
        document.getElementById("routeTitle");

    if (destination) {
        destination.value =
            currentPlace.name;
    }

    if (title) {
        title.textContent =
            `Route to ${currentPlace.name}`;
    }

    show("routeModal");

    setTimeout(() => {

        initializeRouteMap();

        if (routeMap) {
            routeMap.invalidateSize();
        }

        calculateRoute();

    }, 150);
}


/* =========================================================
   ROUTE MAP
   ========================================================= */

function initializeRouteMap() {

    if (routeMap) return;

    const element =
        document.getElementById("routeGoogleMap");

    if (!element) return;

    routeMap =
        L.map("routeGoogleMap").setView(
            [28.6139, 77.2090],
            13
        );

    L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }
    ).addTo(routeMap);
}


/* =========================================================
   TRAVEL MODE
   ========================================================= */

function setTravelMode(mode, button) {

    currentTravelMode = mode;

    document
        .querySelectorAll(".route-mode")
        .forEach(btn => {
            btn.classList.remove("active");
        });

    if (button) {
        button.classList.add("active");
    }

    calculateRoute();
}


/* =========================================================
   USE LOCATION FOR ROUTE
   ========================================================= */

function useRouteLocation() {

    if (!navigator.geolocation) {

        toast("Geolocation is not supported.");
        return;
    }

    navigator.geolocation.getCurrentPosition(

        position => {

            const lat =
                position.coords.latitude;

            const lng =
                position.coords.longitude;

            currentPosition = {
                lat,
                lng
            };

            const origin =
                document.getElementById("routeOrigin");

            if (origin) {

                origin.value =
                    `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            }

            calculateRoute();
        },
        () => {

            toast(
                "Location permission was denied."
            );
        }
    );
}


/* =========================================================
   CALCULATE ROUTE
   ========================================================= */

async function calculateRoute() {

    if (!currentPlace) return;

    const originInput =
        document.getElementById("routeOrigin");

    const summary =
        document.getElementById("routeSummary");

    const steps =
        document.getElementById("routeSteps");

    const warning =
        document.getElementById("routeWarning");

    if (!summary) return;

    let origin;

    if (currentPosition) {

        origin = currentPosition;

    } else {

        origin = {
            lat: 28.6139,
            lng: 77.2090
        };

        if (originInput && !originInput.value) {

            originInput.value =
                "New Delhi";
        }
    }

    const profile =
        currentTravelMode === "DRIVING"
            ? "car"
            : "foot";

    const url =
        `https://router.project-osrm.org/route/v1/${profile}/` +
        `${origin.lng},${origin.lat};` +
        `${currentPlace.lng},${currentPlace.lat}` +
        `?overview=full&geometries=geojson&steps=true`;

    summary.innerHTML =
        "Calculating accessible route...";

    if (steps) {
        steps.innerHTML = "";
    }

    try {

        const response =
            await fetch(url);

        if (!response.ok) {
            throw new Error(
                "Routing server unavailable"
            );
        }

        const data =
            await response.json();

        if (
            !data.routes ||
            !data.routes.length
        ) {

            throw new Error(
                "No route found"
            );
        }

        const route =
            data.routes[0];

        const distanceKm =
            (route.distance / 1000).toFixed(1);

        const durationMin =
            Math.round(route.duration / 60);

        summary.innerHTML = `
            <div>
                <strong>${distanceKm} km</strong>
                <span>distance</span>
            </div>

            <div>
                <strong>${durationMin} min</strong>
                <span>estimated time</span>
            </div>

            <div>
                <strong>${currentTravelMode}</strong>
                <span>travel mode</span>
            </div>
        `;

        drawRoute(
            route.geometry,
            origin
        );

        if (
            steps &&
            route.legs &&
            route.legs[0] &&
            route.legs[0].steps
        ) {

            steps.innerHTML =
                route.legs[0].steps
                    .slice(0, 12)
                    .map((step, index) => {

                        const instruction =
                            step.maneuver?.type || "Continue";

                        const modifier =
                            step.maneuver?.modifier || "";

                        const road =
                            step.name || "Unnamed road";

                        return `
                            <div class="route-step">
                                <b>${index + 1}.</b>
                                ${formatInstruction(instruction)}
                                ${modifier}
                                on
                                <b>${escapeHTML(road)}</b>
                            </div>
                        `;

                    })
                    .join("");
        }

        if (warning) {

            warning.classList.remove("hidden");

            warning.textContent =
                "Routing shows the shortest available road/path route. " +
                "Accessibility facilities should be verified before travelling.";
        }

    } catch (error) {

        console.error(
            "Route calculation failed:",
            error
        );

        summary.innerHTML =
            "Unable to calculate the route right now.";

        if (warning) {

            warning.classList.remove("hidden");

            warning.textContent =
                "The routing service is currently unavailable. " +
                "You can still open the destination in OpenStreetMap.";
        }

        toast("Could not calculate route.");
    }
}


/* =========================================================
   DRAW ROUTE
   ========================================================= */

function drawRoute(geometry, origin) {

    if (!routeMap) return;

    routeMap.eachLayer(layer => {

        if (
            layer instanceof L.Polyline ||
            layer instanceof L.Marker
        ) {

            routeMap.removeLayer(layer);
        }
    });

    const coordinates =
        geometry.coordinates.map(
            point => [point[1], point[0]]
        );

    const routeLine =
        L.polyline(
            coordinates,
            {
                weight: 6,
                opacity: 0.85
            }
        ).addTo(routeMap);

    L.marker([
        origin.lat,
        origin.lng
    ])
        .addTo(routeMap)
        .bindPopup("Starting point");

    L.marker([
        currentPlace.lat,
        currentPlace.lng
    ])
        .addTo(routeMap)
        .bindPopup(
            `<b>${escapeHTML(currentPlace.name)}</b>`
        );

    routeMap.fitBounds(
        routeLine.getBounds(),
        {
            padding: [30, 30]
        }
    );
}


/* =========================================================
   OPEN OSM NAVIGATION
   ========================================================= */

function openGoogleMapsNavigation() {

    if (!currentPlace) {

        toast("Please select a destination first.");
        return;
    }

    let originString = "";

    if (currentPosition) {

        originString =
            `${currentPosition.lat},${currentPosition.lng}`;

    } else {

        originString =
            "New Delhi";
    }

    const destination =
        `${currentPlace.lat},${currentPlace.lng}`;

    const url =
        `https://www.openstreetmap.org/directions?` +
        `engine=fossgis_osrm_${currentTravelMode === "WALKING" ? "foot" : "car"}` +
        `&route=${encodeURIComponent(originString)};` +
        `${encodeURIComponent(destination)}`;

    window.open(
        url,
        "_blank",
        "noopener,noreferrer"
    );
}


/* =========================================================
   MODALS
   ========================================================= */

function show(id) {

    const element =
        document.getElementById(id);

    if (!element) return;

    element.classList.add("show");
}


function hide(id) {

    const element =
        document.getElementById(id);

    if (!element) return;

    element.classList.remove("show");
}


/* =========================================================
   CLOSE MODAL WHEN CLICKING OUTSIDE
   ========================================================= */

document.addEventListener("click", event => {

    if (!event.target.classList.contains("modal")) {
        return;
    }

    event.target.classList.remove("show");
});


/* =========================================================
   ESCAPE KEY
   ========================================================= */

document.addEventListener("keydown", event => {

    if (event.key !== "Escape") return;

    document
        .querySelectorAll(".modal.show")
        .forEach(modal => {

            modal.classList.remove("show");

        });
});


/* =========================================================
   TOAST
   ========================================================= */

let toastTimer = null;

function toast(message) {

    const toastElement =
        document.getElementById("toast");

    if (!toastElement) {

        console.log(message);
        return;
    }

    toastElement.textContent =
        message;

    toastElement.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer =
        setTimeout(() => {

            toastElement.classList.remove("show");

        }, 3000);
}


/* =========================================================
   ROUTE INSTRUCTION FORMATTER
   ========================================================= */

function formatInstruction(type) {

    const instructions = {

        depart: "Start",

        arrive: "Arrive",

        turn: "Turn",

        newName: "Continue",

        merge: "Merge",

        fork: "Take the fork",

        roundabout: "Enter the roundabout",

        rotary: "Enter the rotary",

        exitRoundabout: "Exit the roundabout",

        continue: "Continue",

        endOfRoad: "Continue to the end of the road",

        notification: "Follow the route",

        ramp: "Take the ramp",

        useLane: "Use the lane"

    };

    return instructions[type] || "Continue";
}


/* =========================================================
   HTML SAFETY HELPERS
   ========================================================= */

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function escapeAttribute(value) {

    return String(value)
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'");
}


/* =========================================================
   RESTORE PROFILE
   ========================================================= */

function loadProfile() {

    const saved =
        localStorage.getItem(
            "accessMapProfile"
        );

    if (!saved) return;

    try {

        const profile =
            JSON.parse(saved);

        const switches =
            document.querySelectorAll(
                "#profile .switch"
            );

        const values = [
            profile.mobility,
            profile.visual,
            profile.hearing,
            profile.speech,
            profile.ramps,
            profile.tactile,
            profile.routes,
            profile.voice
        ];

        switches.forEach(
            (switchElement, index) => {

                if (values[index]) {

                    switchElement.classList.add("on");

                } else {

                    switchElement.classList.remove("on");
                }
            }
        );

    } catch (error) {

        console.error(
            "Unable to load profile:",
            error
        );
    }
}

document.addEventListener(
    "DOMContentLoaded",
    loadProfile
);


/* =========================================================
   DEMO KEYBOARD SHORTCUTS
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.ctrlKey &&
            event.key.toLowerCase() === "k"
        ) {

            event.preventDefault();

            const search =
                document.getElementById("homeSearch");

            if (search) {
                search.focus();
            }
        }
    }
);


/* =========================================================
   ACCESSIBILITY VOICE / TEXT-TO-SPEECH
   ========================================================= */

let speechEnabled = true;
let selectedVoice = null;

function loadSpeechVoices() {

    if (!("speechSynthesis" in window)) {
        console.warn("Text-to-Speech is not supported.");
        return;
    }

    const voices =
        window.speechSynthesis.getVoices();

    selectedVoice =
        voices.find(voice =>
            voice.lang.toLowerCase().startsWith("en-in")
        ) ||
        voices.find(voice =>
            voice.lang.toLowerCase().startsWith("en")
        ) ||
        voices[0];
}

function speak(text) {

    if (!speechEnabled) return;

    if (!("speechSynthesis" in window)) {

        console.warn(
            "Your browser does not support speech synthesis."
        );

        return;
    }

    if (!text) return;

    window.speechSynthesis.cancel();

    const utterance =
        new SpeechSynthesisUtterance(text);

    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }

    utterance.lang = "en-IN";
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    window.speechSynthesis.speak(
        utterance
    );
}

function stopSpeech() {

    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }
}

if ("speechSynthesis" in window) {

    loadSpeechVoices();

    window.speechSynthesis.onvoiceschanged =
        loadSpeechVoices;
}


/* =========================================================
   MAKE BUTTONS SPEAK
   ========================================================= */

document.addEventListener(
    "click",
    function (event) {

        const button =
            event.target.closest("button");

        if (!button) return;

        if (
            button.classList.contains("close")
        ) {
            return;
        }

        if (
            button.classList.contains("switch") ||
            button.classList.contains("toggle")
        ) {

            const parent =
                button.parentElement;

            const label =
                parent?.querySelector("span") ||
                parent?.querySelector("label");

            const name =
                label?.textContent.trim() ||
                "Accessibility setting";

            const enabled =
                button.classList.contains("on");

            speak(
                `${name}. ${enabled ? "Enabled." : "Disabled."}`
            );

            return;
        }

        if (
            button.classList.contains(
                "password-toggle"
            )
        ) {
            return;
        }

        if (
            button.classList.contains(
                "leaflet-control-zoom-in"
            ) ||
            button.classList.contains(
                "leaflet-control-zoom-out"
            )
        ) {
            return;
        }

        let text =
            button.getAttribute(
                "aria-label"
            ) ||
            button.textContent.trim();

        text =
            text.replace(/\s+/g, " ");

        if (!text) return;

        speak(text);
    }
);


/* =========================================================
   NAVIGATION VOICE
   ========================================================= */

document.addEventListener(
    "click",
    function (event) {

        const navButton =
            event.target.closest(
                ".nav button[data-page]"
            );

        if (!navButton) return;

        const label =
            navButton.textContent
                .replace(/\s+/g, " ")
                .trim();

        speak(
            `Opening ${label}`
        );
    }
);


/* =========================================================
   IMPROVED TOGGLE FUNCTION
   ========================================================= */

function toggle(element) {

    if (!element) return;

    element.classList.toggle("on");

    const enabled =
        element.classList.contains("on");

    element.setAttribute(
        "aria-checked",
        enabled
    );

    const parent =
        element.parentElement;

    let label =
        parent?.querySelector(
            "span:first-child"
        )?.textContent.trim();

    if (!label) {

        label =
            parent?.textContent
                ?.replace(/\s+/g, " ")
                ?.trim();
    }

    if (!label) {
        label = "Accessibility setting";
    }

    speak(
        `${label}. ${enabled ? "Enabled." : "Disabled."}`
    );
}


/* =========================================================
   SPEAK PLACE INFORMATION
   ========================================================= */

function speakPlace(place) {

    if (!place) return;

    const facilities =
        place.facilities?.join(", ");

    speak(
        `${place.name}. ` +
        `${place.type}. ` +
        `Rating ${place.rating}. ` +
        `Profile match ${place.match}. ` +
        `Available facilities: ${facilities}.`
    );
}


/* =========================================================
   SPEAK ROUTE
   ========================================================= */

function speakRoute(
    distance,
    duration,
    mode
) {

    speak(
        `Accessible route calculated. ` +
        `Distance ${distance} kilometres. ` +
        `Estimated travel time ${duration} minutes. ` +
        `Travel mode ${mode}.`
    );
}


/* =========================================================
   VOICE ASSISTANT BUTTON
   ========================================================= */

function startVoiceAssistant() {

    speak(
        "Voice assistant activated. " +
        "You can search for an accessible place, " +
        "view accessibility information, " +
        "or calculate an accessible route."
    );
}


/* =========================================================
   GLOBAL VOICE ON/OFF
   ========================================================= */

function enableAccessibilityVoice() {

    speechEnabled = true;

    speak(
        "Voice guidance enabled."
    );
}


function disableAccessibilityVoice() {

    speak(
        "Voice guidance disabled."
    );

    speechEnabled = false;
}
