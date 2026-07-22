import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import MapboxGL from '@maplibre/maplibre-react-native'; // أو حسب المكتبة المستخدمة في بيئتك

// إعداد ستايل الخريطة اللي سويناه (تأكد من مسار الملف أو الرابط)
const ALAK_MAP_STYLE = 'https://akiea7.github.io/Maptest-/alak-style.json'; 

export default function AlekTrackingScreen() {
  // 1. إحداثيات افتراضية للكابتن والمسار (كمثال لتجربة الإبداع)
  const [captainLocation, setCaptainLocation] = useState([44.3615, 33.3152]); // بغداد كمثال
  const [captainBearing, setCaptainBearing] = useState(45); // اتجاه مقدمة السيارة

  // GeoJSON يمثل مسار الرحلة من نقطة الانطلاق للوصول
  const routeGeoJSON = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [
            [44.3615, 33.3152],
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import MapboxGL from '@maplibre/maplibre-react-native'; // أو '@rnmapbox/maps' حسب اللي منصبه عندك

// 🔴 1. ضع رابط خريطتك (GitHub) هنا بدل هذا الرابط
const ALAK_MAP_STYLE = 'https://akiea7.github.io/alak-style.json'; 
const CAR_ICON_ID = 'car-top-view'; 

// مسار تجريبي للسيارة
const ROUTE_COORDINATES = [
  [44.3615, 33.3152],
  [44.3630, 33.3165],
  [44.3650, 33.3180],
  [44.3675, 33.3200],
  [44.3700, 33.3220],
];

export default function AlekTrackingScreen() {
  const cameraRef = useRef(null);
  const [cameraMode, setCameraMode] = useState('follow'); // 'follow' أو 'free'
  
  const [captainLocation, setCaptainLocation] = useState(ROUTE_COORDINATES[0]);
  const [captainBearing, setCaptainBearing] = useState(0);
  const [routeProgress, setRouteProgress] = useState(0); 

  // المحاكاة (اللعبة الوهمية لتحريك السيارة للتجربة)
  useEffect(() => {
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < ROUTE_COORDINATES.length - 1) {
        const current = ROUTE_COORDINATES[currentIndex];
        const next = ROUTE_COORDINATES[currentIndex + 1];
        
        const dx = next[0] - current[0];
        const dy = next[1] - current[1];
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        const normalizedBearing = (angle + 90 + 360) % 360; 

        setCaptainLocation(next);
        setCaptainBearing(normalizedBearing);
        setRouteProgress(((currentIndex + 1) / (ROUTE_COORDINATES.length - 1)) * 100);
        currentIndex++;
      } else {
        currentIndex = 0; 
      }
    }, 2000); 

    return () => clearInterval(interval);
  }, []);

  // توجيه الكاميرا الذكية
  useEffect(() => {
    if (cameraMode === 'follow' && cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: captainLocation,
        heading: captainBearing,
        pitch: 45,
        zoomLevel: 17,
        animationMode: 'easeTo',
        animationDuration: 1500,
      });
    }
  }, [captainLocation, captainBearing, cameraMode]);

  const routeGeoJSON = useMemo(() => ({
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: ROUTE_COORDINATES },
    }],
  }), []);

  const captainGeoJSON = useMemo(() => ({
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: { bearing: captainBearing },
      geometry: { type: 'Point', coordinates: captainLocation },
    }],
  }), [captainLocation, captainBearing]);

  const handleMapPress = useCallback(() => {
    setCameraMode('free');
  }, []);

  const handleRecenter = useCallback(() => {
    setCameraMode('follow');
  }, []);

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        style={styles.map}
        styleURL={ALAK_MAP_STYLE}
        logoEnabled={false}
        compassEnabled={false}
        onPress={handleMapPress}
      >
        {/* 🔴 2. السطر المسؤول عن قراءة صورة السيارة من ملفاتك */}
        {/* تأكد إنك ضايف صورة اسمها car-icon.png داخل مجلد assets */}
        <MapboxGL.Images images={{ [CAR_ICON_ID]: require('./assets/car-icon.png') }} />

        <MapboxGL.Camera
          ref={cameraRef}
          zoomLevel={17}
          pitch={45}
          heading={captainBearing}
          centerCoordinate={captainLocation}
          animationMode="easeTo"
          animationDuration={1500}
        />

        {/* رسم المسار المزدوج */}
        <MapboxGL.ShapeSource id="routeSource" shape={routeGeoJSON}>
          <MapboxGL.LineLayer
            id="routeCasing"
            style={{
              lineColor: '#FFFFFF',
              lineWidth: 10,
              lineCap: 'round',
              lineJoin: 'round',
              lineOpacity: 0.9,
            }}
          />
          <MapboxGL.LineLayer
            id="routeCore"
            style={{
              lineColor: '#0066FF', // أزرق ألك الفاقع
              lineWidth: 5,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        </MapboxGL.ShapeSource>

        {/* سيارة الكابتن والظلال */}
        <MapboxGL.ShapeSource id="captainSource" shape={captainGeoJSON}>
          <MapboxGL.CircleLayer
            id="captainPulse"
            style={{
              circleRadius: 18,
              circleColor: '#0066FF',
              circleOpacity: 0.2,
              circlePitchAlignment: 'map',
            }}
          />
          <MapboxGL.CircleLayer
            id="captainShadow"
            style={{
              circleRadius: 12,
              circleColor: '#000000',
              circleOpacity: 0.3,
              circlePitchAlignment: 'viewport',
              circleTranslate: [0, 4], 
            }}
          />
          <MapboxGL.SymbolLayer
            id="captainIcon"
            style={{
              iconImage: CAR_ICON_ID, 
              iconSize: 0.18,
              iconAllowOverlap: true,
              iconIgnorePlacement: true,
              iconPitchAlignment: 'map',
              iconRotationAlignment: 'map',
              iconRotate: ['get', 'bearing'],
            }}
          />
        </MapboxGL.ShapeSource>
      </MapboxGL.MapView>

      {/* الواجهة العائمة */}
      <View style={styles.topBar}>
        <View style={styles.statusBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.statusText}>متابعة مباشرة</Text>
        </View>
      </View>

      {cameraMode === 'free' && (
        <TouchableOpacity style={styles.recenterButton} onPress={handleRecenter}>
          <Text style={styles.recenterIcon}>📍</Text>
        </TouchableOpacity>
      )}

      <View style={styles.bottomSheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetContent}>
          <View style={styles.captainInfo}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>أ</Text>
            </View>
            <View style={styles.infoText}>
              <Text style={styles.captainName}>الكابتن أحمد</Text>
              <Text style={styles.vehicleInfo}>تويوتا كامري • أبيض • ١٢٣٤٥</Text>
            </View>
            <View style={styles.ratingBox}>
              <Text style={styles.ratingText}>⭐ 4.9</Text>
            </View>
          </View>
          
          <View style={styles.tripDetails}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>الوقت المتبقي</Text>
              <Text style={styles.detailValue}>٣ دقائق</Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>المسافة</Text>
              <Text style={styles.detailValue}>١.٢ كم</Text>
            </View>
          </View>

          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${routeProgress}%` }]} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  map: { flex: 1 },
  topBar: { position: 'absolute', top: 50, left: 20, right: 20, zIndex: 10 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.9)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, alignSelf: 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00C853', marginRight: 8 },
  statusText: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  recenterButton: { position: 'absolute', bottom: 280, right: 20, width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5, zIndex: 10 },
  recenterIcon: { fontSize: 24 },
  bottomSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  sheetContent: { paddingHorizontal: 20 },
  captainInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatarPlaceholder: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { fontSize: 24, fontWeight: 'bold', color: '#0066FF' },
  infoText: { flex: 1 },
  captainName: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  vehicleInfo: { fontSize: 14, color: '#666666' },
  ratingBox: { backgroundColor: '#FFF8E1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  ratingText: { fontSize: 14, fontWeight: '700', color: '#F57F17' },
  tripDetails: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#F8F9FA', borderRadius: 16, paddingVertical: 16, marginBottom: 20 },
  detailItem: { alignItems: 'center' },
  detailLabel: { fontSize: 12, color: '#666666', marginBottom: 4 },
  detailValue: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  detailDivider: { width: 1, backgroundColor: '#E0E0E0' },
  progressBarContainer: { height: 6, backgroundColor: '#E3F2FD', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: '100%', backgroundColor: '#0066FF', borderRadius: 3 },
});
