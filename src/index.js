import './styles.css'
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import FreehandMode from "mapbox-gl-draw-freehand-mode";
import * as turf from "@turf/turf";

console.log("how are you...");

mapboxgl.accessToken ="";
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/streets-v11",
  center: [139.5, 36.0],
  minZoom: 2,
  zoom: 3
});

map.on("load", () => {
  map.addSource("counties", {
    type: "vector",
    url: "mapbox://mapbox.82pkq93d"
  });

  map.addLayer(
    {
      id: "counties",
      type: "fill",
      source: "counties",
      "source-layer": "original",
      paint: {
        "fill-outline-color": "rgba(0,0,0,0.5)",
        "fill-color": "rgba(0,0,0,0.1)"
      }
    },
    "settlement-label"
  ); // Place polygon under these labels.

  map.addLayer(
    {
      id: "counties-highlighted",
      type: "fill",
      source: "counties",
      "source-layer": "original",
      paint: {
        "fill-outline-color": "#484896",
        "fill-color": "#6e599f",
        "fill-opacity": 0.75
      },
      filter: ["in", "FIPS", ""]
    },
    "settlement-label"
  );
});

const draw = new MapboxDraw({
  displayControlsDefault: false,
  // Select which mapbox-gl-draw control buttons to add to the map.
  controls: {
    polygon: true,
    trash: true
  },
  modes: Object.assign(MapboxDraw.modes, {
    draw_polygon: FreehandMode
  }),
  // Set mapbox-gl-draw to draw by default.
  // The user does not have to click the polygon control button first.
  defaultMode: "draw_polygon"
});
map.addControl(draw);

map.on("draw.create", updateArea);
map.on("draw.delete", updateArea);
map.on("draw.update", updateArea);

function addMarker(data) {
  let color;
  let type;
  if (data.point_type === "fuel station") {
    color = 'blue';
    type = 'ガソリンスタンド';
  } else if (data.point_type === "government offices") {
    color = 'green';
    type = '役所及び公的集会施設';
  } else if (data.point_type === "medical institution") {
    color = 'yellow';
    type = '医療機関';
  } else {
    color = 'red';
    type = '公共施設';
  }

  const popupContent = `
    <p>タイプ: ${type}</p>
    <p>名前: ${data.name}</p>
    <p>住所: ${data.address}</p>
    <p>詳細: ${data.description}</p>
    <p>経緯度: ${data.latitude}, ${data.longitude}</p>
  `;

  const popup = new mapboxgl.Popup({ offset: 25 })
    .setHTML(popupContent);

  new mapboxgl.Marker({color: color})
    .setLngLat([data.longitude, data.latitude])
    .setPopup(popup)
    .addTo(map);

  //  // Use setHTML to set the popup content

  // // Add click event listener to the marker element to display the popup
  // const markerElement = marker.getElement();
  // console.log(markerElement);
  // // markerElement.addEventListener("click", () => {
  // //   console.log("Marker clicked");
  // //   popup.setLngLat([data.longitude, data.latitude]).addTo(map);
  // });
}

async function fetchApi(coordinates) {
  const url = "http://localhost:8080/point";
  const res = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(coordinates),
    headers: {
      'Content-Type': 'application/json'
    }
  });
  res.json().then((data) => {
    console.log(data[0]);
    data.forEach((point) => {
      addMarker(point);
    });
  });
}

function updateArea(e) {
  const data = draw.getAll();
  if (!data || !data.features || !data.features[0]) {
    return;
  }
  console.log(data);

  const filterPolygon = data.features[0];
  console.log("filterPolygon", filterPolygon.geometry.coordinates);

  // filterPolygon.geometry.coordinatesを[{"latitude": ..., "longitude": ...}, ...]に変換
  const coordinates = filterPolygon.geometry.coordinates[0].map((c) => {
    return { latitude: c[1], longitude: c[0] };
  });
  console.log("coordinates", coordinates);

  fetchApi(coordinates);

  // const bbox = turf.bbox(filterPolygon);
  // console.log("bbox", bbox);

  // const featuresInBBox = map.queryRenderedFeatures(
  //   [map.project([bbox[0], bbox[1]]), map.project([bbox[2], bbox[3]])],
  //   { layers: ["counties"] }
  // );
  // console.log("featuresInBBox", featuresInBBox);

  // const filteredFeatures = featuresInBBox.filter((f) =>
  //   isWithinOrIntersecting(filterPolygon, f)
  // );
  // console.log("filteredFeatures", filteredFeatures);

  // const fips = filteredFeatures.map((feature) => feature.properties.FIPS);
  // map.setFilter("counties-highlighted", ["in", "FIPS", ...fips]);
  // console.log("filteredFIPS", fips);
}

function isWithinOrIntersecting(filterPolygon, feature) {
  if (feature.geometry.type == "MultiPolygon") {
    // TODO: Handle multipolygon...
  } else {
    return (
      turf.booleanIntersects(filterPolygon, feature) ||
      turf.booleanContains(filterPolygon, feature)
    );
  }
}
