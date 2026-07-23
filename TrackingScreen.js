// =========================================================
// 🛠️ لوحة تحكم السيارة (محسّنة للحركة الانسيابية بدون قفز)
// =========================================================
const CAR_SIZE = 0.05; 
const CAR_ANGLE_OFFSET = -90; 
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

        // 3. إعداد كائن ثابت (Reusable) لمنع استهلاك الذاكرة والتسبب بالتقطيع
        const captainFeature = {
            type: 'Feature',
            properties: { bearing: 45, pulseRadius: 22 },
            geometry: { type: 'Point', coordinates: [...ROUTE_COORDS[0]] }
        };

        map.addSource('captainSource', {
            'type': 'geojson',
            'data': captainFeature
        });

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

        // 4. المحاكاة الانسيابية (خوارزمية Delta Time لمنع القفز نهائياً)
        let currentIndex = 0;
        let lastTimestamp = 0;
        let segmentProgress = 0; // التقدم داخل المقطع الحالي (من 0 إلى 1)
        
        // سرعة السيارة: تمثل نسبة المقطع المقطوعة في كل ميلي ثانية.
        // 0.0015 تعني أن السيارة تقطع المقطع في حوالي 666 ميلي ثانية.
        // 🎛️ عدّل هذا الرقم للتحكم بالسرعة: رقم أصغر = أبطأ وأنعم، رقم أكبر = أسرع.
        const speedFactor = 0.0015; 

        function animateCar(timestamp) {
            if (!map.getSource('captainSource')) return;

            // منع القفزات الضخمة إذا كان المتصفح في الخلفية (Tab Inactive)
            if (lastTimestamp === 0) lastTimestamp = timestamp;
            const deltaTime = timestamp - lastTimestamp;
            lastTimestamp = timestamp;
            const safeDeltaTime = Math.min(deltaTime, 50); // حد أقصى 50ms للإطار الواحد

            if (currentIndex >= ROUTE_COORDS.length - 1) {
                currentIndex = 0;
                segmentProgress = 0;
                lastTimestamp = 0; // إعادة ضبط الزمن لدورة انسيابية جديدة
                animationFrameId = requestAnimationFrame(animateCar);
                return;
            }

            const current = ROUTE_COORDS[currentIndex];
            const next = ROUTE_COORDS[currentIndex + 1];

            const dx_raw = next[0] - current[0];
            const dy = next[1] - current[1];
            const dx = dx_raw * Math.cos((current[1] * Math.PI) / 180); // تصحيح خط العرض

            // حساب الزاوية المستهدفة لهذا المقطع
            const targetBearing = (Math.atan2(dx, dy) * (180 / Math.PI)) + CAR_ANGLE_OFFSET;

            // زيادة التقدم بناءً على الزمن المنقضي (هذا هو سر منع القفز)
            segmentProgress += safeDeltaTime * speedFactor;

            if (segmentProgress >= 1) {
                // الانتقال للمقطع التالي مع الاحتفاظ بأي فائض زمني لمنع التقطع بين النقاط
                segmentProgress = segmentProgress - 1;
                currentIndex++;
                
                if (currentIndex >= ROUTE_COORDS.length - 1) {
                    currentIndex = 0;
                    segmentProgress = 0;
                    lastTimestamp = 0;
                }
            }

            // حساب الموقع الحالي بناءً على التقدم
            const lng = current[0] + dx_raw * segmentProgress;
            const lat = current[1] + dy * segmentProgress;

            // 🎯 تنعيم دوران السيارة (Smooth Bearing) لمنع "ارتعاش" المقود عند المنعطفات
            let currentBearing = captainFeature.properties.bearing || targetBearing;
            let diff = targetBearing - currentBearing;
            
            // تصحيح الانتقال بين 359 و 0 درجة (لمنع الدوران العكسي المفاجئ)
            while (diff > 180) diff -= 360;
            while (diff < -180) diff += 360;
            
            // تطبيق تنعيم (Lerp) على الزاوية (0.15 هي نسبة نعومة الدوران)
            const smoothBearing = currentBearing + (diff * 0.15);

            // تحديث الكائن الثابت (أسرع طريقة لتحديث البيانات في MapLibre)
            captainFeature.geometry.coordinates = [lng, lat];
            captainFeature.properties.bearing = smoothBearing;
            captainFeature.properties.pulseRadius = 22 + 4 * Math.sin(timestamp / 150);

            map.getSource('captainSource').setData(captainFeature);

            animationFrameId = requestAnimationFrame(animateCar);
        }
        
        animationFrameId = requestAnimationFrame(animateCar);
    });
});

// دالة لإيقاف الأنيميشن بأمان عند الحاجة
function stopCarAnimation() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}
