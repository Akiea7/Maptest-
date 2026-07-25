// =========================================================
// 📍 UserLocation.js - النسخة النهائية (الدبوس ثابت، والنقطة الزرقاء تثبت في موقعك)
// =========================================================

let userLocationMarker = null;
let watchId = null;
let lastValidLocation = null;
let isMapCenteredOnUser = false;

function initUserLocation(map) {
    if (!("geolocation" in navigator)) {
        console.warn("⚠️ المتصفح لا يدعم تحديد الموقع");
        return;
    }

    // تنظيف أي تتبع سابق
    if (watchId) navigator.geolocation.clearWatch(watchId);
    if (userLocationMarker) {
        userLocationMarker.remove();
        userLocationMarker = null;
    }

    console.log("🔍 جاري تحديد موقعك...");

    // 1. الحصول على الموقع الأولي
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const loc = [position.coords.longitude, position.coords.latitude];
            const accuracy = position.coords.accuracy;
            
            lastValidLocation = loc;
            console.log("✅ تم تحديد الموقع:", loc, "الدقة:", accuracy + "م");

            // إنشاء النقطة الزرقاء (بدون تحريك الخريطة)
            createBlueDot(loc, accuracy, map);
        },
        (error) => {
            console.error("❌ خطأ في GPS:", error.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    // 2. مراقبة التحديثات
    watchId = navigator.geolocation.watchPosition(
        (position) => {
            const accuracy = position.coords.accuracy;
            if (accuracy > 100) return; // تجاهل الدقة السيئة

            const newLoc = [position.coords.longitude, position.coords.latitude];
            lastValidLocation = newLoc;

            // تحديث النقطة الزرقاء فقط
            if (userLocationMarker) {
                userLocationMarker.setLngLat(newLoc);
                updateAccuracyCircle(accuracy);
            }
        },
        (error) => {
            console.error("❌ خطأ في التتبع:", error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

function createBlueDot(location, accuracy, map) {
    const el = document.createElement('div');
    el.style.position = 'relative';
    el.style.width = '0px';
    el.style.height = '0px';
    el.style.zIndex = '1000';
    el.style.pointerEvents = 'none';

    // دائرة الدقة
    const circle = document.createElement('div');
    circle.className = 'accuracy-circle';
    const size = Math.min(accuracy * 2, 150);
    circle.style.cssText = `
        position: absolute; top: 0; left: 0;
        width: ${size}px; height: ${size}px;
        background: rgba(66, 133, 244, 0.15);
        border: 1px solid rgba(66, 133, 244, 0.3);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
        transition: all 0.5s ease;
    `;

    // النقطة الزرقاء
    const dot = document.createElement('div');
    dot.style.cssText = `
        position: absolute; top: 0; left: 0;
        width: 16px; height: 16px;
        background: #4285F4;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.35);
        transform: translate(-50%, -50%);
        z-index: 10;
    `;

    el.appendChild(circle);
    el.appendChild(dot);

    // إضافة CSS
    if (!document.getElementById('gps-style')) {
        const style = document.createElement('style');
        style.id = 'gps-style';
        style.textContent = `
            @keyframes gps-pulse {
                0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0.8; }
                100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    userLocationMarker = new maplibregl.Marker({
        element: el,
        anchor: 'center'
    })
    .setLngLat(location)
    .addTo(map);
}

function updateAccuracyCircle(accuracy) {
    if (userLocationMarker) {
        const circle = userLocationMarker.getElement().querySelector('.accuracy-circle');
        if (circle) {
            const size = Math.min(accuracy * 2, 150);
            circle.style.width = `${size}px`;
            circle.style.height = `${size}px`;
        }
    }
}

// =========================================================
// 🎯 زر "موقعي" - يثبت الخريطة على موقعك
// =========================================================
function goToMyLocation(map) {
    if (lastValidLocation) {
        console.log("📍 تثبيت الخريطة على موقعك");
        map.flyTo({
            center: lastValidLocation,
            zoom: 16.5,
            speed: 1.2,
            duration: 1000
        });
        isMapCenteredOnUser = true; // علامة أن الخريطة مثبتة على موقعك
    } else {
        console.log("⏳ جاري تحديد الموقع...");
        initUserLocation(map);
    }
}

// =========================================================
// 🧹 تنظيف
// =========================================================
window.addEventListener('beforeunload', () => {
    if (watchId) navigator.geolocation.clearWatch(watchId);
});
