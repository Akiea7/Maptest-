// =========================================================
// 📍 ملف places.js - قاعدة بيانات الأماكن مع الأيقونات المخصصة
// =========================================================

// مسارات الأيقونات اللي رفعتها
const customIconImages = {
    'custom-bank': './icons/Bank.png',
    'custom-cafe': './icons/Cafe.png',
    'custom-gas-station': './icons/Gas station.png',
    'custom-hospital': './icons/Hospital.png',
    'custom-market': './icons/Market.png',
    'custom-clinic': './icons/Medical Clinic.png',
    'custom-mosque': './icons/Mosque.png',
    'custom-restaurant': './icons/Restaurant.png',
    'custom-school': './icons/School.png',
    'custom-supermarket': './icons/Supermarket.png',
    'custom-university': './icons/University.png',
    'custom-bakery': './icons/bakery.png'
};

window.alekPlacesData = [];

window.loadAlekPlaces = async function(mapInstance) {
    try {
        // 1. تحميل الأيقونات داخل الخريطة أولاً
        for (const [key, url] of Object.entries(customIconImages)) {
            if (!mapInstance.hasImage(key)) {
                mapInstance.loadImage(url, (error, image) => {
                    if (!error) {
                        mapInstance.addImage(key, image);
                    }
                });
            }
        }

        // 2. جلب بيانات الأماكن
        const response = await fetch('./baghdad_places.json');
        const rawData = await response.json();
        
        // فلترة الأماكن اللي إحداثياتها صحيحة
        const validPlaces = rawData.filter(place => 
            place.longitude && place.latitude && 
            !isNaN(Number(place.longitude)) && !isNaN(Number(place.latitude))
        );

        window.alekPlacesData = validPlaces;

        const features = validPlaces.map(place => {
            let iconName = 'custom-market'; // الأيقونة الافتراضية
            let type = place.type ? place.type.toLowerCase() : "";
            let name = place.name ? place.name.toLowerCase() : "";
            let searchString = type + " " + name;

            // الفلتر الذكي لاختيار الأيقونة
            if (searchString.includes("مطعم") || searchString.includes("restaurant") || searchString.includes("اكلات")) {
                iconName = "custom-restaurant";
            } else if (searchString.includes("مصرف") || searchString.includes("بنك") || searchString.includes("bank")) {
                iconName = "custom-bank";
            } else if (searchString.includes("مستشفى") || searchString.includes("hospital")) {
                iconName = "custom-hospital";
            } else if (searchString.includes("عيادة") || searchString.includes("مجمع طبي") || searchString.includes("صيدلية") || searchString.includes("clinic")) {
                iconName = "custom-clinic";
            } else if (searchString.includes("جامع") || searchString.includes("مسجد") || searchString.includes("حسينية") || searchString.includes("mosque")) {
                iconName = "custom-mosque";
            } else if (searchString.includes("مدرسة") || searchString.includes("اعدادية") || searchString.includes("متوسطة") || searchString.includes("school")) {
                iconName = "custom-school";
            } else if (searchString.includes("جامعة") || searchString.includes("كلية") || searchString.includes("university")) {
                iconName = "custom-university";
            } else if (searchString.includes("سوبر ماركت") || searchString.includes("اسواق") || searchString.includes("supermarket")) {
                iconName = "custom-supermarket";
            } else if (searchString.includes("مقهى") || searchString.includes("كافيه") || searchString.includes("cafe")) {
                iconName = "custom-cafe";
            } else if (searchString.includes("وقود") || searchString.includes("بنزينخانة") || searchString.includes("محطة")) {
                iconName = "custom-gas-station";
            } else if (searchString.includes("مخبز") || searchString.includes("فرن") || searchString.includes("معجنات") || searchString.includes("bakery")) {
                iconName = "custom-bakery";
            }

            return {
                "type": "Feature",
                "properties": {
                    "title": place.name || "بدون اسم",
                    "type": place.type || "غير محدد",
                    "icon": iconName
                },
                "geometry": {
                    "type": "Point",
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
            type: 'symbol', 
            source: 'places-source',
            filter: ['!', ['has', 'point_count']],
            layout: {
                'icon-image': ['get', 'icon'], 
                'icon-size': 0.4, // صغرت الأيقونة شوية حتى تطلع مرتبة
                'icon-allow-overlap': true
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

        console.log(`✅ تم دمج ${validPlaces.length} مكان بالأيقونات الجديدة!`);

    } catch (error) {
        console.error("❌ صار خطأ بتحميل الأماكن:", error);
    }
}
