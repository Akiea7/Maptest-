// =========================================================
// 📍 places.js - النسخة الهجينة المضمونة (ذكاء صديقك + أمان التحميل)
// =========================================================

const customIconImages = {
    'custom-bank':        './icons/Bank.png',
    'custom-cafe':        './icons/Cafe.png',
    'custom-gas-station': './icons/Gas station.png',
    'custom-hospital':    './icons/Hospital.png',
    'custom-market':      './icons/Market.png',
    'custom-clinic':      './icons/Medical Clinic.png',
    'custom-mosque':      './icons/Mosque.png',
    'custom-restaurant':  './icons/Restaurant.png',
    'custom-school':      './icons/School.png',
    'custom-supermarket': './icons/Supermarket.png',
    'custom-university':  './icons/University.png',
    'custom-bakery':      './icons/bakery.png'
};

const DEFAULT_ICON = 'custom-market';
window.alekPlacesData = [];

// 1) تطبيع عربي كامل (نفس كود صديقك)
function normalizeArabic(s) {
    return (s || '')
        .toLowerCase()
        .replace(/[\u064B-\u0652\u0640\u0670]/g, '') 
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/[ىئ]/g, 'ي')
        .replace(/ؤ/g, 'و')
        .replace(/\s+/g, ' ')
        .trim();
}

// 2) قواعد التصنيف الذكية (الأطول والأخص أولاً)
const CLASSIFICATION_RULES = [
    ['custom-university', ['جامعه', 'كليه', 'universit', 'college']],
    ['custom-school',     ['مدرسه', 'ابتدائيه', 'ثانويه', 'اعداديه', 'متوسطه', 'روضه', 'اهليه', 'school']],
    ['custom-hospital',   ['مستشفي', 'مستوصف', 'hospital']],
    ['custom-clinic',     ['صيدليه', 'عياده', 'مجمع طبي', 'مركز صحي', 'clinic', 'pharmacy']],
    ['custom-mosque',     ['جامع', 'مسجد', 'حسينيه', 'مرقد', 'مقام', 'mosque']],
    ['custom-bakery',     ['مخبز', 'افران', 'فرن', 'معجنات', 'bakery']],
    ['custom-restaurant', ['مطعم', 'مطاعم', 'مقلى', 'مشوي', 'اكلات', 'بيتزا', 'restaurant', 'food']],
    ['custom-cafe',       ['مقهي', 'كافيه', 'كوفي', 'cafe', 'coffee']],
    ['custom-bank',       ['مصرف', 'بنك', 'bank']],
    ['custom-gas-station',['وقود', 'بنزين', 'محطه', 'gas', 'fuel']],
    ['custom-supermarket',['سوبر ماركت', 'سوبرماركت', 'اسواق', 'سوق', 'تسوق', 'هايبر', 'supermarket']],
    ['custom-market',     ['ملعب', 'نادي', 'رياضه', 'قاعه', 'منتزه', 'متنزه', 'حديقه', 'محل', 'بقاليه', 'مركز']]
];

function classifyPlace(place, loadedIcons) {
    const s = normalizeArabic((place.type || '') + ' ' + (place.name || ''));
    for (const [icon, keywords] of CLASSIFICATION_RULES) {
        if (keywords.some(k => s.includes(k)) && loadedIcons.has(icon)) {
            return icon;
        }
    }
    return loadedIcons.has(DEFAULT_ICON) ? DEFAULT_ICON : [...loadedIcons][0];
}

