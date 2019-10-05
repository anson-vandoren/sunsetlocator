import { latLngFromAzimuth, LimitedSPA, sunRiseSetTransit } from "./spa";
import {
  dateFromInput,
  limit_degrees180pm,
  setInputDate,
  todayWithTz
} from "./util";
import tzlookup from "tz-lookup";
import Map from "./map.js";

let observerLat = -44.67396323337423;
let observerLong = 167.9256821;
let currentTz = tzlookup(observerLat, observerLong);
let startPoint = [observerLat, observerLong];
let date = todayWithTz(currentTz);
const dist20m = 3.57 * (Math.sqrt(1.7) + Math.sqrt(20));

const pressure = 1013;
const temp = 27;
const elev = 10;

const myMap = new Map("mapid", startPoint, "OSM");

// generate SPA given the date and arbitrary time
let spa = new LimitedSPA(date, observerLat, observerLong, elev, temp, pressure);

// calculate sunset time and create new SPA
let sunsetTime = sunRiseSetTransit(spa).sunSet;
spa = new LimitedSPA(
  sunsetTime,
  observerLat,
  observerLong,
  elev,
  temp,
  pressure
);

let sunsetLatLng = latLngFromAzimuth(
  [observerLat, observerLong],
  dist20m * 1000,
  spa.azimuth,
  0
);
myMap.sunset = sunsetLatLng;

function onMapClick(e) {
  const limitLatLng = latlng => ({
    lat: limit_degrees180pm(latlng.lat),
    lng: limit_degrees180pm(latlng.lng)
  });
  const newLatLng = e.latlng;

  startPoint = newLatLng;
  const limitedLatLng = limitLatLng(newLatLng);
  currentTz = tzlookup(limitedLatLng.lat, limitedLatLng.lng);
  date = date.setZone(currentTz, { keepLocalTime: true });
  spa = new LimitedSPA(
    date,
    newLatLng.lat,
    newLatLng.lng,
    elev,
    temp,
    pressure
  );
  sunsetTime = sunRiseSetTransit(spa).sunSet;
  spa = new LimitedSPA(
    sunsetTime,
    newLatLng.lat,
    newLatLng.lng,
    elev,
    temp,
    pressure
  );
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
  date = dateFromInput(dateStr, date.zone);
  onMapClick({ latlng: { lat: spa.latitude, lng: spa.longitude } });
}
console.log("setting date");
document.onreadystatechange = () => {
  if (document.readyState === "complete") {
    document.getElementById("dt").onchange = updateDate;
    setInputDate("dt", date);
  }
};
