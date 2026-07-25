// =========================================================
// 📍 ملف UserLocation.js - نظام GPS الاحترافي (Alek App)
// =========================================================

let userLocationMarker = null;
let gpsWatchId = null;
let isTracking = false;
let followMode = false;

// متغيرات عامة للمشاركة مع ملف TrackingScreen
window.userCurrentPosition = null;

function initGPS(mapInstance) {
    const gpsBtn = document.getElementById('gps-btn');
    
    mapInstance.on('dragstart', () => {
        followMode = false;
    });

    if (gpsBtn) {
        gpsBtn.addEventListener('click', () => {
            if (isTracking) {
                stopGPS();
            } else {
                startGPS();
            }
        });
    }

    function startGPS() {
        if (!navigator.geolocation) {
            alert("متصفحك لا يدعم GPS");
            return;
        }

        gpsBtn.classList.add('active');

        gpsWatchId = navigator.geolocation.watchPosition(
            handlePositionUpdate,
            handlePositionError,
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );

        isTracking = true;
    }

    function stopGPS() {
        if (gpsWatchId !== null) {
            navigator.geolocation.clearWatch(gpsWatchId);
            gpsWatchId = null;
        }
        
        gpsBtn.classList.remove('active');
        isTracking = false;
        followMode = false;
    }

    function handlePositionUpdate(position) {
        const { latitude, longitude, accuracy, heading } = position.coords;
        const currentPos = [longitude, latitude];

        // حفظ الموقع بالمتغير العام ليقرأه ملف المسار
        window.userCurrentPosition = currentPos;

        if (!userLocationMarker) {
            const container = document.createElement('div');
            container.style.position = 'relative';
            
            const accCircle = document.createElement('div');
            accCircle.id = 'gps-accuracy-circle';
            Object.assign(accCircle.style, {
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                borderRadius: '50%', background: 'rgba(66, 133, 244, 0.15)',
                border: '1px solid rgba(66, 133, 244, 0.3)', pointerEvents: 'none',
                transition: 'width 0.5s, height 0.5s'
            });

            const dotEl = document.createElement('div');
            Object.assign(dotEl.style, {
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: '16px', height: '16px', background: '#4285f4',
                border: '3px solid white', borderRadius: '50%',
                boxShadow: '0 2px 8px rgba(66, 133, 244, 0.5)', zIndex: '10'
            });

            container.appendChild(accCircle);
            container.appendChild(dotEl);

            userLocationMarker = new maplibregl.Marker({
                element: container,
                pitchAlignment: 'viewport', 
                rotationAlignment: 'map',
                anchor: 'center'
            })
            .setLngLat(currentPos)
            .addTo(mapInstance);

            mapInstance.flyTo({ center: currentPos, zoom: 17, speed: 1.5, essential: true });
            followMode = true;
        } else {
            userLocationMarker.setLngLat(currentPos);
            if (heading !== null && !isNaN(heading)) {
                userLocationMarker.setRotation(heading);
            }
        }

        const accCircle = document.getElementById('gps-accuracy-circle');
        if (accCircle) {
            const circleSize = Math.max(40, accuracy * 2);
            accCircle.style.width = `${circleSize}px`;
            accCircle.style.height = `${circleSize}px`;
        }

        // إذا تم تحديد وجهة مسبقاً، حدث المسار تلقائياً مع حركة الـ GPS
        if (window.isDestinationSet && window.destinationCoords) {
            if (!window.lastRouteUpdate || Date.now() - window.lastRouteUpdate > 10000) {
                if (typeof window.drawDynamicRoute === 'function') {
                    window.drawDynamicRoute(currentPos, window.destinationCoords);
                    window.lastRouteUpdate = Date.now();
                }
            }
        }

        if (followMode) {
            mapInstance.easeTo({ center: currentPos, duration: 1000, easing: t => t });
        }
    }

    function handlePositionError(error) {
        console.error("GPS Error:", error);
    }

    window.addEventListener('beforeunload', stopGPS);
}
