// ==========================================
// 1. DATA INFRASTRUCTURE SETUP
// ==========================================
const locationData = [
    { id: "tokyo", name: "Tokyo", type: "City", country: "Japan", lat: 35.6762, lon: 139.6503, pop: "14.0 Million", weather: { temp: "64°F", cond: "Clear", icon: "☀️" }, flag: "🇯🇵", fact: "Tokyo is the world's most populous metropolitan area and features a highly efficient sub-surface transport system.", link: "https://spotify.com" },
    { id: "paris", name: "Paris", type: "Capital", country: "France", lat: 48.8566, lon: 2.3522, pop: "2.1 Million", weather: { temp: "52°F", cond: "Misty", icon: "🌫️" }, flag: "🇫🇷", fact: "Originally a Roman city named Lutetia, Paris is renowned globally for art, architecture, and culinary traditions.", link: "https://apple.com" },
    { id: "cairo", name: "Cairo", type: "Capital", country: "Egypt", lat: 30.0444, lon: 31.2357, pop: "9.5 Million", weather: { temp: "82°F", cond: "Sunny", icon: "☀️" }, flag: "🇪🇬", fact: "Cairo is home to the oldest intact functional structures on Earth, located on the Giza Plateau directly to its west.", link: "https://spotify.com" },
    { id: "ny", name: "New York", type: "City", country: "United States", lat: 40.7128, lon: -74.0060, pop: "8.3 Million", weather: { temp: "58°F", cond: "Partly Cloudy", icon: "⛅" }, flag: "🇺🇸", fact: "Over 800 languages are spoken in New York City, making it the most linguistically diverse city in the world.", link: "https://apple.com" },
    { id: "china_hub", name: "Beijing", type: "Capital", country: "China", lat: 39.9042, lon: 116.4074, pop: "21.5 Million", weather: { temp: "48°F", cond: "Chilly", icon: "🍃" }, flag: "🇨🇳", fact: "Beijing is situated directly on the opposite hemisphere layout. Tilting the device straight down reveals its position through the crust matrix.", link: "https://spotify.com" }
];

let userCoords = { lat: 40.7128, lon: -74.0060 }; // Standard fallback center coordinate
let activePOI = null;

// ==========================================
// 2. HARDWARE ACCESS CONTROL
// ==========================================
document.getElementById("startAppBtn").addEventListener("click", async () => {
    document.getElementById("permissionOverlay").style.display = "none";
    
    // Request Camera Stream Setup
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        const video = document.getElementById("cameraView");
        video.srcObject = stream;
        video.classList.remove("hidden");
        document.getElementById("statusText").innerText = "Camera Feed Configured.";
    } catch (err) {
        document.getElementById("statusText").innerText = "Camera Denied. Using Celestial Space Fallback Grid.";
    }

    // Request Location Geoposition Access
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            userCoords.lat = position.coords.latitude;
            userCoords.lon = position.coords.longitude;
            renderMarkers();
        });
    }

    // Request iOS Safe Device Orientation permissions
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    window.addEventListener('deviceorientation', handleOrientation);
                }
            })
            .catch(console.error);
    } else {
        window.addEventListener('deviceorientation', handleOrientation);
    }
    
    renderMarkers();
});

// ==========================================
// 3. SPATIAL GEOMETRY & CALCULATIONS
// ==========================================
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3958.8; // Earth radius in Miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c);
}

function calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

