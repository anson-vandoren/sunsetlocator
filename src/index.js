import { SPA } from "./spa";
import {
  dateFromInput,
  limit_degrees180pm,
  setInputDate,
  todayWithTz
} from "./util";
import tzlookup from "tz-lookup";
import Map from "./map.js";

function getLatLng() {
  let savedLatLng = window.localStorage.getItem("observerPoint");
  let lat = -44.67396323337423;
  let lng = 167.9256821;
  if (savedLatLng) {
    const raw = savedLatLng.split(",");
    lat = parseFloat(raw[0]);
    lng = parseFloat(raw[1]);
  }
  return { observerLat: lat, observerLong: lng };
}

const { observerLat, observerLong } = getLatLng();

let currentTz = tzlookup(observerLat, observerLong);
let startPoint = [observerLat, observerLong];
let date = todayWithTz(currentTz);
const dist20m = 3.57 * (Math.sqrt(1.7) + Math.sqrt(20));

const pressure = 1013;
const temp = 27;
const elev = 10;

const myMap = new Map("mapid", startPoint, "OSM");

// generate SPA given the date and arbitrary time
let spa = new SPA(date, observerLat, observerLong, elev, temp, pressure);
myMap.sunset = {
  pt: spa.sunsetPoint(dist20m * 1000),
  angle: spa.sunsetAzimuth
};
myMap.sunrise = {
  pt: spa.sunrisePoint(dist20m * 1000),
  angle: spa.sunriseAzimuth
};

function updatePosition(e) {
  const limitLatLng = latlng => ({
    lat: limit_degrees180pm(latlng.lat),
    lng: limit_degrees180pm(latlng.lng)
  });
  const newLatLng = e.latlng;

  const limitedLatLng = limitLatLng(newLatLng);
  currentTz = tzlookup(limitedLatLng.lat, limitedLatLng.lng);
  date = date.setZone(currentTz, { keepLocalTime: true });
  spa = new SPA(date, newLatLng.lat, newLatLng.lng, elev, temp, pressure);
  myMap.observer = newLatLng;

  myMap.sunset = spa.sunset(dist20m * 1000);
  myMap.sunrise = spa.sunrise(dist20m * 1000);
  window.localStorage.setItem(
    "observerPoint",
    Object.values(limitedLatLng).join(",")
  );
}

myMap.on("click", updatePosition);

function updateDate(e) {
  const dateStr = e.target.value;
  date = dateFromInput(dateStr, date.zone);
  updatePosition({ latlng: { lat: spa.latitude, lng: spa.longitude } });
}

document.onreadystatechange = () => {
  if (document.readyState === "complete") {
    document.getElementById("dt").onchange = updateDate;
    setInputDate("dt", date);
  }
};
