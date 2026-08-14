// =========================================================
// 🎨 ملف customIcons.js - إدارة الأيقونات المخصصة لتطبيق أليك
// =========================================================

// تعريف الأيقونات المخصصة (يمكنك استبدال الروابط بروابط أيقوناتك الخاصة أو SVG)
const customIconImages = {
    'custom-shop': 'https://cdn-icons-png.flaticon.com/512/3081/3081559.png',
    'custom-restaurant': 'https://cdn-icons-png.flaticon.com/512/3076/3076137.png',
    'custom-marker': 'https://cdn-icons-png.flaticon.com/512/684/684908.png'
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
