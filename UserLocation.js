// =========================================================
// 📍 UserLocation.js - النسخة النهائية الثابتة
// =========================================================

let userCurrentMarker = null;
let watchId = null;
let isFirstLocation = true;

function initUserLocation(map) {
    if ("geolocation" in navigator) {
        // إيقاف أي تتبع سابق
        if (watchId) navigator.geolocation.clearWatch(watchId);
        
        watchId = navigator.geolocation.watchPosition(
            (position) => {
                const userLocation = [
                    position.coords.longitude, 
                    position.coords.latitude
                ];
                const accuracy = position.coords.accuracy;

                if (!userCurrentMarker) {
                    // إنشاء النقطة لأول مرة
                    createUserLocationMarker(userLocation, accuracy, map);
                    
                    // ✅ توسيط الخريطة فقط في أول مرة
                    if (isFirstLocation) {
                        map.jumpTo({ 
                            center: userLocation, 
                            zoom: 16 
                        });
                        isFirstLocation = false;
                    }
                } else {
                    // ✅ تحديث موقع النقطة فقط - بدون تحريك الخريطة نهائياً!
                    userCurrentMarker.setLngLat(userLocation);
                    
                    // تحديث حجم دائرة الدقة إذا تغيرت
                    const accuracyCircle = userCurrentMarker.getElement().querySelector('.accuracy-circle');
                    if (accuracyCircle) {
                        const size = Math.min(accuracy * 2, 200);
                        accuracyCircle.style.width = `${size}px`;
                        accuracyCircle.style.height = `${size}px`;
                    }
                }
            },
            (error) => {
                console.error("GPS Error:", error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    } else {
        alert("متصفحك لا يدعم تحديد الموقع");
    }
}

function createUserLocationMarker(location, accuracy, map) {
    const el = document.createElement('div');
    el.className = 'user-location-wrapper';
    
    // الحاوية بحجم صفر - المركز هو النقطة بالضبط
    Object.assign(el.style, {
        position: 'relative',
        width: '0',
        height: '0',
        zIndex: '100'
    });

    // 1. دائرة الدقة (Accuracy Circle)
    const accuracyCircle = document.createElement('div');
    accuracyCircle.className = 'accuracy-circle';
    Object.assign(accuracyCircle.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        transform: 'translate(-50%, -50%)',
        width: `${Math.min(accuracy * 2, 200)}px`,
        height: `${Math.min(accuracy * 2, 200)}px`,
        backgroundColor: 'rgba(66, 133, 244, 0.15)',
        border: '1px solid rgba(66, 133, 244, 0.3)',
        borderRadius: '50%',
        pointerEvents: 'none',
        transition: 'width 0.3s, height 0.3s'
    });

    // 2. الموجة النبضية
    const pulse = document.createElement('div');
    Object.assign(pulse.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        transform: 'translate(-50%, -50%)',
        width: '60px',
        height: '60px',
        backgroundColor: 'rgba(66, 133, 244, 0.2)',
        borderRadius: '50%',
        animation: 'user-pulse 2s infinite ease-out',
        pointerEvents: 'none'
    });

    // 3. النقطة الزرقاء المركزية
    const dot = document.createElement('div');
    Object.assign(dot.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        transform: 'translate(-50%, -50%)',
        width: '16px',
        height: '16px',
        backgroundColor: '#4285F4',
        borderRadius: '50%',
        border: '3px solid white',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        zIndex: '10'
    });

    el.appendChild(accuracyCircle);
    el.appendChild(pulse);
    el.appendChild(dot);

    // إضافة CSS
    if (!document.getElementById('user-location-css')) {
        const style = document.createElement('style');
        style.id = 'user-location-css';
        style.textContent = `
            @keyframes user-pulse {
                0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0.8; }
                100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    // إنشاء Marker
    userCurrentMarker = new maplibregl.Marker({
        element: el,
        anchor: 'center'
    })
    .setLngLat(location)
    .addTo(map);
}

// =========================================================
//  زر "موقعي" - يعيد الخريطة لموقع المستخدم
// =========================================================
function goToMyLocation(map) {
    if (userCurrentMarker) {
        const loc = userCurrentMarker.getLngLat();
        map.flyTo({
            center: [loc.lng, loc.lat],
            zoom: 16.5,
            speed: 1.2,
            essential: true
        });
    } else {
        // إذا لم يكن هناك marker، ابدأ التحديد
        initUserLocation(map);
    }
}

// =========================================================
// 🧹 تنظيف عند الحاجة
// =========================================================
function stopUserLocationTracking() {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    if (userCurrentMarker) {
        userCurrentMarker.remove();
        userCurrentMarker = null;
    }
    isFirstLocation = true;
}
