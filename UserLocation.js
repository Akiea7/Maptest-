// =========================================================
// 📍 ملف UserLocation.js - تحديد الموقع وتتبعه باحترافية
// =========================================================

let userCurrentMarker = null;
let isFollowingUser = false; // هل يجب أن تتابع الخريطة المستخدم أم لا؟
let watchId = null;

function initUserLocation(map) {
    // 1. إذا قام المستخدم بسحب الخريطة، نلغي وضع "المتابعة التلقائية"
    map.on('dragstart', () => {
        isFollowingUser = false;
    });

    if ("geolocation" in navigator) {
        // إيقاف أي تتبع سابق لتجنب التكرار واستهلاك البطارية
        if (watchId) navigator.geolocation.clearWatch(watchId);
        
        watchId = navigator.geolocation.watchPosition(
            (position) => {
                const userLocation = [position.coords.longitude, position.coords.latitude];
                const accuracy = position.coords.accuracy; // دقة الموقع بالمتر

                if (!userCurrentMarker) {
                    createCustomUserMarker(userLocation, accuracy, map);
                    
                    // فقط في أول مرة: نقوم بتوسيط الخريطة على المستخدم بسلاسة
                    map.flyTo({ 
                        center: userLocation, 
                        zoom: 16, 
                        speed: 1.2,
                        essential: true 
                    });
                    isFollowingUser = true;
                } else {
                    // ✅ الحل السحري: تحديث موقع النقطة فقط WITHOUT تحريك الخريطة
                    // هذا يضمن بقاء النقطة ثابتة جغرافياً حتى لو حرك المستخدم الخريطة
                    userCurrentMarker.setLngLat(userLocation);
                    
                    // (اختياري) تحديث دائرة الدقة إذا أردت إضافتها لاحقاً
                }
            },
            (error) => {
                console.error("خطأ في تحديد الموقع: ", error.message);
                let msg = "تعذر تحديد الموقع.";
                if (error.code === 1) msg = "يرجى السماح بالوصول للموقع من إعدادات المتصفح.";
                if (error.code === 2) msg = "الموقع غير متاح حالياً.";
                if (error.code === 3) msg = "انتهت مهلة تحديد الموقع.";
                alert(msg);
            },
            {
                enableHighAccuracy: true, // طلب أعلى دقة ممكنة (GPS)
                timeout: 15000,           // مهلة أطول قليلاً للأجهزة البطيئة
                maximumAge: 0             // عدم استخدام موقع مخزن قديم
            }
        );
    } else {
        alert("عذراً، متصفحك لا يدعم خدمة تحديد الموقع الجغرافي.");
    }
}

// دالة إنشاء النقطة المخصصة (مطوّرة ومُحسّنة)
function createCustomUserMarker(location, accuracy, map) {
    const userMarkerElement = document.createElement('div');
    userMarkerElement.className = 'user-location-marker';
    
    // الحاوية الرئيسية بحجم صفر لضمان أن المركز هو النقطة الزرقاء تماماً
    Object.assign(userMarkerElement.style, {
        position: 'relative',
        width: '0px',
        height: '0px',
        zIndex: '100' // التأكد من ظهورها فوق كل العناصر
    });

    // 1. دائرة دقة الموقع (Accuracy Circle) - تعطي مظهراً احترافياً مثل Google Maps
    const accuracyCircle = document.createElement('div');
    Object.assign(accuracyCircle.style, {
        position: 'absolute',
        top: '0', left: '0',
        transform: 'translate(-50%, -50%)',
        width: `${accuracy * 2}px`, // حجم الدائرة بناءً على دقة الـ GPS
        maxWidth: '200px', // حد أقصى حتى لا تغطي الشاشة
        height: `${accuracy * 2}px`,
        maxHeight: '200px',
        backgroundColor: 'rgba(66, 133, 244, 0.15)',
        border: '1px solid rgba(66, 133, 244, 0.3)',
        borderRadius: '50%',
        pointerEvents: 'none',
        transition: 'all 0.5s ease-out' // تنعيم عند تغير حجم الدقة
    });

    // 2. الموجة النبضية (Radar Pulse)
    const wave = document.createElement('div');
    Object.assign(wave.style, {
        position: 'absolute', top: '0', left: '0',
        transform: 'translate(-50%, -50%)',
        width: '60px', height: '60px',
        backgroundColor: 'rgba(66, 133, 244, 0.2)',
        borderRadius: '50%',
        animation: 'radar-pulse 2s infinite ease-out',
        pointerEvents: 'none'
    });

    // 3. النقطة الزرقاء المركزية (Core Dot)
    const coreDot = document.createElement('div');
    Object.assign(coreDot.style, {
        position: 'absolute', top: '0', left: '0',
        transform: 'translate(-50%, -50%)',
        width: '18px', height: '18px',
        backgroundColor: '#4285F4',
        borderRadius: '50%',
        border: '3px solid #ffffff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        zIndex: '10'
    });

    userMarkerElement.appendChild(accuracyCircle);
    userMarkerElement.appendChild(wave);
    userMarkerElement.appendChild(coreDot);

    // إضافة الـ CSS الخاص بالحركة مرة واحدة فقط
    if (!document.getElementById('user-location-style')) {
        const style = document.createElement('style');
        style.id = 'user-location-style';
        style.textContent = `
            @keyframes radar-pulse {
                0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0.6; }
                100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    userCurrentMarker = new maplibregl.Marker({ 
        element: userMarkerElement,
        anchor: 'center' // التثبيت من المركز بالضبط
    })
    .setLngLat(location)
    .addTo(map);
}

// =========================================================
// 🎯 دالة زر "موقعي الحالي"
// =========================================================
function goToMyLocation(map) {
    if (userCurrentMarker) {
        isFollowingUser = true; // إعادة تفعيل المتابعة
        map.flyTo({ 
            center: userCurrentMarker.getLngLat(), 
            zoom: 16.5, 
            speed: 1.5,
            essential: true
        });
    } else {
        // إذا لم تكن النقطة موجودة، ابدأ عملية التحديد
        initUserLocation(map);
    }
}

// =========================================================
// 🧹 دالة تنظيف (مهمة جداً عند مغادرة الصفحة لتجنب استهلاك البطارية)
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
}
