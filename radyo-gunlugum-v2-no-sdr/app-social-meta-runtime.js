(()=>{
const R=window.R;if(!R||R.__socialMetaRuntime20260917)return;R.__socialMetaRuntime20260917=true;
const IMAGE_PATH='assets/branding/r9012-og.png',TITLE='Radyo Günlüğüm',DESCRIPTION='TECSUN R-9012 için kişisel radyo günlüğü, yayın rehberi ve saha asistanı';
function property(name,value){let el=document.head.querySelector(`meta[property="${name}"]`);if(!el){el=document.createElement('meta');el.setAttribute('property',name);document.head.appendChild(el)}el.setAttribute('content',value);return el}
function named(name,value){let el=document.head.querySelector(`meta[name="${name}"]`);if(!el){el=document.createElement('meta');el.setAttribute('name',name);document.head.appendChild(el)}el.setAttribute('content',value);return el}
function imageLink(value){let el=document.head.querySelector('link[rel="image_src"]');if(!el){el=document.createElement('link');el.rel='image_src';document.head.appendChild(el)}el.href=value;return el}
function install(){const image=new URL(IMAGE_PATH,document.baseURI||location.href).href;property('og:type','website');property('og:title',TITLE);property('og:description',DESCRIPTION);property('og:image',image);property('og:image:type','image/png');property('og:image:width','1200');property('og:image:height','630');property('og:image:alt','TECSUN R-9012 ve Radyo Günlüğüm paylaşım kapağı');named('twitter:card','summary_large_image');named('twitter:title',TITLE);named('twitter:description',DESCRIPTION);named('twitter:image',image);imageLink(image);return image}
install();
R.events?.on?.('bootstrap:ready',install);
R.events?.on?.('branding:changed',install);
R.socialMetaRuntime={install,imagePath:IMAGE_PATH};
})();
