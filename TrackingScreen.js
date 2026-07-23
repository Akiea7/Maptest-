// =========================================================
// 🛠️ لوحة تحكم السيارة (عدل هاي الرقمين بس إذا شفت خلل)
// =========================================================
const CAR_SIZE = 0.05; // إذا السيارة عملاقة صغر الرقم (مثلاً 0.03)، وإذا صغيرة كبره (مثلاً 0.08)
const CAR_ANGLE_OFFSET = -90; // إذا السيارة تمشي بالعرض، غير هذا الرقم إلى (0 أو 90 أو 180 أو -90) لحد ما تصير عدلة
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
map.on('movestart', () => centerMarker.classList.add('bounce-marker'));
map.on('moveend', () => centerMarker.classList.remove('bounce-marker'));

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
            'layout': { 'icon-image': ['concat', ['get', 'icon'], '_11'], 'icon-size': 1.1, 'text-field': ['get', 'title'], 'text-font': safeMapFont, 'text-size': ['interpolate', ['linear'], ['zoom'], 14, 11, 17, 13, 20, 16], 'symbol-sort-key': ['coalesce', ['get', 'priority'], 10], 'text-offset': [0, 1.2], 'text-anchor': 'top', 'icon-allow-overlap': false, 'text-allow-overlap': false, 'icon-padding': 2, 'text-padding': 2, 'icon-optional': true },
            'paint': { 'text-color': '#4a4a4a', 'text-halo-color': '#ffffff', 'text-halo-width': 2 }
        });
    }

    // 2. تحميل المسار والسيارة
    map.loadImage('car-icon.png', (error, image) => {
        let finalIconId = 'car_11'; 
        if (!error) {
            map.addImage('car-top-view', image);
            finalIconId = 'car-top-view';
        }

        map.addSource('routeSource', { 'type': 'geojson', 'data': { 'type': 'Feature', 'properties': {}, 'geometry': { 'type': 'LineString', 'coordinates': ROUTE_COORDS } } });
        map.addLayer({ 'id': 'routeCasing', 'type': 'line', 'source': 'routeSource', 'layout': { 'line-cap': 'round', 'line-join': 'round' }, 'paint': { 'line-color': '#1e3a5f', 'line-width': 10, 'line-opacity': 0.8 } });
        map.addLayer({ 'id': 'routeCore', 'type': 'line', 'source': 'routeSource', 'layout': { 'line-cap': 'round', 'line-join': 'round' }, 'paint': { 'line-color': '#0088FF', 'line-width': 5 } });

        map.addSource('captainSource', {
            'type': 'geojson',
            'data': { 'type': 'Feature', 'properties': { 'bearing': 45 }, 'geometry': { 'type': 'Point', 'coordinates': ROUTE_COORDS[0] } }
        });

        map.addLayer({ 'id': 'captainPulse', 'type': 'circle', 'source': 'captainSource', 'paint': { 'circle-radius': 22, 'circle-color': '#0088FF', 'circle-opacity': 0.2, 'circle-pitch-alignment': 'map' } });

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

        // 3. المحاكاة الانسيابية
        let currentIndex = 0;
        let startTime = null;
        const speed = 0.00003; 

        function animateCar(timestamp) {
            if (currentIndex >= ROUTE_COORDS.length - 1) {
                currentIndex = 0; 
                startTime = null;
                requestAnimationFrame(animateCar);
                return;
            }

            const current = ROUTE_COORDS[currentIndex];
            const next = ROUTE_COORDS[currentIndex + 1];
            
            const dx = next[0] - current[0];
            const dy = next[1] - current[1];
            const distance = Math.sqrt(dx * dx + dy * dy);
            const duration = distance / speed; 

            if (!startTime) startTime = timestamp;
            let progress = (timestamp - startTime) / duration;

            if (progress >= 1) {
                currentIndex++;
                startTime = null;
                requestAnimationFrame(animateCar);
                return;
            }

            const baseBearing = Math.atan2(dx, dy) * (180 / Math.PI);
            const finalBearing = baseBearing + CAR_ANGLE_OFFSET;

            const lng = current[0] + dx * progress;
            const lat = current[1] + dy * progress;

            map.getSource('captainSource').setData({
                'type': 'Feature',
                'properties': { 'bearing': finalBearing },
                'geometry': { 'type': 'Point', 'coordinates': [lng, lat] }
            });

            requestAnimationFrame(animateCar);
        }
        
        requestAnimationFrame(animateCar);
    });
});
