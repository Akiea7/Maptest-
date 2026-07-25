// =========================================================
// 🛠️ الإعدادات (Alek App) - التوجيه الحقيقي على الشوارع
// =========================================================
const CAR_SIZE_PX = 48; 
const CAR_ANGLE_OFFSET = 0; 
const MIN_VISIBLE_ZOOM = 13.5; 

// 📍 إحداثيات التجربة بالطارمية
const DRIVER_COORD = [44.3735000, 33.6645000]; // موقع الكابتن
const CUSTOMER_COORD = [44.3835000, 33.6692000]; // موقع الزبون
// =========================================================

maplibregl.setRTLTextPlugin('https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js', null, true);

const map = new maplibregl.Map({
    container: 'map',
    style: 'alak-style.json?v=3',
    center: DRIVER_COORD,
    zoom: 15.5,
    bearing: 0, 
    pitch: 0,   
    dragPitch: false, 
    pitchWithRotate: false, 
    antialias: true,
    attributionControl: false
});

let animationFrameId = null;

// =========================================================
// 🧮 دوال العمليات الحسابية
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

// =========================================================
// 🌐 دالة جلب المسار الحقيقي من سيرفر OSRM
// =========================================================
async function getRealRoute(start, end) {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data.routes[0].geometry.coordinates;
    } catch (error) {
        console.error("خطأ في جلب المسار:", error);
        return [start, end];
    }
}

map.on('load', async () => {
    
    // ✅ لا تفعل أي شيء تلقائياً - الخريطة تبقى في مكانها
    // (النقطة الزرقاء ستحصل على موقعك عبر GPS لكنها لن تتحرك معك تلقائياً)
    
    // 1. إضافة مصادر المسار
    map.addSource('routeSource', {
        'type': 'geojson',
        'data': { 'type': 'Feature', 'properties': {}, 'geometry': { 'type': 'LineString', 'coordinates': [] } }
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

    // 2. جلب المسار
    const realRouteCoords = await getRealRoute(DRIVER_COORD, CUSTOMER_COORD);
    map.getSource('routeSource').setData({
        'type': 'Feature',
        'properties': {},
        'geometry': { 'type': 'LineString', 'coordinates': realRouteCoords }
    });

    // 3. علامة الزبون
    new maplibregl.Marker({ color: 'red' }).setLngLat(CUSTOMER_COORD).addTo(map);

    // 4. إعداد السيارة
    const carImg = new Image();
    carImg.src = 'car-icon.png'; 

    carImg.onload = () => {
        // ... (كود السيارة كما هو) ...
    };
});
