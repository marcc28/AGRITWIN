import { DEFAULT_CENTER, type MapPoint } from './types';
import { POINT_STYLE, TILE_OPTIONS, TILE_URL } from './mapConfig';

function scriptValue(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function mapDocument(
  point: MapPoint | null,
  boundary?: MapPoint[],
  excludedZones: MapPoint[][] = [],
  activeZone: number | null = null,
  readOnly = false,
) {
  const tileOrigin = new URL(TILE_URL).origin;
  const settings = scriptValue({
    point,
    boundary,
    excludedZones,
    activeZone,
    readOnly,
    isBoundary: boundary !== undefined,
    center: DEFAULT_CENTER,
    tileUrl: TILE_URL,
    tileOptions: TILE_OPTIONS,
    pointStyle: POINT_STYLE,
  });
  return `<!doctype html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-field-map' https://unpkg.com; style-src 'unsafe-inline' https://unpkg.com; img-src data: ${tileOrigin}; base-uri 'none'; form-action 'none'">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
 integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="anonymous">
<style>html,body,#map{height:100%;width:100%;margin:0}body{background:#E7E8D8}.leaflet-control-attribution{max-width:80vw}</style>
</head><body><div id="map"></div>
<script nonce="field-map">
function send(message) { window.ReactNativeWebView.postMessage(JSON.stringify(message)); }
var tileReady = false;
var loadTimer = setTimeout(function() { if (!tileReady) send({type:'error'}); }, 15000);
</script>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
 integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin="anonymous"></script>
<script nonce="field-map">
try {
  var settings = ${settings};
  var center = settings.point || settings.center;
  var map = L.map('map').setView([center.lat, center.lon], settings.point ? 15 : 6);
  var marker = L.circleMarker([center.lat, center.lon], settings.pointStyle);
  window.setFieldPoint = function(point) {
    if (!point) { marker.remove(); return; }
    marker.setLatLng([point.lat, point.lon]).addTo(map);
    map.setView([point.lat, point.lon], Math.max(map.getZoom(), 15));
  };
  var boundaryLayer;
  window.setFieldGeometry = function(geometry) {
    Object.assign(settings, geometry);
    if (!boundaryLayer) boundaryLayer = L.layerGroup().addTo(map);
    boundaryLayer.clearLayers();
    var outer=settings.boundary || [];
    var holes=settings.excludedZones || [];
    var rings=[outer].concat(holes);
    var coordinates=outer.map(function(p){return [p.lat,p.lon];});
    if(outer.length>=3) L.polygon([coordinates].concat(holes.filter(function(h){return h.length>=3;}).map(function(h){return h.map(function(p){return [p.lat,p.lon];});})), {color:'#46614F',fillOpacity:0.2,interactive:false}).addTo(boundaryLayer);
    else if(outer.length===2) L.polyline(coordinates,{color:'#46614F',interactive:false}).addTo(boundaryLayer);
    rings.forEach(function(ring,index){
      var positions=ring.map(function(p){return [p.lat,p.lon];});
      var color=index===0?'#46614F':'#B34D38';
      if(index>0 && ring.length>=3) L.polygon(positions,{color:color,fillColor:color,fillOpacity:0.15,interactive:false}).addTo(boundaryLayer);
      else if(index>0 && ring.length===2) L.polyline(positions,{color:color,interactive:false}).addTo(boundaryLayer);
      var active=(settings.activeZone == null ? -1 : settings.activeZone)+1===index;
      positions.forEach(function(p){L.circleMarker(p,Object.assign({},settings.pointStyle,{radius:active?8:5,fillColor:color,bubblingMouseEvents:false})).addTo(boundaryLayer);});
    });
  };
  if (settings.isBoundary) {
    window.setFieldGeometry(settings);
    if(settings.boundary.length>=3) map.fitBounds(L.latLngBounds(settings.boundary.map(function(p){return [p.lat,p.lon];})),{padding:[30,30],animate:false});
  } else if(settings.point) marker.addTo(map);
  L.tileLayer(settings.tileUrl, settings.tileOptions)
    .on('tileload', function() { tileReady = true; clearTimeout(loadTimer); send({type:'ready'}); })
    .on('tileerror', function() { if (!tileReady) send({type:'error'}); })
    .addTo(map);
  map.on('click', function(event) {
    if(settings.readOnly) return;
    var location = event.latlng.wrap();
    var point = {lat:location.lat, lon:location.lng};
    if (!settings.isBoundary) window.setFieldPoint(point);
    send({type:'point', point:point});
  });
  document.addEventListener('visibilitychange', function() { map.invalidateSize(); });
} catch (error) { clearTimeout(loadTimer); send({type:'error'}); }
</script></body></html>`;
}
