// =========================================================
// 📍 UserLocation.js - الحل النهائي المضمون
// =========================================================

let userLocationMarker = null;
let watchId = null;
let hasInitializedGPS = false;

function initUserLocation(map) {
    if (!("geolocation" in navigator)) {
        alert("متصفحك لا يدعم تحديد الموقع");
        return;
    }

    // إيقاف أي تتبع سابق
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
    }

    // ✅ أولاً: احصل على الموقع الحالي مرة واحدة
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const accurateLocation = [
                position.coords.longitude,
                position.coords.latitude
            ];
            
            // أنشئ النقطة في الموقع الصحيح
            createUserLocationMarker(accurateLocation, position.coords.accuracy, map);
            
            // ✅ فقط في أول مرة: وسّط الخريطة على المستخدم
            if (!hasInitializedGPS) {
                map.jumpTo({
                    center: accurateLocation,
                    zoom: 16
                });
                hasInitializedGPS = true;
            }
        },
        (error) => {
            console.error("خطأ في الحصول على الموقع:", error);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );

    // ✅ ثانياً: راقب التغييرات المستمرة (بدون تحريك الخريطة!)
    watchId = navigator.geolocation.watchPosition(
        (position) => {
            const newLocation = [
                position.coords.longitude,
                position.coords.latitude
            ];

            // ✅ فقط حدّث موقع النقطة - بدون أي flyTo أو easeTo!
            if (userLocationMarker) {
                userLocationMarker.setLngLat(newLocation);
                
                // حدّث دائرة الدقة
                updateAccuracyCircle(position.coords.accuracy);
            }
        },
        (error) => {
            console.error("خطأ في تتبع الموقع:", error);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

function createUserLocationMarker(location, accuracy, map) {
    // إزالة marker قديم إن وجد
    if (userLocationMarker) {
        userLocationMarker.remove();
    }

    const el = document.createElement('div');
    el.className = 'user-location-container';
    
    // الحاوية بحجم صفر - المركز هو النقطة
    Object.assign(el.style, {
        position: 'relative',
        width: '0px',
        height: '0px',
        zIndex: '1000'
    });

    // 1. دائرة الدقة
    const accuracyCircle = document.createElement('div');
    accuracyCircle.className = 'accuracy-circle';
    const circleSize = Math.min(accuracy * 2, 200);
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
        transition: 'all 0.3s ease'
    });

    // 2. الموجة النبضية
    const pulse = document.createElement('div');
    Object.assign(pulse.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '60px',
        height: '60px',
        backgroundColor: 'rgba(66, 133, 244, 0.2)',
        borderRadius: '50%',
        transform: 'translate(-50%, -50%)',
        animation: 'gps-pulse 2s infinite ease-out',
        pointerEvents: 'none'
    });

    // 3. النقطة الزرقاء
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
    el.appendChild(pulse);
    el.appendChild(dot);

    // إضافة CSS
    if (!document.getElementById('user-location-styles')) {
        const style = document.createElement('style');
        style.id = 'user-location-styles';
        style.textContent = `
            @keyframes gps-pulse {
                0% { 
                    transform: translate(-50%, -50%) scale(0.3); 
                    opacity: 0.8; 
                }
                100% { 
                    transform: translate(-50%, -50%) scale(1.5); 
                    opacity: 0; 
                }
            }
        `;
        document.head.appendChild(style);
    }

    // إنشاء Marker
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
            const size = Math.min(accuracy * 2, 200);
            circle.style.width = `${size}px`;
            circle.style.height = `${size}px`;
        }
    }
}

// زر "موقعي الحالي"
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
    hasInitializedGPS = false;
}
