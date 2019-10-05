import { DateTime } from "luxon";
import L from "leaflet";
import { latLngFromAzimuth, SPA, sunRiseSetTransit } from "./spa";
import { getInputDate, limit_degrees180pm, setInputDate } from "./util";
import tzlookup from "tz-lookup";
import Map from "./map.js";

let keys = {};
window.onkeyup = e => (keys[e.code] = false);
window.onkeydown = e => (keys[e.code] = true);
let observerLat = -44.67396323337423;
let observerLong = 167.9256821;
let currentTz = tzlookup(observerLat, observerLong);
let startPoint = [observerLat, observerLong];
let date = DateTime.fromJSDate(new Date(), { zone: currentTz });

const dist20m = 3.57 * (Math.sqrt(1.7) + Math.sqrt(20));

const pressure = 1013;
const temp = 27;
const elev = 10;

// generate SPA given the date and arbitrary time
let spa = new SPA(date, observerLat, observerLong, elev, temp, pressure);

// calculate sunset time and create new SPA
let sunsetTime = sunRiseSetTransit(spa).sunSet;
spa = new SPA(sunsetTime, observerLat, observerLong, elev, temp, pressure);

L.TimeScrollHandler = L.Map.ScrollWheelZoom.extend({
  _onWheelScroll: e => {
    // Only change time if Shift is pressed
    if (!keys["ShiftLeft"]) {
      return;
    }

    // If scroll event but no actual change, don't do anything
    const delta = e.deltaX;
    if (delta === 0) {
      return;
    }

    // Change time by a month if other modifier key is also down, otherwise by day
    const byMonth = keys["AltLeft"] || keys["MetaLeft"] || keys["CtrlLeft"];
    const timeDelta = byMonth ? { months: 1 } : { days: 1 };

    // Scrolling "up" raises date, "down" lowers it
    date = delta > 0 ? date.minus(timeDelta) : date.plus(timeDelta);

    // update date input control with the new date
    setInputDate("dt", date);
    onMapClick({ latlng: new L.LatLng(spa.latitude, spa.longitude) });
    e.preventDefault();
  }
});
L.Map.addInitHook("addHandler", "scrollWheelZoom", L.TimeScrollHandler);

const myMap = new Map("mapid", startPoint, "OSM");

let sunsetLatLng = latLngFromAzimuth(
  [observerLat, observerLong],
  dist20m * 1000,
  spa.azimuth,
  0
);
myMap.sunset = sunsetLatLng;

function onMapClick(e) {
  const limitLatLng = latlng =>
    L.latLng(limit_degrees180pm(latlng.lat), limit_degrees180pm(latlng.lng));
  const newLatLng = e.latlng;

  startPoint = newLatLng;
  const limitedLatLng = limitLatLng(newLatLng);
  currentTz = tzlookup(limitedLatLng.lat, limitedLatLng.lng);
  date = date.setZone(currentTz, { keepLocalTime: true });
  spa = new SPA(date, newLatLng.lat, newLatLng.lng, elev, temp, pressure);
  sunsetTime = sunRiseSetTransit(spa).sunSet;
  spa = new SPA(sunsetTime, newLatLng.lat, newLatLng.lng, elev, temp, pressure);
  sunsetTime = sunRiseSetTransit(spa).sunSet;
  myMap.observer = newLatLng;

  sunsetLatLng = latLngFromAzimuth(
    [newLatLng.lat, newLatLng.lng],
    dist20m * 1000,
    spa.azimuth,
    0
  );
  myMap.sunset = sunsetLatLng;
}

myMap.on("click", onMapClick);

function updateDate(e) {
  const dateStr = e.target.value;
  date = new DateTime.fromFormat(dateStr, "yyyy-MM-dd", {
    zone: date.zone
  });
  onMapClick({ latlng: new L.LatLng(spa.latitude, spa.longitude) });
}
console.log("setting date");
document.onreadystatechange = () => {
  if (document.readyState === "complete") {
    setInputDate("dt", date);
  }
};
