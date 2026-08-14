// =========================================================
// 📍 ملف places.js - قاعدة بيانات الأماكن (التحديث الشامل لحل الأيقونات)
// =========================================================

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
        // 1. إجبار الخريطة على انتظار تحميل كل الأيقونات (لمنع المربعات السوداء)
        const imagePromises = Object.entries(customIconImages).map(([key, url]) => {
            return new Promise((resolve) => {
                if (mapInstance.hasImage(key)) {
                    resolve();
                } else {
                    mapInstance.loadImage(url, (error, image) => {
                        if (!error) {
                            mapInstance.addImage(key, image);
                        } else {
                            console.warn("تأخير بتحميل الأيقونة:", key);
                        }
                        resolve(); // نكمل حتى لو اكو خطأ بصورة وحدة
                    });
                }
            });
        });
        await Promise.all(imagePromises); // ننتظر هنا

        // 2. جلب بيانات الأماكن
        const response = await fetch('./baghdad_places.json');
        const rawData = await response.json();
        
        const validPlaces = rawData.filter(place => 
            place.longitude && place.latitude && 
            !isNaN(Number(place.longitude)) && !isNaN(Number(place.latitude))
        );

        window.alekPlacesData = validPlaces;

        const features = validPlaces.map(place => {
            let iconName = 'custom-market'; // الأيقونة الافتراضية حالياً (يفضل مستقبلاً ترفع أيقونة دبوس عامة)
            let type = place.type ? place.type.toLowerCase() : "";
            let name = place.name ? place.name.toLowerCase() : "";
            
            // 3. الفلتر الذكي: توحيد الحروف العربية (ة/هـ، ي/ى، أ/ا) لضمان دقة البحث
            let searchString = (type + " " + name).replace(/ة/g, 'ه').replace(/أ|إ|آ/g, 'ا').replace(/ى/g, 'ي');

            if (searchString.includes("مطعم") || searchString.includes("restaurant") || searchString.includes("اكلات")) {
                iconName = "custom-restaurant";
            } else if (searchString.includes("مصرف") || searchString.includes("بنك") || searchString.includes("bank")) {
                iconName = "custom-bank";
            } else if (searchString.includes("مستشفي") || searchString.includes("hospital")) {
                iconName = "custom-hospital";
            } else if (searchString.includes("عياده") || searchString.includes("مجمع طبي") || searchString.includes("صيدليه") || searchString.includes("clinic")) {
                iconName = "custom-clinic";
            } else if (searchString.includes("جامع") || searchString.includes("مسجد") || searchString.includes("حسينيه") || searchString.includes("mosque")) {
                iconName = "custom-mosque";
            } else if (searchString.includes("مدرسه") || searchString.includes("اعداديه") || searchString.includes("متوسطه") || searchString.includes("school")) {
                iconName = "custom-school";
            } else if (searchString.includes("جامعه") || searchString.includes("كليه") || searchString.includes("university")) {
                iconName = "custom-university";
            } else if (searchString.includes("سوبر ماركت") || searchString.includes("اسواق") || searchString.includes("تسوق") || searchString.includes("supermarket")) {
                iconName = "custom-supermarket";
            } else if (searchString.includes("مقهي") || searchString.includes("كافيه") || searchString.includes("cafe")) {
                iconName = "custom-cafe";
            } else if (searchString.includes("وقود") || searchString.includes("بنزينخانه") || searchString.includes("محطه")) {
                iconName = "custom-gas-station";
            } else if (searchString.includes("مخبز") || searchString.includes("فرن") || searchString.includes("معجنات") || searchString.includes("bakery")) {
                iconName = "custom-bakery";
            } else if (searchString.includes("ملعب") || searchString.includes("رياضه") || searchString.includes("قاعه") || searchString.includes("منتزه") || searchString.includes("حديقه")) {
                // إذا لم نجد أيقونة للملاعب والمتنزهات، نضع المدرسة مؤقتاً أو الماركت للتمييز
                iconName = "custom-market"; 
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
            minzoom: 13,
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
            minzoom: 13,
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
            minzoom: 14,
            filter: ['!', ['has', 'point_count']],
            layout: {
                'icon-image': ['get', 'icon'], 
                'icon-size': 0.07, // 👈 الحجم تم تصغيره بشكل كبير حتى يكون متناسق
                'icon-allow-overlap': true
            }
        });

        mapInstance.addLayer({
            id: 'unclustered-point-label',
            type: 'symbol',
            source: 'places-source',
            minzoom: 14,
            filter: ['!', ['has', 'point_count']],
            layout: {
                'text-field': ['get', 'title'],
                'text-font': ['Noto Sans Bold'], // خليت الخط Bold حتى ينقرأ أسهل
                'text-offset': [0, 1.2], 
                'text-anchor': 'top',
                'text-size': 11
            },
            paint: {
                'text-color': '#333333',
                'text-halo-color': 'rgba(255, 255, 255, 0.9)',
                'text-halo-width': 2
            }
        });

        console.log(`✅ تم دمج الأماكن وحل مشكلة الأيقونات!`);

    } catch (error) {
        console.error("❌ صار خطأ بتحميل الأماكن:", error);
    }
}