window.loadAlekPlaces = async function (mapInstance) {
    try {
        if (mapInstance.getSource('places-source')) return;

        // 3) التحميل الآمن وتصغير الصور (تخطي مشكلة الموبايل والـ CORS)
        const loadedIcons = new Set();
        const loadPromises = Object.entries(customIconImages).map(([key, url]) => {
            return new Promise((resolve) => {
                if (mapInstance.hasImage(key)) {
                    loadedIcons.add(key);
                    resolve();
                    return;
                }

                const img = new Image();
                img.crossOrigin = "Anonymous"; // 👈 هذا السطر السحري اللي يمنع كراش المتصفح
                img.onload = () => {
                    try {
                        const ICON_DISPLAY_SIZE = 48; 
                        const ICON_PIXEL_RATIO  = 2;  
                        const target = ICON_DISPLAY_SIZE * ICON_PIXEL_RATIO; 
                        const ratio  = target / Math.max(img.width, img.height);
                        
                        const canvas = document.createElement('canvas');
                        canvas.width  = Math.max(1, Math.round(img.width  * ratio));
                        canvas.height = Math.max(1, Math.round(img.height * ratio));
                        const ctx = canvas.getContext('2d');
                        
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        
                        mapInstance.addImage(key, canvas, { pixelRatio: ICON_PIXEL_RATIO });
                        loadedIcons.add(key);
                    } catch (e) {
                        // إذا فشل الكانفاس لأي سبب، نضيف الصورة الخام حتى ما تختفي الأماكن
                        mapInstance.addImage(key, img);
                        loadedIcons.add(key);
                    }
                    resolve();
                };
                img.onerror = () => {
                    console.warn('⚠️ فشل تحميل الأيقونة:', url);
                    resolve(); 
                };
                img.src = url;
            });
        });

        await Promise.all(loadPromises);

        if (loadedIcons.size === 0) {
            console.error("❌ لم يتم تحميل أي أيقونة، الأماكن لن تظهر.");
            return;
        }

        // 4) جلب البيانات
        const response  = await fetch('./baghdad_places.json');
        const rawData   = await response.json();
        const validPlaces = rawData.filter(p =>
            p.longitude && p.latitude &&
            !isNaN(Number(p.longitude)) && !isNaN(Number(p.latitude))
        );
        
        window.alekPlacesData = validPlaces;

        const features = validPlaces.map(place => ({
            type: 'Feature',
            properties: {
                title: place.name || 'بدون اسم',
                type:  place.type || 'غير محدد',
                icon:  classifyPlace(place, loadedIcons)
            },
            geometry: {
                type: 'Point',
                coordinates: [Number(place.longitude), Number(place.latitude)]
            }
        }));

        mapInstance.addSource('places-source', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features },
            cluster: true,
            clusterMaxZoom: 15,
            clusterRadius: 50
        });

        mapInstance.addLayer({
            id: 'clusters', type: 'circle', source: 'places-source', minzoom: 13,
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
            id: 'cluster-count', type: 'symbol', source: 'places-source', minzoom: 13,
            filter: ['has', 'point_count'],
            layout: {
                'text-field': '{point_count_abbreviated}',
                'text-font': ['Noto Sans Bold'],
                'text-size': 12
            },
            paint: { 'text-color': '#ffffff' }
        });

        mapInstance.addLayer({
            id: 'unclustered-point', type: 'symbol', source: 'places-source', minzoom: 14,
            filter: ['!', ['has', 'point_count']],
            layout: {
                'icon-image': ['get', 'icon'],
                'icon-size': 1,              // لأننا صغرنا الصورة بالـ Canvas فالحجم هنا 1 مثالي
                'icon-anchor': 'bottom',     // رأس الدبوس بالضبط عالمكان
                'icon-allow-overlap': true,
                'icon-ignore-placement': true
            }
        });

        mapInstance.addLayer({
            id: 'unclustered-point-label', type: 'symbol', source: 'places-source', minzoom: 14,
            filter: ['!', ['has', 'point_count']],
            layout: {
                'text-field': ['get', 'title'],
                'text-font': ['Noto Sans Bold'],
                'text-offset': [0, 0.5],     // تعديل بسيط للنص حتى يضبط وية الدبوس
                'text-anchor': 'top',
                'text-size': 11
            },
            paint: {
                'text-color': '#333333',
                'text-halo-color': 'rgba(255,255,255,0.9)',
                'text-halo-width': 2
            }
        });

        console.log('✅ تم دمج الأماكن: أحجام موحّدة وتصنيف دقيق بدون مشاكل!');
    } catch (error) {
        console.error('❌ صار خطأ بتحميل الأماكن:', error);
    }
};
