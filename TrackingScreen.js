// =========================================================
// 🛠️ إعدادات المركبة والمحاكاة
// =========================================================
const CAR_SIZE = 0.05; 
const CAR_ANGLE_OFFSET = -90; // (0، 90، 180، -90) حسب اتجاه صورتك الأصلية
const SPEED_KMH = 50; // السرعة الثابتة للسيارة (كم/ساعة)
const ROTATION_SMOOTHING = 0.3; // سرعة استجابة الدوران (حسب توصية صديقك)
// =========================================================

maplibregl.setRTLTextPlugin('https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js', null, true);

const ROUTE_COORDS = [
    [44.3783246, 33.6668412],
    [44.3792000, 33.6672000],
    [44.3805000, 33.6678000],
    [44.3820000, 33.6685000],
    [44.3835000, 33.6692000],
    [44.3850000, 33.6705000] // ضفت نقطة إضافية حتى يبين الانعطاف
];

// دالة تحديث الواجهة الزجاجية
function updateUI(speed, progress, remainingDistance) {
    const speedDisplay = document.getElementById('speed-display');
    const distanceDisplay = document.getElementById('distance-display');
    const progressText = document.getElementById('progress-percent');
    const progressBar = document.getElementById('progress-bar');
    
    if (speedDisplay) speedDisplay.textContent = Math.round(speed);
    if (distanceDisplay) distanceDisplay.textContent = remainingDistance.toFixed(2);
    if (progressText) progressText.textContent = Math.round(progress * 100) + '%';
    if (progressBar) progressBar.style.width = (progress * 100) + '%';
}

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

map.on('load', () => {
    // إخفاء شاشة التحميل
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            setTimeout(() => loadingScreen.remove(), 500);
        }, 500);
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

        map.addSource('captainSource', {
            'type': 'geojson',
            'data': { 
                'type': 'Feature', 
                'properties': { 'bearing': 45 }, 
                'geometry': { 'type': 'Point', 'coordinates': ROUTE_COORDS[0] } 
            }
        });

        map.addLayer({ 
            'id': 'captainPulse', 'type': 'circle', 'source': 'captainSource', 
            'paint': { 
                'circle-radius': 22, 
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
        // 3. المحرك الاحترافي: Polyline Sampling بواسطة Turf.js
        // =========================================================
        
        // تحويل المسار إلى كائن جغرافي وحساب المسافة الكلية
        const routeLine = turf.lineString(ROUTE_COORDS);
        const totalDistanceKm = turf.length(routeLine, { units: 'kilometers' });
        
        let currentDistanceKm = 0;
        let lastTime = null;
        let currentSmoothBearing = null; // للاحتفاظ بالزاوية السابقة لتنعيم الدوران

        function animateCar(timestamp) {
            if (!lastTime) lastTime = timestamp;
            const deltaTime = timestamp - lastTime;
            lastTime = timestamp;

            // حساب المسافة المقطوعة في هذا الإطار (الفريم) بناءً على السرعة والزمن الفعلي
            // السرعة (كم/ساعة) نحولها إلى (كم/ملي ثانية) بضربها في (1 / 3,600,000)
            const distanceStep = SPEED_KMH * (deltaTime / 3600000);
            currentDistanceKm += distanceStep;

            // إعادة الرحلة إذا وصلت للنهاية (لأغراض العرض)
            if (currentDistanceKm >= totalDistanceKm) {
                currentDistanceKm = 0; 
                currentSmoothBearing = null; // تصفير الزاوية
            }

            // أخذ النقطة الحالية بالضبط على خط المسار
            const currentPoint = turf.along(routeLine, currentDistanceKm, { units: 'kilometers' });

            // أخذ نقطة الاستباق (Lookahead) لحساب الاتجاه الصحيح
            const lookAheadDistance = Math.min(currentDistanceKm + 0.005, totalDistanceKm);
            const lookAheadPoint = turf.along(routeLine, lookAheadDistance, { units: 'kilometers' });

            // حساب الـ Bearing الصافي باستخدام Turf
            let targetBearing = turf.bearing(currentPoint, lookAheadPoint);
            let adjustedTargetBearing = targetBearing + CAR_ANGLE_OFFSET;

            // تنعيم الدوران (Lerp) وتجنب التفاف السيارة دورة كاملة عند الصفر
            if (currentSmoothBearing === null) {
                currentSmoothBearing = adjustedTargetBearing;
            } else {
                let diff = adjustedTargetBearing - currentSmoothBearing;
                // ضبط الفارق ليكون بين -180 و 180 درجة
                diff = ((diff + 540) % 360) - 180;
                // تطبيق نسبة التنعيم اللي اختارها صديقك
                currentSmoothBearing += diff * ROTATION_SMOOTHING;
            }

            // تحديث مصدر البيانات على الخريطة
            map.getSource('captainSource').setData({
                'type': 'Feature',
                'properties': { 'bearing': currentSmoothBearing },
                'geometry': currentPoint.geometry
            });

            // تحديث أرقام الشاشة
            const remainingDistance = totalDistanceKm - currentDistanceKm;
            const progress = currentDistanceKm / totalDistanceKm;
            updateUI(SPEED_KMH, progress, remainingDistance);

            // استدعاء الفريم القادم
            requestAnimationFrame(animateCar);
        }
        
        // تشغيل المحرك
        requestAnimationFrame(animateCar);
    });
});
