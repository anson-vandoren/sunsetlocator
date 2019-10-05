import L from "leaflet";
import { setInputDate } from "./util";

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
