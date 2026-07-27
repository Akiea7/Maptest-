// =========================================================
// 📍 ملف places.js - قاعدة بيانات الأماكن (مربوطة بملف JSON)
// =========================================================

// متغير عالمي نخزن بيه الداتا حتى نستخدمه بشريط البحث لاحقاً
window.alekPlacesData = [];

window.loadAlekPlaces = async function(mapInstance) {
    try {
        // 1. قراءة ملف الأماكن الكامل (تأكد إن الملف baghdad_places.json مرفوع بنفس المجلد)
        const response = await fetch('./baghdad_places.json');
        const rawData = await response.json();
        window.alekPlacesData = rawData;

        // 2. تحويل البيانات لصيغة GeoJSON اللي تفهمها الخريطة
        const features = rawData.map(place => {
            return {
                "type": "Feature",
                "properties": {
                    "title": place.name || "بدون اسم",
                    "type": place.type || "غير محدد"
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [place.longitude, place.latitude] // الإحداثيات: الطول ثم العرض
                }
            };
        });

        const geojsonData = {
            "type": "FeatureCollection",
            "features": features
        };

        // 3. إضافة البيانات كمصدر (Source) مع تفعيل نظام التجميع (Cluster) لمنع الكراش
        mapInstance.addSource('places-source', {
            type: 'geojson',
            data: geojsonData,
            cluster: true,
            clusterMaxZoom: 15, // الزوم اللي توقف عنده الدوائر المجمعة وتتحول لنقاط
            clusterRadius: 50   // مسافة التجميع (كل ما كبر الرقم تجمعت مناطق أكثر بدائرة وحدة)
        });

        // 4. طبقة الدوائر المجمعة (باللون الأزرق الخاص بـ Alek)
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

        // 5. طبقة الأرقام داخل الدوائر
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

        // 6. طبقة النقاط المفردة (من تقرب الخريطة كلش)
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

        // 7. طبقة أسماء الأماكن المفردة
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

        console.log("✅ تم دمج الأماكن بالخريطة بنجاح!");

    } catch (error) {
        console.error("❌ صار خطأ بتحميل الأماكن:", error);
    }
}
