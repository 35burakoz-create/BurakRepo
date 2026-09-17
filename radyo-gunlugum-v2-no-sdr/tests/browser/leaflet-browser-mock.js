(()=>{
function chain(){return{addTo(){return this},bindPopup(){return this},setView(){return this},fitBounds(){return this},invalidateSize(){return this},remove(){},clearLayers(){return this}}}
globalThis.L={
  map(){return chain()},
  tileLayer(){return chain()},
  layerGroup(){return chain()},
  marker(){return chain()},
  divIcon(options){return options||{}},
  latLngBounds(){return{pad(){return this}}}
};
})();
