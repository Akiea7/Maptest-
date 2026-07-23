// =========================================================
// 🛠️ الإعدادات النهائية لشاشة التتبع (Alek App)
// =========================================================
const CAR_SIZE_PX = 48; 
const CAR_ANGLE_OFFSET = 0; 
const MIN_VISIBLE_ZOOM = 13.5; 
// =========================================================

maplibregl.setRTLTextPlugin('https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js', null, true);

// مسار الطارمية
const ROUTE_COORDS = [
    [44.3735000, 33.6645000], 
    [44.3783246, 33.6668412], 
    [44.3805000, 33.6678000],
    [44.3835000, 33.6692000], 
    [44.3842000, 33.6680000], 
    [44.3850000, 33.6660000],
    [44.3830000, 33.6650000], 
    [44.3800000, 33.6635000]  
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
// 🧮 دوال العمليات الحسابية للمسار
// =========================================================
function haversineDistance(a, b) {
    const R = 6371000;
    const dLat = (b[1] - a[1]) * Math.PI / 180;
    const dLon = (b[0] - a[0]) * Math.PI / 180;
    const lat1 = a[1] * Math.PI / 180;
    const lat2 = b[1] * Math.PI / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

function trueBearing(a, b) {
    const lon1 = a[0] * Math.PI / 180;
    const lat1 = a[1] * Math.PI / 180;
    const lon2 = b[0] * Math.PI / 180;
    const lat2 = b[1] * Math.PI / 180;
    const x = Math.sin(lon2 - lon1) * Math.cos(lat2);
    const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
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
            result.push([ a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t ]);
        }
    }
    return result.filter((p, i, arr) => i === 0 || p[0] !== arr[i - 1][0] || p[1] !== arr[i - 1][1]);
}

map.on('load', () => {
    // 1. تحميل الأماكن
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

    // 2. رسم المسار بألوان هادئة
    map.addSource('routeSource', {
        'type': 'geojson',
        'data': { 'type': 'Feature', 'properties': {}, 'geometry': { 'type': 'LineString', 'coordinates': ROUTE_COORDS } }
    });
    
    map.addLayer({
        'id': 'routeCasing', 'type': 'line', 'source': 'routeSource',
        'minzoom': MIN_VISIBLE_ZOOM,
        'layout': { 'line-cap': 'round', 'line-join': 'round' },
        'paint': { 'line-color': '#8ab4f8', 'line-width': 8, 'line-opacity': 0.4 }
    });
    
    map.addLayer({
        'id': 'routeCore', 'type': 'line', 'source': 'routeSource',
        'minzoom': MIN_VISIBLE_ZOOM,
        'layout': { 'line-cap': 'round', 'line-join': 'round' },
        'paint': { 'line-color': '#4285f4', 'line-width': 4, 'line-opacity': 0.8 }
    });

    // =========================================================
    // 🚗 التحميل المسبق المباشر (لحل مشكلة التدرج والوميض)
    // =========================================================
    const carImg = new Image();
    carImg.src = 'car-icon.png'; // الصورة ستتحمل في الذاكرة أولاً

    carImg.onload = () => {
        // لن يتم تنفيذ هذا الكود إلا بعد اكتمال تحميل الصورة 100%
        const carElement = document.createElement('div');
        carElement.className = 'car-marker';
        
        Object.assign(carElement.style, {
            width: CAR_SIZE_PX + 'px',
            height: CAR_SIZE_PX + 'px',
            backgroundImage: `url('${carImg.src}')`, 
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            imageRendering: 'crisp-edges', 
            willChange: 'transform, opacity',
            transition: 'opacity 0.2s ease-in-out' 
        });

        // تأثير النبض الوهمي
        const pulseElement = document.createElement('div');
        Object.assign(pulseElement.style, {
            position: 'absolute',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            backgroundColor: 'rgba(66, 133, 244, 0.3)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            animation: 'pulse-animation 2s infinite',
            pointerEvents: 'none'
        });
        carElement.appendChild(pulseElement);

        // إضافة ستايلات الأنيميشن بشكل برمجي لمنع الحاجة لملف CSS
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

        const carMarker = new maplibregl.Marker({
            element: carElement,
            rotationAlignment: 'map',    
            pitchAlignment: 'map',       
            anchor: 'center'             
        })
        .setLngLat(ROUTE_COORDS[0])
        .addTo(map);

        // إخفاء السيارة والمسار عند التصغير
        map.on('zoom', () => {
            if (map.getZoom() < MIN_VISIBLE_ZOOM) {
                carElement.style.opacity = '0'; 
            } else {
                carElement.style.opacity = '1'; 
            }
        });

        // =========================================================
        // 🎯 محرك الحركة الدقيق
        // =========================================================
        const DENSE_POINTS = densifyLine(ROUTE_COORDS, 3);
        let currentIndex = 0;
        let lastTimestamp = 0;
        let segmentProgress = 0;
        let currentBearing = 0;
        const SPEED_MPS = 12; 

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

            let diff = targetBearing - currentBearing;
            while (diff > 180) diff -= 360;
            while (diff < -180) diff += 360;
            currentBearing += diff * 0.3;

            carMarker.setLngLat([lng, lat]);
            carMarker.setRotation(currentBearing);

            animationFrameId = requestAnimationFrame(animateCar);
        }

        // تشغيل الحركة بعد التأكد التام من تحميل كل شيء
        animationFrameId = requestAnimationFrame(animateCar);
    };
});
