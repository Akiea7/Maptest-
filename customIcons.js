// =========================================================
// 🎨 ملف customIcons.js - إدارة الأيقونات المخصصة لتطبيق أليك
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

// دالة تحميل الأيقونات داخل خريطة Maplibre
function loadCustomIcons(mapInstance) {
    for (const [key, url] of Object.entries(customIconImages)) {
        mapInstance.loadImage(url, (error, image) => {
            if (error) {
                console.error(`خطأ في تحميل الأيقونة ${key}:`, error);
                return;
            }
            if (!mapInstance.hasImage(key)) {
                mapInstance.addImage(key, image);
            }
        });
    }
}