// ==========================================
// 4. AR CORE ENGINE LAYER
// ==========================================
function renderMarkers() {
    const canvas = document.getElementById("arCanvas");
    canvas.innerHTML = ""; // Wipe frames

    locationData.forEach(loc => {
        const distance = calculateDistance(userCoords.lat, userCoords.lon, loc.lat, loc.lon);
        
        const el = document.createElement("div");
        el.id = `marker-${loc.id}`;
        el.className = "absolute ar-poi pointer-events-auto cursor-pointer flex flex-col items-center justify-center hidden";
        
        // Custom flag circle sizing metrics based on populations
        const sizeClass = loc.id === "china_hub" || loc.id === "tokyo" ? "w-16 h-16 text-3xl" : "w-12 h-12 text-2xl";

        el.innerHTML = `
            <div class="${sizeClass} bg-zinc-800 rounded-full border-2 border-white/40 shadow-2xl flex items-center justify-center active:scale-90 transition-transform">
                ${loc.flag}
            </div>
            <p class="text-[11px] font-bold tracking-wide mt-1 text-shadow drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">${loc.name}</p>
            <p class="text-[9px] text-gray-300 font-mono drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">${distance} mi</p>
        `;
        
        el.addEventListener("click", () => openModal(loc, distance));
        canvas.appendChild(el);
    });
}

function handleOrientation(event) {
    const heading = event.webkitCompassHeading || (360 - event.alpha);
    const pitch = event.beta; // Tilt measurement

    locationData.forEach(loc => {
        const marker = document.getElementById(`marker-${loc.id}`);
        if (!marker) return;

        const targetBearing = calculateBearing(userCoords.lat, userCoords.lon, loc.lat, loc.lon);
        let diff = targetBearing - heading;
        if (diff < -180) diff += 360;
        if (diff > 180) diff -= 360;

        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        // X Coordinate positioning based on phone rotational bearing
        const xPos = (screenWidth / 2) + (diff * (screenWidth / 60)); // 60 degree FoV mapping

        let yPos = screenHeight / 2;
        let isVisible = Math.abs(diff) < 30; // Within field of view bounds

        // LOOK-DOWN CRUST TUNNEL SPECIAL EFFECT LOGIC (e.g. for Beijing/China)
        if (loc.id === "china_hub") {
            // Target is visible when user tips device flat or completely forward down
            if (pitch > 60 || pitch < -60) {
                isVisible = true;
                yPos = (screenHeight / 2) + ((Math.abs(pitch) - 75) * 15);
            } else {
                isVisible = false;
            }
        } else {
            // General targets shift down slightly if pitching up or down
            yPos = (screenHeight / 2) + (pitch - 45) * 4;
        }

        if (isVisible && xPos > -50 && xPos < screenWidth + 50) {
            marker.style.left = `${xPos}px`;
            marker.style.top = `${yPos}px`;
            marker.classList.remove("hidden");
        } else {
            marker.classList.add("hidden");
        }
    });
}

// ==========================================
// 5. INTERACTIVE PANEL UI CONTROLS
// ==========================================
function openModal(poi, distance) {
    activePOI = poi;
    document.getElementById("sheetTitle").innerText = poi.name;
    document.getElementById("sheetSubtitle").innerText = `${distance.toLocaleString()} MILES AWAY • ${poi.type.toUpperCase()}`;
    document.getElementById("weatherIcon").innerText = poi.weather.icon;
    document.getElementById("weatherTemp").innerText = poi.weather.temp;
    document.getElementById("weatherCond").innerText = poi.weather.cond;
    
    document.getElementById("factPopulation").innerText = `Population Hub Metric: ${poi.pop}`;
    document.getElementById("factInteresting").innerText = poi.fact;
    document.getElementById("externalMusicLink").href = poi.link;

    switchTab('facts');
    document.getElementById("detailSheet").classList.remove("translate-y-full");
}

function closeModal() {
    document.getElementById("detailSheet").classList.add("translate-y-full");
}

function switchTab(tabId) {
    ['facts', 'art', 'sounds'].forEach(t => {
        document.getElementById(`panel-${t}`).classList.add("hidden");
        document.getElementById(`tab-${t}`).className = "flex-1 text-center py-2.5 text-sm font-semibold border-b-2 border-transparent text-gray-400";
    });
    document.getElementById(`panel-${tabId}`).classList.remove("hidden");
    document.getElementById(`tab-${tabId}`).className = "flex-1 text-center py-2.5 text-sm font-semibold border-b-2 border-blue-500 text-white";
}
