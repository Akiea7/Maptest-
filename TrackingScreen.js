// =========================================================
// 🛠️ الإعدادات المصححة والمثالية (HTML Marker 3D)
// =========================================================
const CAR_SIZE_PX = 32; // حجم ثابت للسيارة
const CAR_ANGLE_OFFSET = 0; // السيارة موجهة للأعلى
// =========================================================

maplibregl.setRTLTextPlugin('https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js', null, true);

const ROUTE_COORDS = [
    [44.3783246, 33.6668412], // البداية (الشارع العام)
    [44.3795120, 33.6673890],
    [44.3811150, 33.6681050],
    [44.3820930, 33.6685360], 
    [44.3814880, 33.6693570], // لوفة (انعطاف) لشارع فرعي
    [44.3807210, 33.6703950],
    [44.3799630, 33.6714080],
    [44.3810140, 33.6718870], // انعطاف ثاني داخل الفرع
    [44.3822160, 33.6724350],
    [44.3835680, 33.6730310],
    [44.3846660, 33.6718550], // العودة باتجاه شارع رئيسي آخر
    [44.3856210, 33.6708660]
];


const map = new maplibregl.Map({
    container: 'map',
    style: 'alak-style.json?v=3',
    center: ROUTE_COORDS[0],
    zoom: 16.5,
    bearing: 45,
    pitch: 45, // الخريطة مائلة 3D
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
// 🧮 دوال حساب المسافة والزاوية
// =========================================================
function haversineDistance(a, b) {
    const R = 6371000;
    const dLat = (b[1] - a[1]) * Math.PI / 180;
    const dLon = (b[0] - a[0]) * Math.PI / 180;
    const lat1 = a[1] * Math.PI / 180;
    const lat2 = b[1] * Math.PI / 180;
    const h = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

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
    return result.filter((p, i, arr) =>
        i === 0 || p[0] !== arr[i - 1][0] || p[1] !== arr[i - 1][1]
    );
}

map.on('load', () => {
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

    // 2. تحميل المسار الأزرق
    map.addSource('routeSource', {
        'type': 'geojson',
        'data': {
            'type': 'Feature',
            'properties': {},
            'geometry': { 'type': 'LineString', 'coordinates': ROUTE_COORDS }
        }
    });
    // 2. تحميل المسار الأزرق المحدث (بألوان خفيفة وشفافة)
    map.addSource('routeSource', {
        'type': 'geojson',
        'data': {
            'type': 'Feature',
            'properties': {},
            'geometry': { 'type': 'LineString', 'coordinates': ROUTE_COORDS }
        }
    });
    
    // الظل أو الحافة مالت المسار (شفاف جداً)
    map.addLayer({
        'id': 'routeCasing', 'type': 'line', 'source': 'routeSource',
        'layout': { 'line-cap': 'round', 'line-join': 'round' },
        'paint': { 'line-color': '#0088FF', 'line-width': 8, 'line-opacity': 0.2 } 
    });
    
    // قلب المسار (لون أزرق هادئ)
    map.addLayer({
        'id': 'routeCore', 'type': 'line', 'source': 'routeSource',
        'layout': { 'line-cap': 'round', 'line-join': 'round' },
        'paint': { 'line-color': '#0088FF', 'line-width': 4, 'line-opacity': 0.7 } 
    });


    // =========================================================
    // 🚗 HTML Marker المصحح بالكامل
    // =========================================================
    const carElement = document.createElement('div');
    carElement.className = 'car-marker';
    
    // CSS داخلي للعنصر لمنع التمدد والتشوه
    Object.assign(carElement.style, {
        width: CAR_SIZE_PX + 'px',
        height: CAR_SIZE_PX + 'px',
        backgroundImage: "url('car-icon.png')",
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        imageRendering: 'crisp-edges', // الحفاظ على دقة الصورة
        willChange: 'transform',
        transition: 'none' // إزالة أي تأخير يسبب الزحف عن المسار
    });

    // النبض تحت السيارة
    const pulseElement = document.createElement('div');
    Object.assign(pulseElement.style, {
        position: 'absolute',
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        backgroundColor: 'rgba(0, 136, 255, 0.3)',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        animation: 'pulse-animation 2s infinite',
        pointerEvents: 'none'
    });
    carElement.appendChild(pulseElement);

    // إضافة الـ CSS الخاص بالنبض والتمركز
    if (!document.getElementById('car-styles-fix')) {
        const style = document.createElement('style');
        style.id = 'car-styles-fix';
        style.textContent = `
            @keyframes pulse-animation {
                0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.5; }
                50% { transform: translate(-50%, -50%) scale(1.3); opacity: 0.1; }
                100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.5; }
            }
            .car-marker {
                transform-origin: center center;
                backface-visibility: hidden;
            }
        `;
        document.head.appendChild(style);
    }

    // ✅ السر كله هنا: pitchAlignment + rotationAlignment 
    const carMarker = new maplibregl.Marker({
        element: carElement,
        rotationAlignment: 'map',    // تدور مع الخريطة
        pitchAlignment: 'map',       // تميل مع الخريطة 3D
        anchor: 'center'             // التثبيت الدقيق من المنتصف
    })
    .setLngLat(ROUTE_COORDS[0])
    .addTo(map);

    // =========================================================
    // 🎯 Polyline Sampling (النقاط الكثيفة)
    // =========================================================
    const DENSE_POINTS = densifyLine(ROUTE_COORDS, 3);

    // =========================================================
    // 🏎️ محرك الحركة (60 إطار بالثانية - أداء صاروخي)
    // =========================================================
    let currentIndex = 0;
    let lastTimestamp = 0;
    let segmentProgress = 0;
    let currentBearing = 0;
    const SPEED_MPS = 12; // 12 متر بالثانية = تقريباً 43 كم/ساعة

    function animateCar(timestamp) {
        if (lastTimestamp === 0) lastTimestamp = timestamp;
        const deltaTime = timestamp - lastTimestamp;
        lastTimestamp = timestamp;
        const safeDelta = Math.min(deltaTime, 50) / 1000;

        if (currentIndex >= DENSE_POINTS.length - 1) {
            currentIndex = 0;
            segmentProgress = 0;
            lastTimestamp = timestamp;
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
                lastTimestamp = timestamp;
            } else {
                current = DENSE_POINTS[currentIndex];
                next = DENSE_POINTS[currentIndex + 1];
                segmentDistance = haversineDistance(current, next);
                segmentProgress = (overflow * SPEED_MPS) / segmentDistance;
            }
        }

        const lng = current[0] + (next[0] - current[0]) * segmentProgress;
        const lat = current[1] + (next[1] - current[1]) * segmentProgress;

        const targetBearing = trueBearing(current, next) + CAR_ANGLE_OFFSET;

        // تنعيم الدوران بشكل احترافي
        let diff = targetBearing - currentBearing;
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;
        currentBearing += diff * 0.3;

        // ✅ التحديث المباشر للماركر (خفيف جداً على المتصفح)
        carMarker.setLngLat([lng, lat]);
        carMarker.setRotation(currentBearing);

        animationFrameId = requestAnimationFrame(animateCar);
    }

    animationFrameId = requestAnimationFrame(animateCar);
});

function stopCarAnimation() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}
