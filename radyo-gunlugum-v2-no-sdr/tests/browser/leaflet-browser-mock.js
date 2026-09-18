(()=>{
function chain(){return{addTo(){return this},bindPopup(){return this},setView(){return this},fitBounds(){return this},invalidateSize(){return this},remove(){return this},clearLayers(){return this},getLayers(){return[]}}}
globalThis.L={
  map(){return chain()},
  tileLayer(){return chain()},
  layerGroup(){return chain()},
  marker(){return chain()},
  circleMarker(){return chain()},
  polyline(){return chain()},
  divIcon(options){return options||{}},
  latLngBounds(){return{pad(){return this}}}
};
})();
