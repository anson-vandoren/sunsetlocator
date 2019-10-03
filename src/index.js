import { DateTime } from "luxon";
import L from "leaflet";
import {
  latLngFromAzimuth,
  limit_degrees180pm,
  SPA,
  sunRiseSetTransit
} from "./spa";
import { setInputDate } from "./util";
import tzlookup from "tz-lookup";

var keys = {};
window.onkeyup = e => (keys[e.keyCode] = false);
window.onkeydown = e => (keys[e.keyCode] = true);
let observerLat = -44.67396323337423;
let observerLong = 167.9256821;
const startTz = tzlookup(observerLat, observerLong);
let startPoint = [observerLat, observerLong];
var date = DateTime.fromJSDate(new Date(), { zone: startTz });

const dist20m = 3.57 * (Math.sqrt(1.7) + Math.sqrt(20));

const pressure = 1013;
const temp = 27;
const elev = 10;

let spa = new SPA(date, observerLat, observerLong, elev, temp, pressure);

let sunsetTime = sunRiseSetTransit(spa).sunSet;
spa = new SPA(sunsetTime, observerLat, observerLong, elev, temp, pressure);
console.log(spa.azimuth);
console.log(spa.e);

L.TimeScrollHandler = L.Map.ScrollWheelZoom.extend({
  _onWheelScroll: e => {
    if (!keys[16]) {
      return;
    }
    const delta = e.deltaX;
    const byMonth = keys[91];
    const timeDelta = byMonth ? { months: 1 } : { days: 1 };
    console.log(keys);
    if (delta > 0) {
      date = date.minus(timeDelta);
    } else if (delta < 0) {
      date = date.plus(timeDelta);
    } else {
      console.log("no scrolling");
    }
    setInputDate(document.getElementById("dt"), date);
    onMapClick({ latlng: new L.LatLng(spa.latitude, spa.longitude) });
    e.preventDefault();
  }
});

L.Map.addInitHook("addHandler", "scrollWheelZoom", L.TimeScrollHandler);

const myMap = L.map("mapid").setView(startPoint, 12);
// L.tileLayer(
//   "https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}",
//   {
//     attribution:
//       'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
//     maxZoom: 18,
//     id: "mapbox.streets",
//     accessToken:
//       "pk.eyJ1IjoiYW5zb252YW5kb3JlbiIsImEiOiJjazB0cWh3dGEwZzloM250Y3J6aHRlc3ZrIn0.YP5RGsqokNVVyyJeDbRWyA"
//   }
// ).addTo(myMap);
L.tileLayer("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    'Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
}).addTo(myMap);
let spaObsPoint = L.marker(spa.latlng).addTo(myMap);
var horiz20m = L.circle(spa.latlng, {
  color: "red",
  fillColor: "#f03",
  fillOpacity: 0,
  weight: 2,
  radius: dist20m * 1000
}).addTo(myMap);
let sunsetLatLng = latLngFromAzimuth(
  [observerLat, observerLong],
  dist20m * 1000,
  spa.azimuth,
  0
);
console.log(sunsetLatLng);
const sunsetPoint = L.marker(sunsetLatLng).addTo(myMap);
const connector = L.polyline([[observerLat, observerLong], sunsetLatLng], {
  color: "blue",
  weight: 1
}).addTo(myMap);

function onMapClick(e) {
  console.log("date=", date.toString());
  const limitLatLng = latlng =>
    L.latLng(limit_degrees180pm(latlng.lat), limit_degrees180pm(latlng.lng));
  const newLatLng = e.latlng;

  startPoint = newLatLng;
  const limitedLatLng = limitLatLng(newLatLng);
  const newTz = tzlookup(limitedLatLng.lat, limitedLatLng.lng);
  date = date.setZone(newTz, { keepLocalTime: true });
  spa = new SPA(date, newLatLng.lat, newLatLng.lng, elev, temp, pressure);
  sunsetTime = sunRiseSetTransit(spa).sunSet;
  spa = new SPA(sunsetTime, newLatLng.lat, newLatLng.lng, elev, temp, pressure);
  sunsetTime = sunRiseSetTransit(spa).sunSet;
  spaObsPoint.setLatLng(newLatLng);
  horiz20m.setLatLng(newLatLng);

  sunsetLatLng = latLngFromAzimuth(
    [newLatLng.lat, newLatLng.lng],
    dist20m * 1000,
    spa.azimuth,
    0
  );
  console.log(newLatLng.lat, newLatLng.lng, sunsetLatLng);
  sunsetPoint.setLatLng(sunsetLatLng);
  connector.setLatLngs([newLatLng, sunsetLatLng]);
  console.log(
    "New sunset: ",
    sunsetTime.toString(),
    ", Sunset Azimuth: ",
    spa.azimuth
  );
}

myMap.on("click", onMapClick);

function updateDate(e) {
  const dateStr = e.target.value;
  date = new DateTime.fromFormat(dateStr, "yyyy-MM-dd", {
    zone: date.zone
  });
  onMapClick({ latlng: new L.LatLng(spa.latitude, spa.longitude) });
}

setInputDate(document.getElementById("dt"), date);
