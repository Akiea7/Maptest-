// =========================================================
// 📍 ملف places.js - قاعدة بيانات الأماكن (النسخة الآمنة مع الأيقونات المخصصة)
// =========================================================

window.alekPlacesData = [];

window.loadAlekPlaces = async function(mapInstance) {
    try {
        const response = await fetch('./baghdad_places.json');
        const rawData = await response.json();
        
        // فلترة الأماكن اللي إحداثياتها صحيحة
        const validPlaces = rawData.filter(place => 
            place.longitude && place.latitude && 
            !isNaN(Number(place.longitude)) && !isNaN(Number(place.latitude))
        );

        window.alekPlacesData = validPlaces;

        const features = validPlaces.map(place => {
            // ==========================================
            // 🎯 الفلتر الذكي لاختيار الأيقونة حسب نوع المكان
            // ==========================================
            let iconName = 'custom-market'; // الأيقونة الافتراضية إذا ما لكه النوع
            let type = place.type ? place.type.toLowerCase() : "";
            let name = place.name ? place.name.toLowerCase() : "";
            
            // ندمج الاسم والنوع حتى نزيد دقة البحث عن الكلمة
            let searchString = type + " " + name;

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
                    "icon": iconName // ضفنا اسم الأيقونة هنا
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

        // طبقة التجمعات (الدوائر الزرقاء اللي بيها أرقام)
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

        // ==========================================
        // 🔄 تحويل النقاط الفردية من دوائر إلى أيقوناتك
        // ==========================================
        mapInstance.addLayer({
            id: 'unclustered-point',
            type: 'symbol', // حولناها من circle إلى symbol
            source: 'places-source',
            filter: ['!', ['has', 'point_count']],
            layout: {
                'icon-image': ['get', 'icon'], // يسحب اسم الأيقونة من الفلتر الفوك
                'icon-size': 0.6, // تكدر تكبر وتصغر الأيقونة من هنا (0.5 إلى 1.0)
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
                'text-offset': [0, 1.5], // نزلنا النص شوية حتى ميغطي على الأيقونة
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
