// =========================================================
// 🛠️ لوحة تحكم السيارة
// =========================================================
const CAR_SIZE = 0.05; // حجم السيارة
const CAR_ANGLE_OFFSET = -90; // تعديل اتجاه السيارة (إذا كانت تزحف بالعرض، جرب 0 أو 90 أو 180)
const ANIMATION_FRAMES = 800; // كلما زاد الرقم = السيارة تصير أبطأ وأنعم
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
        // 3. المحاكاة الانسيابية (طريقة المسار المسبق لضمان عدم القفز)
        // =========================================================
        
        // رسم الخط بالكامل باستخدام Turf
        const routeLine = turf.lineString(ROUTE_COORDS);
        const routeDistance = turf.length(routeLine, { units: 'kilometers' });
        
        // تقسيم الخط إلى نقاط ناعمة جداً
        const arc = [];
        for (let i = 0; i < ANIMATION_FRAMES; i++) {
            const segment = turf.along(routeLine, (i / ANIMATION_FRAMES) * routeDistance, { units: 'kilometers' });
            arc.push(segment.geometry.coordinates);
        }

        let counter = 0;

        function animateCar() {
            if (counter >= arc.length - 1) {
                counter = 0; // إعادة الرحلة من البداية
            }

            const currentPoint = arc[counter];
            const nextPoint = arc[counter + 1];

            // حساب الزاوية الثابتة باستخدام Turf
            const pt1 = turf.point(currentPoint);
            const pt2 = turf.point(nextPoint);
            let bearing = turf.bearing(pt1, pt2);
            
            // تطبيق تعديلك (لحل مشكلة اتجاه الصورة)
            let finalBearing = (bearing + CAR_ANGLE_OFFSET + 360) % 360;

            // تحديث موقع السيارة بثبات
            map.getSource('captainSource').setData({
                'type': 'Feature',
                'properties': { 'bearing': finalBearing },
                'geometry': { 'type': 'Point', 'coordinates': currentPoint }
            });

            // تحديث واجهة المستخدم (السرعة والتقدم)
            const progressPercent = counter / ANIMATION_FRAMES;
            const remaining = routeDistance - (progressPercent * routeDistance);
            
            const speedDisplay = document.getElementById('speed-display');
            const distanceDisplay = document.getElementById('distance-display');
            const progressText = document.getElementById('progress-percent');
            const progressBar = document.getElementById('progress-bar');
            
            if (speedDisplay) speedDisplay.textContent = 45; // سرعة ثابتة تقريبية
            if (distanceDisplay) distanceDisplay.textContent = remaining.toFixed(2);
            if (progressText) progressText.textContent = Math.round(progressPercent * 100) + '%';
            if (progressBar) progressBar.style.width = (progressPercent * 100) + '%';

            counter++;
            requestAnimationFrame(animateCar);
        }
        
        // بدء المحرك
        animateCar();
    });
});
