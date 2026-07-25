// =========================================================
// 🛠️ الإعدادات (Alek App) - تحديد الوجهة ورسم المسار الديناميكي
// =========================================================

maplibregl.setRTLTextPlugin('https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js', null, true);

const DEFAULT_COORD = [44.3783246, 33.6668412]; 

const map = new maplibregl.Map({
    container: 'map',
    style: 'alak-style.json?v=3',
    center: DEFAULT_COORD,
    zoom: 15.5,
    bearing: 0, 
    pitch: 0,   
    dragPitch: false, 
    pitchWithRotate: false, 
    antialias: true,
    attributionControl: false
});

// متغيرات الوجهة العالمية
window.destinationCoords = null;
window.isDestinationSet = false;
let moveTimeout = null;

const destinationPanel = document.getElementById('destination-panel');
const destinationCoordsEl = document.getElementById('destination-coords');
const confirmDestinationBtn = document.getElementById('confirm-destination-btn');
const cancelDestinationBtn = document.getElementById('cancel-destination-btn');
const moveHint = document.getElementById('move-hint');
const tripInfo = document.getElementById('trip-info');
const tripDistanceEl = document.getElementById('trip-distance');
const tripDurationEl = document.getElementById('trip-duration');
const closeTripInfoBtn = document.getElementById('close-trip-info');

