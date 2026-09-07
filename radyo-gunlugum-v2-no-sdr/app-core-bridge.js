(()=>{
const R=window.R;if(!R||R.__coreBridge)return;R.__coreBridge=true;
// Capture pristine core primitives before legacy feature layers wrap them.
R.coreSwitch=typeof R.switch==='function'?R.switch.bind(R):null;
R.coreShow=typeof R.show==='function'?R.show.bind(R):null;
R.coreLoad=typeof R.load==='function'?R.load.bind(R):null;
R.coreRenderAll=typeof R.renderAll==='function'?R.renderAll.bind(R):null;
R.coreVersion='1';
})();
