import L from "leaflet";
import { getInputDate, setInputDate } from "./util";

let keys = {};
window.onkeyup = e => (keys[e.code] = false);
window.onkeydown = e => (keys[e.code] = true);

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

    let date = getInputDate("dt");

    // Change time by a month if other modifier key is also down, otherwise by day
    const byMonth = keys["AltLeft"] || keys["MetaLeft"] || keys["CtrlLeft"];
    const timeDelta = byMonth ? { months: 1 } : { days: 1 };

    // Scrolling "up" raises date, "down" lowers it
    date = delta > 0 ? date.minus(timeDelta) : date.plus(timeDelta);

    // update date input control with the new date
    setInputDate("dt", date);
    e.preventDefault();
  }
});
L.Map.addInitHook("addHandler", "scrollWheelZoom", L.TimeScrollHandler);

const dist20m = 3.57 * (Math.sqrt(1.7) + Math.sqrt(20));
const tileLayers = {
  OSM: {
    url: "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: {
      attribution:
        'Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
    }
  },
  MapBox: {
    url:
      "https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}",
    options: {
      attribution:
        'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      maxZoom: 18,
      id: "mapbox.streets",
      accessToken:
        "pk.eyJ1IjoiYW5zb252YW5kb3JlbiIsImEiOiJjazB0cWh3dGEwZzloM250Y3J6aHRlc3ZrIn0.YP5RGsqokNVVyyJeDbRWyA"
    }
  }
};

class Map {
  constructor(elId, observerLatLng, tileName = "OSM") {
    // set center point
    this._observer = observerLatLng;

    // create map and add tile layer
    this._map = L.map(elId).setView(this.observer, 12);
    const layer = tileLayers[tileName];
    L.tileLayer(layer.url, layer.options).addTo(this._map);

    this._observerMarker = L.marker(this.observer).addTo(this._map);
    this._observerCircle = L.circle(this.observer, {
      color: "red",
      weight: 2,
      fillOpacity: 0,
      radius: dist20m * 1000
    }).addTo(this._map);

    this._sunsetMarker = L.marker(this.observer).addTo(this._map);
    this._sunsetLine = L.polyline(
      [this.observer, this._sunsetMarker.getLatLng()],
      {
        color: "blue",
        weight: 1
      }
    ).addTo(this._map);
  }

  get sunset() {
    return this._sunsetMarker.getLatLng();
  }

  set sunset(latlng) {
    this._sunsetMarker.setLatLng(latlng);
    this._sunsetLine.setLatLngs([
      this.observer,
      this._sunsetMarker.getLatLng()
    ]);
  }

  get observer() {
    return this._observer;
  }

  set observer(latlng) {
    this._observer = latlng;
    this._observerMarker.setLatLng(this.observer);
    this._observerCircle.setLatLng(this.observer);
    this._sunsetLine.setLatLngs([this.observer, this.sunset]);
  }

  on(evt, func) {
    // wrapper for Leaflet `on` handler
    this._map.on(evt, func);
  }
}

export default Map;
