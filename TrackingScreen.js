// =========================================================
// 🛠️ لوحة تحكم السيارة - النسخة الاحترافية (Polyline Sampling)
// =========================================================
const CAR_SIZE = 0.05;
// السيارة PNG موجهة للأعلى (الشمال) → لا نحتاج أي إزاحة
const CAR_ANGLE_OFFSET = 0;
// =========================================================

maplibregl.setRTLTextPlugin('https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js', null, true);

const ROUTE_COORDS = [
    [44.3783246, 33.6668412],
    [44.3792000, 33.6672000],
    [44.3805000, 33.6678000],
    [44.3820000, 33.6685000],
    [44.3835000, 33.6692000]
];

const map = new maplibregl.Map({
    container: 'map',
    style: 'alak-style.json?v=3',
    center: ROUTE_COORDS[0],
    zoom: 16.5,
    bearing: 45,
    pitch: 45,
    antialias: true,
    attributionControl: false
});

const centerMarker = document.getElementById('center-marker');
if (centerMarker) {
    map.on('movestart', () => centerMarker.classList.add('bounce-marker'));
    map.on('moveend', () => centerMarker.classList.remove('bounce-marker'));
}

let animationFrameId = null;

// =========================================================
// 🧮 دوال حساب المسافة والزاوية (نفس منطق Turf.js)
// =========================================================
function haversineDistance(a, b) {
    const R = 6371000; // نصف قطر الأرض بالمتر
    const dLat = (b[1] - a[1]) * Math.PI / 180;
    const dLon = (b[0] - a[0]) * Math.PI / 180;
    const lat1 = a[1] * Math.PI / 180;
    const lat2 = b[1] * Math.PI / 180;
    const h = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

// Bearing حقيقي 100% (نفس معادلة Turf)
function trueBearing(a, b) {
    const lon1 = a[0] * Math.PI / 180;
    const lat1 = a[1] * Math.PI / 180;
    const lon2 = b[0] * Math.PI / 180;
    const lat2 = b[1] * Math.PI / 180;
    const x = Math.sin(lon2 - lon1) * Math.cos(lat2);
    const y = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
    return Math.atan2(x, y) * 180 / Math.PI;
}

// =========================================================
// 🧵 Polyline Sampling: تقسيم المسار لنقاط كل N متر
// =========================================================
function densifyLine(coords, stepMeters = 3) {
    const result = [coords[0]];
    for (let i = 0; i < coords.length - 1; i++) {
        const a = coords[i], b = coords[i + 1];
        const d = haversineDistance(a, b);
        const steps = Math.max(1, Math.floor(d / stepMeters));
        for (let j = 1; j <= steps; j++) {
            const t = j / steps;
            result.push([
                a[0] + (b[0] - a[0]) * t,
                a[1] + (b[1] - a[1]) * t
            ]);
        }
    }
    // إزالة النقاط المكررة المتتالية
    return result.filter((p, i, arr) =>
        i === 0 || p[0] !== arr[i - 1][0] || p[1] !== arr[i - 1][1]
    );
}

map.on('load', () => {

    // 🌟 السحر هنا: إخفاء شاشة التحميل بعد تحميل الخريطة
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            setTimeout(() => loadingScreen.remove(), 500);
        }, 300);
    }

    // 1. تحميل طبقة الأماكن
    if (typeof alakPlaces !== 'undefined') {
        let safeMapFont = ['Noto Sans Regular'];
        const styleLayers = map.getStyle().layers;
        for (let i = 0; i < styleLayers.length; i++) {
            if (styleLayers[i].type === 'symbol' && styleLayers[i].layout && styleLayers[i].layout['text-font']) {
                safeMapFont = styleLayers[i].layout['text-font'];
                break;
            }
        }
        map.addSource('alak-custom-places', { 'type': 'geojson', 'data': alakPlaces });
        map.addLayer({
            'id': 'alak-places-layer', 'type': 'symbol', 'source': 'alak-custom-places', 'minzoom': 13,
            'layout': {
                'icon-image': ['concat', ['get', 'icon'], '_11'],
                'icon-size': 1.1,
                'text-field': ['get', 'title'],
                'text-font': safeMapFont,
                'text-size': ['interpolate', ['linear'], ['zoom'], 14, 11, 17, 13, 20, 16],
                'symbol-sort-key': ['coalesce', ['get', 'priority'], 10],
                'text-offset': [0, 1.2],
                'text-anchor': 'top',
                'icon-allow-overlap': false,
                'text-allow-overlap': false,
                'icon-padding': 2,
                'text-padding': 2,
                'icon-optional': true
            },
            'paint': { 'text-color': '#4a4a4a', 'text-halo-color': '#ffffff', 'text-halo-width': 2 }
        });
    }

    // 2. تحميل المسار والسيارة
    map.loadImage('car-icon.png', (error, image) => {
        let finalIconId = 'car_11';
        if (!error && image) {
            if (map.hasImage('car-top-view')) map.removeImage('car-top-view');
            map.addImage('car-top-view', image);
            finalIconId = 'car-top-view';
        }

        map.addSource('routeSource', {
            'type': 'geojson',
            'data': {
                'type': 'Feature',
                'properties': {},
                'geometry': { 'type': 'LineString', 'coordinates': ROUTE_COORDS }
            }
        });
        map.addLayer({
            'id': 'routeCasing', 'type': 'line', 'source': 'routeSource',
            'layout': { 'line-cap': 'round', 'line-join': 'round' },
            'paint': { 'line-color': '#1e3a5f', 'line-width': 10, 'line-opacity': 0.8 }
        });
        map.addLayer({
            'id': 'routeCore', 'type': 'line', 'source': 'routeSource',
            'layout': { 'line-cap': 'round', 'line-join': 'round' },
            'paint': { 'line-color': '#0088FF', 'line-width': 5 }
        });

        // =========================================================
        // 🚗 إعداد مصدر السيارة
        // =========================================================
        const captainFeature = {
            type: 'Feature',
            properties: { bearing: 0, pulseRadius: 22 },
            geometry: { type: 'Point', coordinates: [...ROUTE_COORDS[0]] }
        };

        map.addSource('captainSource', { 'type': 'geojson', 'data': captainFeature });

        map.addLayer({
            'id': 'captainPulse', 'type': 'circle', 'source': 'captainSource',
            'paint': {
                'circle-radius': ['get', 'pulseRadius'],
                'circle-color': '#0088FF',
                'circle-opacity': 0.2,
                'circle-pitch-alignment': 'map'
            }
        });

        map.addLayer({
            'id': 'captainIcon',
            'type': 'symbol',
            'source': 'captainSource',
            'layout': {
                'icon-image': finalIconId,
                'icon-size': finalIconId === 'car-top-view' ? CAR_SIZE : 1.5,
                'icon-pitch-alignment': 'map',
                'icon-rotation-alignment': 'map',
                'icon-rotate': ['get', 'bearing'],
                'icon-allow-overlap': true,
                'icon-ignore-placement': true
            }
        });

        // =========================================================
        // 🎯 Polyline Sampling: تحويل المسار لنقاط كثيفة كل 3 أمتار
        // =========================================================
        const DENSE_POINTS = densifyLine(ROUTE_COORDS, 3); // كل 3 أمتار نقطة

        // =========================================================
        // 🏎️ محرك الحركة الاحترافي
        // =========================================================
        let currentIndex = 0;
        let lastTimestamp = 0;
        let segmentProgress = 0;

        // 🎛️ السرعة الفعلية بالمتر/ثانية
        // 12 م/ث = 43 كم/س  |  8 م/ث = 29 كم/س  |  15 م/ث = 54 كم/س
        const SPEED_MPS = 12;

                // =========================================================
        // 🏎️ محرك الحركة (نسخة محسنة الأداء - لا تسبب كراش)
        // =========================================================
        let currentIndex = 0;
        let lastTimestamp = 0;
        let segmentProgress = 0;
        let lastDrawTime = 0; // متغير جديد للتحكم بسرعة التحديث

        const SPEED_MPS = 12;
        const FPS_LIMIT = 30; // تحديد التحديث بـ 30 إطار بالثانية لحماية المتصفح
        const FRAME_INTERVAL = 1000 / FPS_LIMIT; 

        function animateCar(timestamp) {
            if (!map.getSource('captainSource')) return;

            if (lastTimestamp === 0) lastTimestamp = timestamp;
            const deltaTime = timestamp - lastTimestamp;
            lastTimestamp = timestamp;
            const safeDelta = Math.min(deltaTime, 50) / 1000;

            if (currentIndex >= DENSE_POINTS.length - 1) {
                currentIndex = 0;
                segmentProgress = 0;
                animationFrameId = requestAnimationFrame(animateCar);
                return;
            }

            let current = DENSE_POINTS[currentIndex];
            let next = DENSE_POINTS[currentIndex + 1];
            let segmentDistance = haversineDistance(current, next);

            if (segmentDistance < 0.1) {
                currentIndex++;
                animationFrameId = requestAnimationFrame(animateCar);
                return;
            }

            segmentProgress += (safeDelta * SPEED_MPS) / segmentDistance;

            if (segmentProgress >= 1) {
                const overflow = segmentProgress - 1;
                currentIndex++;

                if (currentIndex >= DENSE_POINTS.length - 1) {
                    currentIndex = 0;
                    segmentProgress = 0;
                } else {
                    current = DENSE_POINTS[currentIndex];
                    next = DENSE_POINTS[currentIndex + 1];
                    segmentDistance = haversineDistance(current, next);
                    segmentProgress = (overflow * SPEED_MPS) / segmentDistance;
                }
            }

            // تحديث موقع السيارة على الشاشة فقط إذا مر الوقت الكافي (حسب الـ FPS_LIMIT)
            if (timestamp - lastDrawTime >= FRAME_INTERVAL) {
                const lng = current[0] + (next[0] - current[0]) * segmentProgress;
                const lat = current[1] + (next[1] - current[1]) * segmentProgress;

                const targetBearing = trueBearing(current, next) + CAR_ANGLE_OFFSET;

                let currentBearing = captainFeature.properties.bearing;
                let diff = targetBearing - currentBearing;
                while (diff > 180) diff -= 360;
                while (diff < -180) diff += 360;
                const smoothBearing = currentBearing + diff * 0.3;

                captainFeature.geometry.coordinates = [lng, lat];
                captainFeature.properties.bearing = smoothBearing;
                // ثبتنا الحجم حتى لا يصير Overload على المتصفح
                captainFeature.properties.pulseRadius = 22; 

                map.getSource('captainSource').setData(captainFeature);
                lastDrawTime = timestamp;
            }

            animationFrameId = requestAnimationFrame(animateCar);
        }

        animationFrameId = requestAnimationFrame(animateCar);


function stopCarAnimation() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}
