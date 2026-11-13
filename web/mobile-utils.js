/* Neon mobile interaction primitives. Kept pure for deterministic Node tests. */
(() => {
  'use strict';
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const boardX=(clientX,rect,width=390,paddle=92)=>{
    if(!Number.isFinite(clientX)||!rect||rect.width<=0)return width/2;
    return clamp((clientX-rect.left)/rect.width*width,paddle/2+16,width-paddle/2-16);
  };
  const ease=(current,target,dt,rate=18)=>{
    if(!Number.isFinite(target))return current;
    if(!Number.isFinite(current))return target;
    return current+(target-current)*(1-Math.exp(-Math.max(0,dt)*rate));
  };
  const quality=(ageMs,intervalMs,connected=true)=>{
    if(!connected)return 'lost';
    if(!Number.isFinite(ageMs)||ageMs>1700)return 'lost';
    if(ageMs>450||intervalMs>190)return 'slow';
    return 'good';
  };
  window.NeonMobile={clamp,boardX,ease,quality};
})();
