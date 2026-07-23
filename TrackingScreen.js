// =========================================================
// 🛠️ لوحة تحكم السيارة
// =========================================================
const CAR_SIZE = 0.05; 
const CAR_ANGLE_OFFSET = -90; 
const SIMULATION_SPEED_KMH = 45; // السرعة
// =========================================================

maplibregl.setRTLTextPlugin('https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js', null, true);

const ROUTE_COORDS = [
    [44.3783246, 33.6668412],
    [44.3792000, 33.6672000],
    [44.3805000, 33.6678000],
    [44.3820000, 33.6685000],
    [44.3835000, 33.6692000]
];

let isAnimationPaused = false;
let animationFrameId = null;

const map = new maplibregl.Map({
    container: 'map',
    style: 'https://akiea7.github.io/Maptest-/alak-style.json', // 👈 رجعنا الرابط الكامل والأكيد مالتك
    center: ROUTE_COORDS[0], 
    zoom: 16.5,
    bearing: 45, 
    pitch: 45,   
    antialias: true,
    attributionControl: false 
});

const centerMarker = document.getElementById('center-marker');
map.on('movestart', () => centerMarker.classList.add('bounce-marker'));
map.on('moveend', () => centerMarker.classList.remove('bounce-marker'));

// تحديث الأرقام بالشاشة
function updateUI(speed, progress, remainingDistance) {
    document.getElementById('speed-display').textContent = Math.round(speed);
    document.getElementById('distance-display').textContent = remainingDistance.toFixed(1);
    document.getElementById('progress-percent').textContent = Math.round(progress * 100) + '%';
    document.getElementById('progress-bar').style.width = (progress * 100) + '%';
}

// دالة الإيقاف المؤقت (مربوطة بالزر)
window.toggleAnimation = function() {
    isAnimationPaused = !isAnimationPaused;
    const btn = document.getElementById('pause-btn');
    if (isAnimationPaused) {
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> استئناف`;
        btn.classList.replace('bg-blue-600', 'bg-amber-600');
        btn.classList.replace('hover:bg-blue-500', 'hover:bg-amber-500');
    } else {
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> إيقاف مؤقت`;
        btn.classList.replace('bg-amber-600', 'bg-blue-600');
        btn.classList.replace('hover:bg-amber-500', 'hover:bg-blue-500');
    }
};

// 💡 حماية إضافية لإخفاء شاشة التحميل مهما صار
function hideLoadingScreen() {
    const loader = document.getElementById('loading-screen');
    if(loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 500);
    }
}
// إخفاء إجباري بعد 3 ثواني حتى لو النت ضعيف
setTimeout(hideLoadingScreen, 3000);