// =========================================================
// 🌐 دالة رسم المسار الديناميكي عبر OSRM
// =========================================================
window.drawDynamicRoute = async function(from, to) {
    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${from[0]},${from[1]};${to[0]},${to[1]}?geometries=geojson&overview=full`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.routes || data.routes.length === 0) {
            alert('لا يمكن إيجاد مسار بين النقطتين');
            return;
        }
        
        const route = data.routes[0];
        const coords = route.geometry.coordinates;
        const distance = route.distance; 
        const duration = route.duration; 
        
        // إزالة الطبقات القديمة إن وجدت
        if (map.getLayer('dynamic-route-casing')) {
            map.removeLayer('dynamic-route-casing');
            map.removeLayer('dynamic-route-core');
        }
        if (map.getSource('dynamic-route-source')) {
            map.removeSource('dynamic-route-source');
        }
        
        map.addSource('dynamic-route-source', {
            'type': 'geojson',
            'data': {
                'type': 'Feature',
                'properties': {},
                'geometry': {
                    'type': 'LineString',
                    'coordinates': coords
                }
            }
        });
        
        map.addLayer({
            'id': 'dynamic-route-casing',
            'type': 'line',
            'source': 'dynamic-route-source',
            'layout': { 'line-cap': 'round', 'line-join': 'round' },
            'paint': { 'line-color': '#8ab4f8', 'line-width': 10, 'line-opacity': 0.5 }
        }, 'road_minor_casing'); 
        
        map.addLayer({
            'id': 'dynamic-route-core',
            'type': 'line',
            'source': 'dynamic-route-source',
            'layout': { 'line-cap': 'round', 'line-join': 'round' },
            'paint': { 'line-color': '#4285f4', 'line-width': 5, 'line-opacity': 0.9 }
        }, 'dynamic-route-casing');
        
        // تحديث واجهة معلومات الرحلة
        tripDistanceEl.textContent = distance > 1000 ? `${(distance/1000).toFixed(1)} كم` : `${Math.round(distance)} م`;
        const minutes = Math.ceil(duration / 60);
        tripDurationEl.textContent = minutes < 60 ? `${minutes} دقيقة` : `${Math.floor(minutes/60)} ساعة ${minutes%60} دقيقة`;
        
        tripInfo.classList.remove('hidden');
        
        // ضبط الحدود لتشمل الرحلة كاملة
        const bounds = new maplibregl.LngLatBounds();
        coords.forEach(coord => bounds.extend(coord));
        bounds.extend(from);
        bounds.extend(to);
        
        map.fitBounds(bounds, { padding: 80, duration: 1500, maxZoom: 17 });
        
    } catch (error) {
        console.error('خطأ في رسم المسار:', error);
    }
}

map.on('load', () => {
    // 🧭 البوصلة
    const compassEl = document.getElementById('compass-indicator');
    if (compassEl) {
        map.on('rotate', () => {
            const bearing = map.getBearing();
            compassEl.style.transform = `rotate(${-bearing}deg)`;
        });
        compassEl.addEventListener('click', () => { map.resetNorth({duration: 1000}); });
    }

    // تشغيل نظام الـ GPS
    if (typeof initGPS === 'function') {
        initGPS(map);
    }

    // إظهار تلميح التحريك بالبداية
    setTimeout(() => {
        if (!window.isDestinationSet && !window.userCurrentPosition) {
            moveHint.classList.remove('hidden');
            setTimeout(() => moveHint.classList.add('hidden'), 3000);
        }
    }, 2000);

    // تحديث إحداثيات الدبوس عند تحريك الخريطة
    map.on('move', () => {
        const center = map.getCenter();
        window.destinationCoords = [center.lng, center.lat];
        
        destinationPanel.classList.remove('hidden');
        destinationCoordsEl.textContent = `${window.destinationCoords[1].toFixed(5)}, ${window.destinationCoords[0].toFixed(5)}`;
    });

    // زر تأكيد الوجهة
    confirmDestinationBtn.addEventListener('click', async () => {
        if (!window.destinationCoords) return;
        
        window.isDestinationSet = true;
        destinationPanel.classList.add('hidden');
        
        if (window.userCurrentPosition) {
            await window.drawDynamicRoute(window.userCurrentPosition, window.destinationCoords);
        } else {
            alert('يرجى تفعيل زر GPS (أسفل اليمين) أولاً لتحديد موقع انطلاقك');
                // =========================================================
        // =========================================================
    // 📍 إضافة أماكن العراق (POI) من ملف places.js (مضمون 100%)
    // =========================================================
    
    // 1. إضافة مصدر البيانات
    map.addSource('custom-places', {
        'type': 'geojson',
        'data': placesData 
    });

    // 2. طبقة الدوائر (علامة زرقاء بإطار أبيض تظهر دائماً)
    map.addLayer({
        'id': 'custom-places-points',
        'type': 'circle',
        'source': 'custom-places',
        'paint': {
            'circle-radius': 7,
            'circle-color': '#1E3A8A',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-box-shadow': '0 2px 4px rgba(0,0,0,0.5)' // تأثير ظل خفيف
        }
    });

    // 3. طبقة النصوص (أسماء الأماكن تحت الدائرة)
    map.addLayer({
        'id': 'custom-places-layer',
        'type': 'symbol',
        'source': 'custom-places',
        'layout': {
            'text-field': ['get', 'title'],
            'text-font': ['Noto Sans Regular'],
            'text-size': 13,
            'text-offset': [0, 1.2], // تنزيل النص تحت الدائرة
            'text-anchor': 'top',
            'text-allow-overlap': true // إجبار الخريطة على إظهار النص دائماً
        },
        'paint': {
            'text-color': '#1E3A8A',
            'text-halo-color': '#ffffff',
            'text-halo-width': 2.5
        }
    });

    // =========================================================
    // 👆 تفاعل المستخدم: النقر على اسم المكان لتحديده كوجهة
    // =========================================================
    
    // تفعيل النقر على الدائرة أو النص
    map.on('click', 'custom-places-points', handlePlaceClick);
    map.on('click', 'custom-places-layer', handlePlaceClick);

    function handlePlaceClick(e) {
        const coordinates = e.features[0].geometry.coordinates.slice();
        const placeName = e.features[0].properties.title;

        // 1. تحريك الكاميرا والدبوس للمكان
        map.flyTo({
            center: coordinates,
            zoom: 16.5,
            speed: 1.5,
            curve: 1.2
        });

        // 2. تحديث لوحة الوجهة باسم المكان
        setTimeout(() => {
            if(window.destinationCoordsEl) {
                window.destinationCoordsEl.textContent = placeName;
                window.destinationCoordsEl.classList.remove('dir-ltr', 'text-left');
                window.destinationCoordsEl.classList.add('text-right', 'font-bold', 'text-blue-700');
            }
        }, 500); 
    }

    // تغيير شكل المؤشر ليدل على أنه قابل للنقر
    ['custom-places-points', 'custom-places-layer'].forEach(layer => {
        map.on('mouseenter', layer, () => {
            map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', layer, () => {
            map.getCanvas().style.cursor = '';
        });
    });


        }
    });

    // زر إلغاء الوجهة
    cancelDestinationBtn.addEventListener('click', () => {
        destinationPanel.classList.add('hidden');
        window.destinationCoords = null;
        window.isDestinationSet = false;
        tripInfo.classList.add('hidden');
        
        if (map.getLayer('dynamic-route-casing')) {
            map.removeLayer('dynamic-route-cainsg'); // typo safety
            map.removeLayer('dynamic-route-casing');
            map.removeLayer('dynamic-route-core');
        }
        if (map.getSource('dynamic-route-source')) {
            map.removeSource('dynamic-route-source');
        }
    });

    closeTripInfoBtn.addEventListener('click', () => {
        tripInfo.classList.add('hidden');
    });
});
