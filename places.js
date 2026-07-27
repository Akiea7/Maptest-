// =========================================================
// 📍 ملف places.js - قاعدة بيانات الأماكن (النسخة الآمنة المفلترة)
// =========================================================

window.alekPlacesData = [];

window.loadAlekPlaces = async function(mapInstance) {
    try {
        const response = await fetch('./baghdad_places.json');
        const rawData = await response.json();
        
        // هنا الفلتر الذكي: نستبعد أي مكان ما بيه إحداثيات أو إحداثياته مو أرقام
        const validPlaces = rawData.filter(place => 
            place.longitude && place.latitude && 
            !isNaN(Number(place.longitude)) && !isNaN(Number(place.latitude))
        );

        window.alekPlacesData = validPlaces;

        const features = validPlaces.map(place => {
            return {
                "type": "Feature",
                "properties": {
                    "title": place.name || "بدون اسم",
                    "type": place.type || "غير محدد"
                },
                "geometry": {
                    "type": "Point",
                    // تحويل الإحداثيات لأرقام صحيحة إجبارياً لتجنب الكراش
                    "coordinates": [Number(place.longitude), Number(place.latitude)] 
                }
            };
        });

        const geojsonData = {
            "type": "FeatureCollection",
            "features": features
        };

        mapInstance.addSource('places-source', {
            type: 'geojson',
            data: geojsonData,
            cluster: true,
            clusterMaxZoom: 15, 
            clusterRadius: 50   
        });

        mapInstance.addLayer({
            id: 'clusters',
            type: 'circle',
            source: 'places-source',
            filter: ['has', 'point_count'],
            paint: {
                'circle-color': '#4285f4',
                'circle-radius': ['step', ['get', 'point_count'], 15, 100, 20, 750, 25],
                'circle-opacity': 0.9,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff'
            }
        });

        mapInstance.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'places-source',
            filter: ['has', 'point_count'],
            layout: {
                'text-field': '{point_count_abbreviated}',
                'text-font': ['Noto Sans Bold'],
                'text-size': 12
            },
            paint: { 'text-color': '#ffffff' }
        });

        mapInstance.addLayer({
            id: 'unclustered-point',
            type: 'circle',
            source: 'places-source',
            filter: ['!', ['has', 'point_count']],
            paint: {
                'circle-color': '#ea4335',
                'circle-radius': 6,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff'
            }
        });

        mapInstance.addLayer({
            id: 'unclustered-point-label',
            type: 'symbol',
            source: 'places-source',
            filter: ['!', ['has', 'point_count']],
            layout: {
                'text-field': ['get', 'title'],
                'text-font': ['Noto Sans Regular'],
                'text-offset': [0, 1.2],
                'text-anchor': 'top',
                'text-size': 12
            },
            paint: {
                'text-color': '#333333',
                'text-halo-color': '#ffffff',
                'text-halo-width': 2
            }
        });

        console.log(`✅ تم دمج ${validPlaces.length} مكان صحيح وتجاهل الأماكن التالفة!`);

    } catch (error) {
        console.error("❌ صار خطأ بتحميل الأماكن:", error);
    }
}