map.on('load', () => {
    
    hideLoadingScreen(); // الإخفاء الطبيعي عند نجاح التحميل

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
        map.addSource('alak-custom-places', { type: 'geojson', data: alakPlaces });
        map.addLayer({
            'id': 'alak-places-layer', 'type': 'symbol', 'source': 'alak-custom-places', 'minzoom': 13, 
            'layout': { 'icon-image': ['concat', ['get', 'icon'], '_11'], 'icon-size': 1.1, 'text-field': ['get', 'title'], 'text-font': safeMapFont, 'text-size': ['interpolate', ['linear'], ['zoom'], 14, 11, 17, 13, 20, 16], 'symbol-sort-key': ['coalesce', ['get', 'priority'], 10], 'text-offset': [0, 1.2], 'text-anchor': 'top', 'icon-allow-overlap': false, 'text-allow-overlap': false, 'icon-padding': 2, 'text-padding': 2, 'icon-optional': true },
            'paint': { 'text-color': '#4a4a4a', 'text-halo-color': '#ffffff', 'text-halo-width': 2 }
        });
    }

    // 2. تحميل المسار والسيارة
    const fallbackCarIcon = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%230088FF"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>';
    
    map.loadImage('car-icon.png', (error, image) => {
        let finalIconId = 'car_11'; 
        if (!error && image) {
            map.addImage('car-top-view', image);
            finalIconId = 'car-top-view';
        } else {
            const img = new Image(50, 50);
            img.onload = () => {
                map.addImage('car-top-view-fallback', img);
                startAnimation('car-top-view-fallback');
            };
            img.src = fallbackCarIcon;
            return;
        }
        startAnimation(finalIconId);
    });

    function startAnimation(iconId) {
        const lineString = turf.lineString(ROUTE_COORDS);
        const totalDistance = turf.length(lineString, { units: 'kilometers' });
        let currentDistance = 0;
        let lastTime = null;

        map.addSource('routeSource', { 'type': 'geojson', 'data': { 'type': 'Feature', 'properties': {}, 'geometry': { 'type': 'LineString', 'coordinates': ROUTE_COORDS } } });
        map.addLayer({ 'id': 'routeCasing', 'type': 'line', 'source': 'routeSource', 'layout': { 'line-cap': 'round', 'line-join': 'round' }, 'paint': { 'line-color': '#1e3a5f', 'line-width': 12, 'line-opacity': 0.8 } });
        map.addLayer({ 'id': 'routeCore', 'type': 'line', 'source': 'routeSource', 'layout': { 'line-cap': 'round', 'line-join': 'round' }, 'paint': { 'line-color': '#0088FF', 'line-width': 6, 'line-dasharray': [2, 1] } });

        map.addSource('captainSource', {
            'type': 'geojson',
            'data': { 'type': 'Feature', 'properties': { 'bearing': 45 }, 'geometry': { 'type': 'Point', 'coordinates': ROUTE_COORDS[0] } }
        });

        map.addLayer({ 'id': 'captainPulse', 'type': 'circle', 'source': 'captainSource', 'paint': { 'circle-radius': 25, 'circle-color': '#0088FF', 'circle-opacity': 0.15, 'circle-pitch-alignment': 'map' } });

        map.addLayer({
            'id': 'captainIcon',
            'type': 'symbol',
            'source': 'captainSource',
            'layout': {
                'icon-image': iconId, 
                'icon-size': iconId.includes('fallback') ? 1.2 : CAR_SIZE, 
                'icon-pitch-alignment': 'map', 
                'icon-rotation-alignment': 'map',
                'icon-rotate': ['get', 'bearing'], 
                'icon-allow-overlap': true,
                'icon-ignore-placement': true
            }
        });

        // 3. المحاكاة باستخدام Turf.js
        function animate(timestamp) {
            if (!lastTime) lastTime = timestamp;
            const deltaTime = (timestamp - lastTime) / 1000; 
            lastTime = timestamp;

            if (!isAnimationPaused) {
                const distanceStep = (SIMULATION_SPEED_KMH * deltaTime) / 3600;
                currentDistance += distanceStep;

                if (currentDistance >= totalDistance) {
                    currentDistance = 0; 
                }

                const currentPoint = turf.along(lineString, currentDistance, { units: 'kilometers' });
                
                const lookAhead = Math.min(currentDistance + 0.05, totalDistance);
                const nextPoint = turf.along(lineString, lookAhead, { units: 'kilometers' });
                
                let bearing = turf.bearing(currentPoint, nextPoint);
                bearing = (bearing + CAR_ANGLE_OFFSET + 360) % 360;

                map.getSource('captainSource').setData({
                    type: 'Feature',
                    properties: { bearing: bearing },
                    geometry: currentPoint.geometry
                });

                const remaining = totalDistance - currentDistance;
                const progress = currentDistance / totalDistance;
                const realisticSpeed = SIMULATION_SPEED_KMH + (Math.sin(timestamp / 500) * 2); 
                updateUI(realisticSpeed, progress, remaining);
            } else {
                lastTime = timestamp; 
            }

            animationFrameId = requestAnimationFrame(animate);
        }
        
        animationFrameId = requestAnimationFrame(animate);
    }
});
