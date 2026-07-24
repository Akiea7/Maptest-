// =========================================================
// 📍 UserLocation.js - النقطة الزرقاء لموقع GPS فقط
// =========================================================

let userGPSMarker = null;
let watchId = null;
let userGPSLocation = null; // تخزين موقع GPS الحقيقي

function initUserLocation(map) {
    if (!("geolocation" in navigator)) {
        console.warn("⚠️ المتصفح لا يدعم تحديد الموقع");
        return;
    }

    // إيقاف أي تتبع سابق
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
    }

    // إزالة أي marker سابق
    if (userGPSMarker) {
        userGPSMarker.remove();
        userGPSMarker = null;
    }

    console.log("🔄 جاري الحصول على موقع GPS...");

    // ✅ الخطوة 1: الحصول على الموقع الدقيق مرة واحدة
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lng = position.coords.longitude;
            const lat = position.coords.latitude;
            const accuracy = position.coords.accuracy;

            userGPSLocation = [lng, lat];

            console.log("✅ تم الحصول على الموقع:", { lng, lat, accuracy });

            // إنشاء النقطة الزرقاء في موقع GPS
            createGPSMarker([lng, lat], accuracy, map);

            // ⚠️ مهم جداً: لا تحرك الخريطة هنا!
            // اترك الخريطة كما هي، المستخدم هو الذي يتحكم بها
            // الدبوس في الوسط ثابت، والنقطة الزرقاء ستظهر في موقعك
        },
        (error) => {
            console.error("❌ خطأ في GPS:", error.message);
            
            let errorMsg = "تعذر تحديد موقعك.";
            if (error.code === 1) {
                errorMsg = "يرجى السماح بالوصول للموقع من إعدادات المتصفح";
            } else if (error.code === 2) {
                errorMsg = "خدمة الموقع غير متاحة";
            } else if (error.code === 3) {
                errorMsg = "انتهت مهلة تحديد الموقع";
            }
            
            alert(errorMsg);
        },
        {
            enableHighAccuracy: true,  // استخدام GPS
            timeout: 15000,             // انتظار 15 ثانية
            maximumAge: 0               // عدم استخدام موقع مخزن
        }
    );

    // ✅ الخطوة 2: مراقبة التحديثات المستمرة
    watchId = navigator.geolocation.watchPosition(
        (position) => {
            const lng = position.coords.longitude;
            const lat = position.coords.latitude;
            const accuracy = position.coords.accuracy;

            userGPSLocation = [lng, lat];

            console.log("📍 تحديث GPS:", { lng, lat, accuracy });

            // تحديث موقع النقطة الزرقاء فقط
            if (userGPSMarker) {
                userGPSMarker.setLngLat([lng, lat]);
                updateGPSCircle(accuracy);
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

function createGPSMarker(location, accuracy, map) {
    const el = document.createElement('div');
    el.className = 'gps-location-dot';
    
    // الحاوية بحجم صفر - المركز هو النقطة بالضبط
    Object.assign(el.style, {
        position: 'relative',
        width: '0px',
        height: '0px',
        zIndex: '999' // أقل من الدبوس (1000)
    });

    // 1. دائرة الدقة (Accuracy Circle)
    const accuracyCircle = document.createElement('div');
    accuracyCircle.className = 'gps-accuracy-circle';
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

    // 2. النقطة الزرقاء المركزية
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

    // إنشاء Marker
    userGPSMarker = new maplibregl.Marker({
        element: el,
        anchor: 'center'
    })
    .setLngLat(location)
    .addTo(map);

    console.log("✅ تم إنشاء النقطة الزرقاء في:", location);
}

function updateGPSCircle(accuracy) {
    if (userGPSMarker) {
        const circle = userGPSMarker.getElement().querySelector('.gps-accuracy-circle');
        if (circle) {
            const size = Math.min(accuracy * 2, 200);
            circle.style.width = `${size}px`;
            circle.style.height = `${size}px`;
        }
    }
}

//  زر "موقعي الحالي" - يركز الخريطة على موقع GPS
function goToMyLocation(map) {
    if (userGPSLocation) {
        console.log("🎯 الانتقال لموقع GPS:", userGPSLocation);
        map.flyTo({
            center: userGPSLocation,
            zoom: 16.5,
            speed: 1.2,
            duration: 1000
        });
    } else {
        console.warn("⚠️ لم يتم تحديد موقع GPS بعد");
        // إذا لم يكن هناك موقع، حاول الحصول عليه
        initUserLocation(map);
    }
}

// تنظيف عند إغلاق الصفحة
function stopUserLocationTracking() {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    if (userGPSMarker) {
        userGPSMarker.remove();
        userGPSMarker = null;
    }
    userGPSLocation = null;
}

// تنظيف عند إغلاق الصفحة
window.addEventListener('beforeunload', stopUserLocationTracking);
