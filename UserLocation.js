// =========================================================
// 📍 UserLocation.js - النسخة النهائية (نقطة زرقاء ثابتة)
// =========================================================

let userLocationMarker = null;
let watchId = null;

function initUserLocation(map) {
    if (!("geolocation" in navigator)) {
        alert("متصفحك لا يدعم تحديد الموقع");
        return;
    }

    // إيقاف أي تتبع سابق
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
    }

    // إزالة marker قديم
    if (userLocationMarker) {
        userLocationMarker.remove();
        userLocationMarker = null;
    }

    // ✅ 1. جلب الموقع ووضع النقطة الزرقاء (بدون تحريك الخريطة أبداً)
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userLocation = [
                position.coords.longitude,
                position.coords.latitude
            ];
            const accuracy = position.coords.accuracy;

            console.log("📍 تم تحديد موقعك:", userLocation);
            
            // ✅ إنشاء النقطة الزرقاء في موقعك الحقيقي
            createBlueDot(userLocation, accuracy, map);
        },
        (error) => {
            console.error("❌ خطأ في GPS:", error);
        },
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    );

    // ✅ 2. مراقبة التحديثات (بدون تحريك الخريطة أبداً)
    watchId = navigator.geolocation.watchPosition(
        (position) => {
            const newLocation = [
                position.coords.longitude,
                position.coords.latitude
            ];
            const accuracy = position.coords.accuracy;

            // ✅ تحديث موقع النقطة الزرقاء فقط (لا تتحرك الخريطة)
            if (userLocationMarker) {
                userLocationMarker.setLngLat(newLocation);
                updateAccuracyCircle(accuracy);
            }
        },
        (error) => {
            console.error("❌ خطأ في التتبع:", error);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

function createBlueDot(location, accuracy, map) {
    const el = document.createElement('div');
    el.className = 'blue-dot-container';
    el.style.position = 'relative';
    el.style.width = '0';
    el.style.height = '0';
    el.style.zIndex = '1000';
    el.style.pointerEvents = 'none';

    // دائرة الدقة
    const accuracyCircle = document.createElement('div');
    accuracyCircle.className = 'accuracy-circle';
    const circleSize = Math.min(accuracy * 2, 150);
    Object.assign(accuracyCircle.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: `${circleSize}px`,
        height: `${circleSize}px`,
        backgroundColor: 'rgba(66, 133, 244, 0.15)',
        border: '1px solid rgba(66, 133, 244, 0.3)',
        borderRadius: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        transition: 'all 0.5s ease'
    });

    // النقطة الزرقاء
    const dot = document.createElement('div');
    Object.assign(dot.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '16px',
        height: '16px',
        backgroundColor: '#4285F4',
        borderRadius: '50%',
        border: '3px solid white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
        transform: 'translate(-50%, -50%)',
        zIndex: '10'
    });

    el.appendChild(accuracyCircle);
    el.appendChild(dot);

    // إضافة CSS
    if (!document.getElementById('blue-dot-styles')) {
        const style = document.createElement('style');
        style.id = 'blue-dot-styles';
        style.textContent = `
            @keyframes gps-pulse {
                0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0.8; }
                100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    // ✅ إنشاء النقطة الزرقاء في موقعك الحقيقي (بدون تحريك الخريطة)
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
// 🎯 زر "موقعي الحالي" - يحرك الخريطة فقط عند الضغط
// =========================================================
function goToMyLocation(map) {
    if (userLocationMarker) {
        const loc = userLocationMarker.getLngLat();
        map.flyTo({
            center: [loc.lng, loc.lat],
            zoom: 16.5,
            speed: 1.2,
            duration: 1000
        });
    } else {
        initUserLocation(map);
    }
}

// تنظيف
function stopUserLocationTracking() {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    if (userLocationMarker) {
        userLocationMarker.remove();
        userLocationMarker = null;
    }
}
