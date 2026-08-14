// =========================================================
// 📍 ملف places.js - قاعدة بيانات الأماكن (التحديث الشامل لحل المربعات السوداء)
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
        // 1. تحميل الصور وإضافتها بطريقة متزامنة ومضمونة
        const loadImages = async () => {
            const promises = Object.entries(customIconImages).map(([id, url]) => {
                return new Promise((resolve, reject) => {
                    if (mapInstance.hasImage(id)) {
                        resolve();
                        return;
                    }

                    // استخدام Image() العادية لضمان تحميلها بالكامل قبل إضافتها
                    const img = new Image();
                    img.crossOrigin = "Anonymous"; 
                    img.onload = () => {
                        try {
                            mapInstance.addImage(id, img);
                            resolve();
                        } catch (e) {
                            console.warn(`Error adding image ${id}:`, e);
                            resolve(); 
                        }
                    };
                    img.onerror = () => {
                        console.warn(`Failed to load image ${id} from ${url}`);
                        resolve(); 
                    };
                    img.src = url;
                });
            });
            await Promise.all(promises);
        };

        // ننتظر تحميل كل الصور أولاً
        await loadImages();

        // 2. جلب بيانات الأماكن
        const response = await fetch('./baghdad_places.json');
        const rawData = await response.json();
        
        const validPlaces = rawData.filter(place => 
            place.longitude && place.latitude && 
            !isNaN(Number(place.longitude)) && !isNaN(Number(place.latitude))
        );

        window.alekPlacesData = validPlaces;

        const features = validPlaces.map(place => {
            let iconName = 'custom-market'; 
            let type = place.type ? place.type.toLowerCase() : "";
            let name = place.name ? place.name.toLowerCase() : "";
            
            // الفلتر الذكي
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

        // 3. إضافة المصدر والطبقات بعد ضمان تحميل الصور
        if (!mapInstance.getSource('places-source')) {
            mapInstance.addSource('places-source', {
                type: 'geojson',
                data: geojsonData,
                cluster: true,
                clusterMaxZoom: 15, 
                clusterRadius: 50   
            });
        } else {
             mapInstance.getSource('places-source').setData(geojsonData);
        }

        if(!mapInstance.getLayer('clusters')) {
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
        }

        if(!mapInstance.getLayer('cluster-count')) {
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
        }

        if(!mapInstance.getLayer('unclustered-point')) {
            mapInstance.addLayer({
                id: 'unclustered-point',
                type: 'symbol', 
                source: 'places-source',
                minzoom: 14,
                filter: ['!', ['has', 'point_count']],
                layout: {
                    'icon-image': ['get', 'icon'], 
                    // صغرت الحجم أكثر بناءً على الفيديو
                    'icon-size': 0.05, 
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': true // يساعد في عدم التداخل
                }
            });
        }

        if(!mapInstance.getLayer('unclustered-point-label')) {
            mapInstance.addLayer({
                id: 'unclustered-point-label',
                type: 'symbol',
                source: 'places-source',
                minzoom: 14,
                filter: ['!', ['has', 'point_count']],
                layout: {
                    'text-field': ['get', 'title'],
                    'text-font': ['Noto Sans Bold'], 
                    'text-offset': [0, 1.5], // نزلنا النص شوية بسبب تغيير الحجم
                    'text-anchor': 'top',
                    'text-size': 11
                },
                paint: {
                    'text-color': '#333333',
                    'text-halo-color': 'rgba(255, 255, 255, 0.9)',
                    'text-halo-width': 2
                }
            });
        }

        console.log(`✅ تم دمج الأماكن وحل مشكلة المربعات السوداء!`);

    } catch (error) {
        console.error("❌ صار خطأ بتحميل الأماكن:", error);
    }
}
