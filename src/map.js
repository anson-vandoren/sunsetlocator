import L from "leaflet";

function Map(elId, startPoint, tileName = "OSM") {
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
  this._map = L.map(elId).setView(startPoint, 12);
  L.tileLayer(...tileLayers[tileName]).addTo(this._map);
}

export default Map;
