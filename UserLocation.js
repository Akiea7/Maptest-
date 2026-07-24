// =========================================================
// 📍 UserLocation.js - النسخة النهائية (بدون تحريك الخريطة)
// =========================================================

let userLocationMarker = null;
let watchId = null;
let lastValidLocation = null;
let hasSetInitialPosition = false;

function initUserLocation(map) {
    if (!("geolocation" in navigator)) {
        console.warn("️ المتصفح لا يدعم تحديد الموقع");
        return;
    }

    // إيقاف أي تتبع سابق
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
    }

    // إزالة marker سابق إن وجد
    if (userLocationMarker) {
        userLocationMarker.remove();
        userLocationMarker = null;
    }

    console.log("🔍 جاري البحث عن موقعك...");

    // ✅ الحصول على الموقع مرة واحدة
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lng = position.coords.longitude;
            const lat = position.coords.latitude;
            const accuracy = position.coords.accuracy;

            console.log("✅ تم الحصول على الموقع:", { lng, lat, accuracy: accuracy + "م" });

            const userLocation = [lng, lat];
            lastValidLocation = userLocation;

            // إنشاء النقطة الزرقاء
            createUserLocationMarker(userLocation, accuracy);

            // ✅ توسيط الخريطة فقط في أول مرة يتم فيها تحديد الموقع
            // ولأول مرة فقط - بعدها المستخدم يتحكم بالخريطة
            if (!hasSetInitialPosition) {
                setTimeout(() => {
                    map.jumpTo({
                        center: userLocation,
                        zoom: 16
                    });
                    hasSetInitialPosition = true;
                    console.log("📍 تم توسيط الخريطة على موقعك لأول مرة");
                }, 500);
            }
        },
        (error) => {
            console.error(" خطأ في GPS:", error.message);
            
            let errorMsg = "تعذر تحديد موقعك";
            switch(error.code) {
                case 1: errorMsg = "يرجى السماح بالوصول للموقع من إعدادات المتصفح"; break;
                case 2: errorMsg = "الموقع غير متاح حالياً"; break;
                case 3: errorMsg = "انتهت مهلة تحديد الموقع"; break;
            }
            console.warn("⚠️", errorMsg);
        },
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    );

    // ✅ مراقبة التحديثات المستمرة - بدون تحريك الخريطة نهائياً!
    watchId = navigator.geolocation.watchPosition(
        (position) => {
            const lng = position.coords.longitude;
            const lat = position.coords.latitude;
            const accuracy = position.coords.accuracy;

            // فلتر: تجاهل التحديثات غير الدقيقة
            if (accuracy > 100) {
                console.log("️ تجاهل تحديث - دقة منخفضة:", accuracy + "م");
                return;
            }

            const newLocation = [lng, lat];

            // فلتر: تجاهل القفزات الكبيرة غير المنطقية
            if (lastValidLocation) {
                const distance = calculateDistance(lastValidLocation, newLocation);
                if (distance > 200) { // أكثر من 200 متر في تحديث واحد
                    console.log("️ تجاهل قفزة كبيرة:", distance + "م");
                    return;
                }
            }

            console.log("🔄 تحديث الموقع:", newLocation, "الدقة:", accuracy + "م");

            // ✅ تحديث موقع النقطة الزرقاء فقط - بدون تحريك الخريطة!
            if (userLocationMarker) {
                userLocationMarker.setLngLat(newLocation);
                updateAccuracyCircle(accuracy);
            }

            lastValidLocation = newLocation;
        },
        (error) => {
            console.error("❌ خطأ في التتبع المستمر:", error);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

function createUserLocationMarker(location, accuracy) {
    const el = document.createElement('div');
    el.className = 'user-gps-location';
    
    Object.assign(el.style, {
        position: 'relative',
        width: '0px',
        height: '0px',
        zIndex: '1000',
        pointerEvents: 'none' // حتى لا يمنع التفاعل مع الخريطة
    });

    // 1. دائرة الدقة (Accuracy Circle)
    const accuracyCircle = document.createElement('div');
    accuracyCircle.className = 'gps-accuracy-circle';
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

    // 2. الموجة النبضية
    const pulse = document.createElement('div');
    Object.assign(pulse.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '50px',
        height: '50px',
        backgroundColor: 'rgba(66, 133, 244, 0.25)',
        borderRadius: '50%',
        transform: 'translate(-50%, -50%)',
        animation: 'gps-pulse-animation 2s infinite ease-out',
        pointerEvents: 'none'
    });

    // 3. النقطة الزرقاء المركزية
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

    // إضافة CSS للحركة
    if (!document.getElementById('gps-marker-styles')) {
        const style = document.createElement('style');
        style.id = 'gps-marker-styles';
        style.textContent = `
            @keyframes gps-pulse-animation {
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
    .addTo(window.map); // استخدام window.map المتاح عالمياً

    console.log("✅ تم إنشاء النقطة الزرقاء في:", location);
}

function updateAccuracyCircle(accuracy) {
    if (userLocationMarker) {
        const circle = userLocationMarker.getElement().querySelector('.gps-accuracy-circle');
        if (circle) {
            const size = Math.min(accuracy * 2, 150);
            circle.style.width = `${size}px`;
            circle.style.height = `${size}px`;
        }
    }
}

function calculateDistance(a, b) {
    const R = 6371000;
    const dLat = (b[1] - a[1]) * Math.PI / 180;
    const dLon = (b[0] - a[0]) * Math.PI / 180;
    const lat1 = a[1] * Math.PI / 180;
    const lat2 = b[1] * Math.PI / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

// =========================================================
// 🎯 زر "موقعي الحالي" - يعيد الخريطة لموقع المستخدم
// =========================================================
function goToMyLocation(map) {
    if (lastValidLocation) {
        console.log(" العودة لموقع المستخدم");
        map.flyTo({
            center: lastValidLocation,
            zoom: 16.5,
            speed: 1.2,
            duration: 1000
        });
    } else {
        console.log("️ لا يوجد موقع محفوظ، جاري التحديد...");
        initUserLocation(map);
    }
}

// =========================================================
// 🧹 دالة التنظيف
// =========================================================
function stopUserLocationTracking() {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    if (userLocationMarker) {
        userLocationMarker.remove();
        userLocationMarker = null;
    }
    lastValidLocation = null;
}

// تنظيف عند إغلاق الصفحة
window.addEventListener('beforeunload', stopUserLocationTracking);
