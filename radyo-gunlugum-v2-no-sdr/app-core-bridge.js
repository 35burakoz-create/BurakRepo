(()=>{
const R=window.R;if(!R||R.__coreBridge)return;R.__coreBridge=true;
// Capture pristine core primitives before feature layers can replace them.
R.coreSwitch=typeof R.switch==='function'?R.switch.bind(R):null;
R.coreShow=typeof R.show==='function'?R.show.bind(R):null;
R.coreLoad=typeof R.load==='function'?R.load.bind(R):null;
R.coreRenderAll=typeof R.renderAll==='function'?R.renderAll.bind(R):null;
R.coreBody=typeof R.body==='function'?R.body.bind(R):null;
R.coreReset=typeof R.reset==='function'?R.reset.bind(R):null;
R.coreEdit=typeof R.edit==='function'?R.edit.bind(R):null;
R.coreDel=typeof R.del==='function'?R.del.bind(R):null;
R.coreVersion='2';
})();
