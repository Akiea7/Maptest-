// =========================================================
// 📍 places.js - النسخة السريعة (بدون انتظار + حجم إجباري)
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

// 1) تطبيع عربي كامل
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

// 2) قواعد التصنيف الذكية
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

function classifyPlace(place) {
    const s = normalizeArabic((place.type || '') + ' ' + (place.name || ''));
    for (const [icon, keywords] of CLASSIFICATION_RULES) {
        if (keywords.some(k => s.includes(k))) {
            return icon;
        }
    }
    return DEFAULT_ICON;
}

window.loadAlekPlaces = async function (mapInstance) {
    try {
        if (mapInstance.getSource('places-source')) return;

        // 3) تحميل البيانات أولاً (فوراً وبدون انتظار الصور)
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
                icon:  classifyPlace(place) // نحدد اسم الأيقونة مسبقاً
            },
            geometry: {
                type: 'Point',
                coordinates: [Number(place.longitude), Number(place.latitude)]
            }
        }));

        // إضافة المصدر والطبقات مباشرة للخريطة
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
                'icon-size': 1, // الحجم ثابت لأننا راح نصغر الصورة يدوياً
                'icon-anchor': 'bottom',
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
                'text-offset': [0, 0.5],
                'text-anchor': 'top',
                'text-size': 11
            },
            paint: {
                'text-color': '#333333',
                'text-halo-color': 'rgba(255,255,255,0.9)',
                'text-halo-width': 2
            }
        });

        // 4) تحميل الصور بالخلفية وتصغيرها إجبارياً
        // هذا الكود ما راح يوكف الخريطة، الأيقونات تظهر من تكمل تحميل
        Object.entries(customIconImages).forEach(([key, url]) => {
            if (!mapInstance.hasImage(key)) {
                const img = new Image();
                // أزلنا crossOrigin لأن الملفات على نفس السيرفر
                img.onload = () => {
                    // إنشاء Canvas بحجم صغير وثابت (مثلاً 64 بكسل)
                    const canvas = document.createElement('canvas');
                    const TARGET_SIZE = 64; 
                    canvas.width = TARGET_SIZE;
                    canvas.height = TARGET_SIZE;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    
                    // رسم الصورة بحجم 64x64 إجبارياً مهما كان حجمها الأصلي
                    ctx.drawImage(img, 0, 0, TARGET_SIZE, TARGET_SIZE);
                    
                    // إضافتها للخريطة
                    if (!mapInstance.hasImage(key)) {
                        mapInstance.addImage(key, canvas);
                    }
                };
                img.src = url;
            }
        });

        console.log('✅ تم تحميل بيانات الأماكن، جاري جلب الأيقونات بالخلفية...');
    } catch (error) {
        console.error('❌ صار خطأ بتحميل الأماكن:', error);
    }
};
