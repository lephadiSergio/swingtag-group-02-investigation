(() => {
  const page = document.body.dataset.page;
  const links = [
    ["home","index.html","Overview"],["energy","energy-flow.html","Energy Flow"],
    ["simulations","simulations.html","Simulations"],["topologies","topologies.html","Topologies"],
    ["measurements","measurements.html","Measurements"],["game","game.html","NFC Game ↗"]
  ];
  const header = document.querySelector("[data-shared-header]");
  if (header) {
    header.innerHTML = `<a class="brand" href="index.html"><img src="assets/swingtag-logo.jpg" alt="SwingTag"><span><strong>SwingTag</strong><small>Group 02 · Wits Electrical Engineering</small></span></a><button class="menu-toggle" aria-expanded="false">Menu</button><nav class="site-nav">${links.map(([id,href,label])=>`<a class="${page===id?'active':''}" href="${href}">${label}</a>`).join("")}</nav>`;
    const toggle = header.querySelector(".menu-toggle"), nav = header.querySelector(".site-nav");
    toggle.addEventListener("click",()=>{const open=nav.classList.toggle("open");toggle.setAttribute("aria-expanded",String(open));});
  }
  const footer = document.querySelector("[data-shared-footer]");
  if (footer) footer.innerHTML = `SwingTag · Group 02 · Engineering claims marked as measured, calculated or illustrative · <a href="index.html">Project overview</a>`;

  const escText = value => String(value).replace(/\s+/g," ").trim().slice(0,24);
  const openers = ["you are","you remain","you are genuinely","you are remarkably","you are wonderfully","you are absolutely","you are impressively","you are brilliantly","you are consistently","you are uniquely","you are boldly","you are quietly","you are powerfully","you are naturally","you are truly","you are seriously","you are delightfully","you are spectacularly","you are confidently","you are exceptionally"];
  const qualities = ["brilliant","capable","creative","unstoppable","thoughtful","inspiring","resourceful","resilient","kind","sharp-minded","full of great energy","doing wonderful work"];
  const compliments = openers.flatMap(a => qualities.map(q => `${a} ${q}`)); // 240 unique combinations
  function nextCompliment(){
    let recent=[]; try{recent=JSON.parse(localStorage.getItem("swingtagComplimentHistory")||"[]");}catch{}
    const allowed=compliments.map((_,i)=>i).filter(i=>!recent.includes(i));
    const id=allowed[Math.floor(Math.random()*allowed.length)]; recent.push(id); recent=recent.slice(-16);
    localStorage.setItem("swingtagComplimentHistory",JSON.stringify(recent)); return compliments[id];
  }

  function initFlow(){
    const stageRoot=document.querySelector("#flowStage"); if(!stageRoot)return;
    const C=0.0047, THRESHOLD_VOLTAGE=2.8, REQUIRED_UPDATE_ENERGY=21.0;
    const fill=document.querySelector("#flowFill"), voltage=document.querySelector("#flowVoltage"), percent=document.querySelector("#flowPercent"), stored=document.querySelector("#storedEnergy"), budgetStored=document.querySelector("#budgetStored"), meter=document.querySelector("#energyMeterFill"), rail=document.querySelector("#flowRail"), status=document.querySelector("#flowStatus"), orb=document.querySelector("#monitorOrb"), copy=document.querySelector("#monitorCopy"), thresholdVoltage=document.querySelector("#thresholdVoltage"), thresholdBar=document.querySelector("#thresholdBar"), voltageCondition=document.querySelector("#voltageCondition"), energyCondition=document.querySelector("#energyCondition"), regInput=document.querySelector("#regInput"), regOutput=document.querySelector("#regOutput"), regBox=document.querySelector(".regulator-box"), mcu=document.querySelector("#mcuBox"), epaper=document.querySelector("#flowEpaper"), epaperText=document.querySelector("#epaperText"), updateCopy=document.querySelector("#updateCopy"), pendingBox=document.querySelector("#pendingUpdate");
    document.querySelector("#requiredEnergy").textContent=REQUIRED_UPDATE_ENERGY.toFixed(1);
    let start=performance.now(), raf=0, pending=null, successShown=false;
    const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
    function closeReveal(){const r=document.querySelector("#successReveal");r.classList.remove("show");r.setAttribute("aria-hidden","true");}
    function revealSuccess(){if(successShown||!pending)return;successShown=true;document.querySelector("#tagMessage").textContent=`${pending.name}, ${pending.compliment}!`;const r=document.querySelector("#successReveal");r.classList.add("show");r.setAttribute("aria-hidden","false");}
    function paint(now){
      const elapsed=reduced?15600:Math.min(now-start,16000), charge=Math.max(0,elapsed-4500);
      const v=charge<=6500?2.8*Math.min(1,charge/6500):2.8+.4*Math.min(1,(charge-6500)/2500);
      const energy=.5*C*v*v*1000, voltageReady=v>=THRESHOLD_VOLTAGE-.001, energyReady=energy>=REQUIRED_UPDATE_ENERGY, powerOn=voltageReady&&energyReady;
      let stage=elapsed<1500?1:elapsed<3000?2:elapsed<4500?3:!voltageReady?4:!energyReady?5:elapsed<14000?6:7;
      document.querySelectorAll("[data-flow-card]").forEach(card=>{const n=Number(card.dataset.flowCard);card.classList.toggle("active",n===stage);card.classList.toggle("complete",n<stage);});
      document.querySelectorAll(".energy-link").forEach((link,i)=>{const allowed=i<3?stage>=i+2:i===3?voltageReady:i>=4?powerOn:false;link.classList.toggle("on",allowed);});
      fill.style.height=`${v/3.2*100}%`;percent.textContent=`${Math.round(v/3.2*100)}%`;voltage.textContent=`${v.toFixed(2)} V`;thresholdVoltage.textContent=`${v.toFixed(2)} V`;thresholdBar.style.width=`${v/3.2*100}%`;stored.textContent=`${energy.toFixed(1)} mJ`;budgetStored.textContent=energy.toFixed(1);meter.style.width=`${Math.min(100,energy/(.5*C*3.2*3.2*1000)*100)}%`;
      voltageCondition.textContent=`${voltageReady?'✓':'○'} VSTORE ≥ 2.8 V`;energyCondition.textContent=`${energyReady?'✓':'○'} Stored energy ≥ update requirement`;voltageCondition.classList.toggle("met",voltageReady);energyCondition.classList.toggle("met",energyReady);
      orb.classList.toggle("on",powerOn);stageRoot.classList.toggle("power-on",powerOn);regBox.classList.toggle("on",powerOn);
      if(!voltageReady){orb.textContent="OFF · CHARGING";copy.textContent="Waiting for sufficient stored voltage.";}else if(!energyReady){orb.textContent="THRESHOLD REACHED";copy.textContent="Voltage condition passed. Not enough stored energy yet—keep charging.";}else{orb.textContent="POWER PATH ENABLED";copy.textContent="Both voltage and stored-energy conditions passed.";}
      regInput.textContent=powerOn?`INPUT: VSTORE ${v.toFixed(2)} V`:"INPUT: OFF";regOutput.textContent=powerOn?"OUTPUT: 3.3 V":"OUTPUT: OFF";rail.textContent=powerOn?"3.3 V":"OFF";
      mcu.innerHTML=powerOn&&stage>=7?"STM32<br><b>BOOTING</b>":"STM32<br><b>OFF</b>";epaperText.textContent=powerOn&&stage>=7?(pending?"REFRESHING":"READY"):"WAITING";updateCopy.textContent=powerOn&&stage>=7?(pending?"3.3 V rail active → STM32 boot → display data prepared → e-paper refresh.":"Energy conditions passed. No visitor update is queued."):"The card remains inactive until both voltage and energy conditions are satisfied.";
      epaper.classList.toggle("refresh",Boolean(powerOn&&stage>=7&&pending));
      status.textContent=stage===1?"NFC field detected. Energy is being coupled into the SwingTag antenna.":stage===2?"The passive antenna is receiving coupled NFC energy.":stage===3?"The ST25 is harvesting RF energy.":stage===4?"VSTORE is below 2.8 V. Harvested energy is charging the 4700 µF reservoir.":stage===5?"Threshold reached. Checking available energy for the requested display update.":stage===6?"Enough energy is available. Buck-boost regulator active; output stabilised at 3.3 V.":pending?"STM32 powered. Updating the e-paper display.":"Power is available, but no e-paper update is queued.";
      if(stage===7&&pending&&elapsed>15400){epaperText.textContent="UPDATE SUCCESSFUL";status.textContent="SwingTag update completed successfully.";revealSuccess();}
      if(elapsed<16000)raf=requestAnimationFrame(paint);
    }
    function replay(){cancelAnimationFrame(raf);closeReveal();successShown=false;epaper.classList.remove("refresh");start=performance.now();raf=requestAnimationFrame(paint);}
    document.querySelector("#replayFlow").addEventListener("click",replay);
    document.querySelector("#nameForm").addEventListener("submit",e=>{
      e.preventDefault();const name=escText(document.querySelector("#visitorName").value);if(!name)return;pending={name,compliment:nextCompliment()};pendingBox.querySelector("span").textContent="UPDATE QUEUED — HARVESTING ENERGY…";pendingBox.querySelector("strong").textContent=`Pending e-paper update: ${name.toUpperCase()} — “${pending.compliment}.”`;replay();stageRoot.scrollIntoView({behavior:"smooth",block:"start"});
    });
    document.querySelector("#closeReveal").addEventListener("click",closeReveal);
    document.querySelector("#replaySuccess").addEventListener("click",replay);
    document.querySelector("#anotherName").addEventListener("click",()=>{closeReveal();pending=null;pendingBox.querySelector("span").textContent="NO UPDATE QUEUED";pendingBox.querySelector("strong").textContent="Enter a name to prepare the next e-paper message.";const input=document.querySelector("#visitorName");input.value="";document.querySelector(".queue-lab").scrollIntoView({behavior:"smooth"});input.focus();});
    replay();
  }

  const NS="http://www.w3.org/2000/svg";
  function chart(svgId, series, opts={}){
    const svg=document.getElementById(svgId); if(!svg)return; svg.replaceChildren();
    const W=600,H=svg.viewBox.baseVal.height||340,p={l:58,r:22,t:25,b:45};
    const xs=series.flatMap(s=>s.data.map(d=>d[0])), ys=series.flatMap(s=>s.data.map(d=>d[1]));
    const xmin=opts.xmin??Math.min(...xs),xmax=opts.xmax??Math.max(...xs),ymin=opts.ymin??0,ymax=opts.ymax??(Math.max(...ys)*1.12||1);
    const x=v=>p.l+(v-xmin)/(xmax-xmin)*(W-p.l-p.r), y=v=>H-p.b-(v-ymin)/(ymax-ymin)*(H-p.t-p.b);
    const add=(tag,attrs,text)=>{const el=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));if(text)el.textContent=text;svg.append(el);return el};
    for(let i=0;i<=5;i++){const yy=p.t+i*(H-p.t-p.b)/5;add("line",{x1:p.l,y1:yy,x2:W-p.r,y2:yy,class:"chart-grid"});add("text",{x:8,y:yy+4,class:"chart-label"},(ymax-(ymax-ymin)*i/5).toFixed(opts.yDigits??1));}
    add("line",{x1:p.l,y1:p.t,x2:p.l,y2:H-p.b,class:"chart-axis"});add("line",{x1:p.l,y1:H-p.b,x2:W-p.r,y2:H-p.b,class:"chart-axis"});
    for(let i=0;i<=5;i++){const xx=p.l+i*(W-p.l-p.r)/5;add("text",{x:xx-9,y:H-15,class:"chart-label"},(xmin+(xmax-xmin)*i/5).toFixed(1));}
    series.forEach((s,si)=>{add("polyline",{points:s.data.map(d=>`${x(d[0])},${y(d[1])}`).join(" "),class:s.class||["chart-primary","chart-secondary","chart-tertiary"][si%3]});s.data.forEach(d=>add("circle",{cx:x(d[0]),cy:y(d[1]),r:5,class:"chart-point"}));});
    if(opts.marker!==undefined)add("line",{x1:x(opts.marker),y1:p.t,x2:x(opts.marker),y2:H-p.b,stroke:"#e24b58","stroke-width":3,"stroke-dasharray":"7 5"});
  }

  function initSim(){
    const d=document.querySelector("#distanceSlider"),v=document.querySelector("#vstoreSlider");if(!d||!v)return;
    function update(){
      const distance=Number(d.value),store=Number(v.value),enabled=store>=2.8;
      const field=Math.max(8,100*Math.exp(-.33*distance)),power=Math.max(3,100*Math.exp(-.58*distance)),charge=10+6.5*distance+5*distance*distance,success=Math.max(8,98-13*distance-5*distance*distance);
      document.querySelector("#distanceOut").textContent=`${distance.toFixed(1)} cm`;document.querySelector("#vstoreOut").textContent=`${store.toFixed(1)} V`;
      document.querySelector("#simState").textContent=enabled?"POWER PATH ENABLED":"POWER PATH DISABLED";
      document.querySelector("#monitorState").textContent=enabled?"Monitor ON":"Monitor OFF";document.querySelector("#switchState").textContent=enabled?"Switch ENABLED":"Switch OPEN";document.querySelector("#regulatorState").textContent=enabled?"Regulator ACTIVE":"Regulator OFF";document.querySelector("#mcuState").textContent=enabled?"MCU POWERED":"MCU OFF";
      document.querySelector("#fieldMetric").textContent=`${field.toFixed(0)}%`;document.querySelector("#powerMetric").textContent=`${power.toFixed(0)}%`;document.querySelector("#chargeMetric").textContent=`${charge.toFixed(1)} s`;document.querySelector("#successMetric").textContent=`${success.toFixed(0)}%`;
      const ds=Array.from({length:31},(_,i)=>i/10);chart("powerDistanceGraph",[{data:ds.map(x=>[x,100*Math.exp(-.58*x)])}],{xmin:0,xmax:3,ymax:105,marker:distance,yDigits:0});chart("chargeDistanceGraph",[{data:ds.map(x=>[x,10+6.5*x+5*x*x])}],{xmin:0,xmax:3,ymax:80,marker:distance,yDigits:0});chart("switchingGraph",[{data:[[0,0],[2.79,0],[2.8,3.3],[4,3.3]]}],{xmin:0,xmax:4,ymax:4.2,marker:store});
    } d.addEventListener("input",update);v.addEventListener("input",update);update();
  }
  function initMeasured(){
    chart("measuredLoadGraph",[{data:[[1.5,.35],[2,1.64],[2.5,2.48],[3,2.96],[3.5,3.48],[4,3.99]]},{data:[[1.5,1.5],[4,4]],class:"chart-ideal"}],{xmin:1.5,xmax:4,ymax:4.3});
    chart("measuredSenseGraph",[{data:[[1.5,.44],[2,.47],[2.5,.49],[3,.50],[3.5,.50],[4,.51]]},{data:[[1.5,.04],[2,.04],[2.5,.03],[3,.03],[3.5,.03],[4,.03]],class:"chart-tertiary"}],{xmin:1.5,xmax:4,ymax:.6,yDigits:2});
    chart("fineThresholdGraph",[{data:[[2,1.64],[2.1,1.94],[2.2,2.17],[2.3,2.28],[2.4,2.38],[2.5,2.47]]}],{xmin:2,xmax:2.5,ymax:2.7,marker:2.2});
  }
  initFlow();initSim();initMeasured();
})();
