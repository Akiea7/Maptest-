// 1. الإحداثيات والمسار التجريبي
const ROUTE_COORDINATES = [
    [44.3615, 33.3152],
    [44.3630, 33.3165],
    [44.3650, 33.3180],
    [44.3675, 33.3200],
    [44.3700, 33.3220]
];

// 2. تهيئة الخريطة وربطها بالستايل مالتك
const map = new maplibregl.Map({
    container: 'map', // يربط الخريطة بالـ div اللي بالـ HTML
    style: 'https://akiea7.github.io/Maptest-/alak-style.json',
    center: ROUTE_COORDINATES[0],
    zoom: 17,
    pitch: 45,
    bearing: 0
});

// 3. لما تحمل الخريطة، نبدأ نرسم الطبقات
map.on('load', () => {
    
    // تحميل صورة السيارة (تأكد إنها مرفوعة ويا الملفات)
    map.loadImage('car-icon.png', (error, image) => {
        if (!error) {
            map.addImage('car-top-view', image);
        }

        // --- رسم المسار المزدوج (Casing & Core) ---
        map.addSource('route', {
            'type': 'geojson',
            'data': { 'type': 'Feature', 'properties': {}, 'geometry': { 'type': 'LineString', 'coordinates': ROUTE_COORDINATES } }
        });

        map.addLayer({
            'id': 'route-casing',
            'type': 'line',
            'source': 'route',
            'layout': { 'line-cap': 'round', 'line-join': 'round' },
            'paint': { 'line-color': '#FFFFFF', 'line-width': 10, 'line-opacity': 0.9 }
        });

        map.addLayer({
            'id': 'route-core',
            'type': 'line',
            'source': 'route',
            'layout': { 'line-cap': 'round', 'line-join': 'round' },
            'paint': { 'line-color': '#0066FF', 'line-width': 5 }
        });

        // --- رسم سيارة الكابتن (النقطة الأولية) ---
        map.addSource('captain', {
            'type': 'geojson',
            'data': {
                'type': 'Feature',
                'properties': { 'bearing': 45 },
                'geometry': { 'type': 'Point', 'coordinates': ROUTE_COORDINATES[0] }
            }
        });

        // النبض والظل والأيقونة
        map.addLayer({
            'id': 'captain-pulse',
            'type': 'circle',
            'source': 'captain',
            'paint': { 'circle-radius': 18, 'circle-color': '#0066FF', 'circle-opacity': 0.2, 'circle-pitch-alignment': 'map' }
        });

        map.addLayer({
            'id': 'captain-shadow',
            'type': 'circle',
            'source': 'captain',
            'paint': { 'circle-radius': 12, 'circle-color': '#000000', 'circle-opacity': 0.3, 'circle-translate': [0, 4] }
        });

        if (!error) {
            map.addLayer({
                'id': 'captain-icon',
                'type': 'symbol',
                'source': 'captain',
                'layout': {
                    'icon-image': 'car-top-view',
                    'icon-size': 0.18,
                    'icon-rotate': ['get', 'bearing'],
                    'icon-rotation-alignment': 'map',
                    'icon-pitch-alignment': 'map',
                    'icon-allow-overlap': true
                }
            });
        }

        // --- 4. المحاكاة (تحريك السيارة والكاميرا) ---
        let currentIndex = 0;
        setInterval(() => {
            if (currentIndex < ROUTE_COORDINATES.length - 1) {
                const current = ROUTE_COORDINATES[currentIndex];
                const next = ROUTE_COORDINATES[currentIndex + 1];
                
                // حساب زاوية دوران السيارة
                const dx = next[0] - current[0];
                const dy = next[1] - current[1];
                const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
                const bearing = (angle + 90 + 360) % 360;

                // تحديث موقع الكابتن بالخريطة
                map.getSource('captain').setData({
                    'type': 'Feature',
                    'properties': { 'bearing': bearing },
                    'geometry': { 'type': 'Point', 'coordinates': next }
                });

                // توجيه الكاميرا الذكية لملاحقة السيارة
                map.easeTo({ center: next, bearing: bearing, duration: 1500, easing: (t) => t });

                currentIndex++;
            } else {
                currentIndex = 0; 
            }
        }, 2000);
    });
});
