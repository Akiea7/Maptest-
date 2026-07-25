// =========================================================
// 📍 UserLocation.js - النسخة النهائية (بدون تحريك تلقائي للخريطة)
// =========================================================

let userLocationMarker = null;
let watchId = null;
let lastValidLocation = null;

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

            // إنشاء النقطة الزرقاء فقط (بدون تحريك الخريطة نهائياً)
            createBlueDot(loc, accuracy, map);
        },
        (error) => {
            console.error("❌ خطأ في GPS:", error.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    // 2. مراقبة التحديثات المستمرة
    watchId = navigator.geolocation.watchPosition(
        (position) => {
            const accuracy = position.coords.accuracy;
            
            // تجاهل القراءات غير الدقيقة
            if (accuracy > 100) return;

            const newLoc = [position.coords.longitude, position.coords.latitude];
            lastValidLocation = newLoc;

            // تحديث موقع النقطة الزرقاء فقط
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
    el.style.pointerEvents = 'none'; // يسمح بالنقر على الخريطة من خلاله

    // دائرة الدقة
    const circle = document.createElement('div');
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

    // الموجة النبضية
    const pulse = document.createElement('div');
    pulse.style.cssText = `
        position: absolute; top: 0; left: 0;
        width: 50px; height: 50px;
        background: rgba(66, 133, 244, 0.25);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        animation: gps-pulse 2s infinite ease-out;
        pointer-events: none;
    `;

    // النقطة الزرقاء المركزية
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
    el.appendChild(pulse);
    el.appendChild(dot);

    // إضافة أنيميشن CSS مرة واحدة
    if (!document.getElementById('gps-pulse-style')) {
        const style = document.createElement('style');
        style.id = 'gps-pulse-style';
        style.textContent = `
            @keyframes gps-pulse {
                0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0.8; }
                100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    // إضافة الـ Marker للخريطة
    userLocationMarker = new maplibregl.Marker({
        element: el,
        anchor: 'center'
    })
    .setLngLat(location)
    .addTo(map);
}

function updateAccuracyCircle(accuracy) {
    if (userLocationMarker) {
        const circle = userLocationMarker.getElement().querySelector('div'); // أول عنصر هو الدائرة
        if (circle) {
            const size = Math.min(accuracy * 2, 150);
            circle.style.width = `${size}px`;
            circle.style.height = `${size}px`;
        }
    }
}

// =========================================================
// 🎯 هذه الدالة الوحيدة المسموح لها بتحريك الخريطة لموقعك
// =========================================================
function goToMyLocation(map) {
    if (lastValidLocation) {
        console.log("📍 العودة لموقع المستخدم");
        map.flyTo({
            center: lastValidLocation,
            zoom: 16.5,
            speed: 1.2,
            duration: 1000
        });
    } else {
        console.log("⏳ جاري تحديد الموقع...");
        initUserLocation(map);
    }
}

// تنظيف عند إغلاق الصفحة
window.addEventListener('beforeunload', () => {
    if (watchId) navigator.geolocation.clearWatch(watchId);
});
