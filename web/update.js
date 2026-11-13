// Android APK updates are opt-in. The server publishes a small JSON manifest next to the APK.
(() => {
  const manifestUrl='https://dulmens.dk/downloads/neon.json';
  const apkUrl='https://dulmens.dk/downloads/neon.apk';
  const button=document.getElementById('check-update');
  const nativeAndroid=()=>window.Capacitor?.getPlatform?.()==='android';

  function compareVersions(a,b){
    const parse=value=>/^\d+\.\d+\.\d+$/.test(value)?value.split('.').map(Number):null;
    const left=parse(a),right=parse(b);
    if(!left||!right)throw new Error('Invalid version format');
    for(let i=0;i<3;i++)if(left[i]!==right[i])return Math.sign(left[i]-right[i]);
    return 0;
  }

  async function checkForNeonUpdate(manual=false){
    if(!nativeAndroid()){
      if(manual)window.alert('APK-opdatering er kun til Android.');
      return;
    }
    try{
      const installed=window.NEON_APP_VERSION;
      if(typeof installed!=='string')throw new Error('Installed version unavailable');
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),7000);
      let response;
      try{response=await fetch(`${manifestUrl}?t=${Date.now()}`,{cache:'no-store',signal:controller.signal});}
      finally{clearTimeout(timer);}
      if(!response.ok)throw new Error('Version file unavailable');
      const data=await response.json();
      if(!data||typeof data.version!=='string'||data.apkUrl!==apkUrl)throw new Error('Invalid update manifest');
      if(compareVersions(data.version,installed)<=0){
        if(manual)window.alert(`Du bruger allerede version ${installed}.`);
        return;
      }
      if(!window.confirm(`Neon ${data.version} er klar (installeret: ${installed}).\n\nVil du downloade opdateringen? Android skal godkende installationen.`))return;
      const browser=window.Capacitor?.Plugins?.Browser;
      if(!browser?.open)throw new Error('Browser plugin unavailable');
      await browser.open({url:apkUrl});
    }catch{
      if(manual)window.alert('Kunne ikke kontrollere opdateringer. Kontroller forbindelsen og versionsfilen på dulmens.dk.');
    }
  }

  if(button){
    button.addEventListener('click',()=>{void checkForNeonUpdate(true);});
    button.hidden=!nativeAndroid();
  }
  window.setTimeout(()=>{void checkForNeonUpdate();},6500);
  window.NeonCheckForUpdate=checkForNeonUpdate;
})();
