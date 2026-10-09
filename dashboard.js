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
    const track=document.querySelector("#flowTrack"); if(!track)return;
    const dots=document.querySelector("#stageDots"), fill=document.querySelector("#flowFill"), voltage=document.querySelector("#flowVoltage"), rail=document.querySelector("#flowRail"), status=document.querySelector("#flowStatus"), orb=document.querySelector("#monitorOrb"), copy=document.querySelector("#monitorCopy"), update=document.querySelector("#updateTag");
    const messages=["Max and Sergio are approaching the tag.","The phone field is coupling into the antenna.","The ST25 is producing harvested output.","The 4700 µF reservoir is accumulating energy.","The threshold monitor is checking VSTORE.","The buck-boost converter is establishing 3.3 V.","The STM32 and e-paper are ready to update."];
    dots.innerHTML=Array.from({length:7},(_,i)=>`<button type="button" aria-label="Show stage ${i+1}" data-dot="${i}"></button>`).join("");
    let start=performance.now(), raf=0, energyReady=false;
    const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
    const thresholds=[0,1100,2300,3400,8300,9500,10500];
    function paint(now){
      const elapsed=reduced?11000:Math.min(now-start,11600);
      let stage=thresholds.filter(t=>elapsed>=t).length-1; stage=Math.max(0,Math.min(6,stage));
      const v=Math.min(3.2,Math.max(0,(elapsed-2500)/6500*3.2)); energyReady=v>=2.8;
      track.style.transform=`translateX(-${stage*100}%)`;
      dots.querySelectorAll("button").forEach((b,i)=>b.classList.toggle("active",i===stage));
      fill.style.height=`${Math.min(100,v/3.2*100)}%`; voltage.textContent=`${v.toFixed(1)} V`;
      status.textContent=messages[stage]; rail.textContent=energyReady?`${v.toFixed(1)} V · LOAD ENABLED`:`${v.toFixed(1)} V · LOAD OFF`;
      orb.textContent=energyReady?"ON":"OFF"; orb.classList.toggle("on",energyReady);
      copy.textContent=energyReady?"Power path enabled. Stored energy may now be released to the regulator.":"Waiting for sufficient energy. Regulator and load remain disabled below 2.8 V.";
      update.disabled=!energyReady; update.textContent=energyReady?"Update the e-paper":"Waiting for energy…";
      if(elapsed<11600)raf=requestAnimationFrame(paint);
    }
    function replay(offset=0){cancelAnimationFrame(raf);start=performance.now()-offset;raf=requestAnimationFrame(paint);}
    document.querySelector("#replayFlow").addEventListener("click",()=>replay());
    dots.addEventListener("click",e=>{const b=e.target.closest("button");if(b)replay(thresholds[Number(b.dataset.dot)]);});
    document.querySelector("#nameForm").addEventListener("submit",e=>{
      e.preventDefault(); if(!energyReady)return; const name=escText(document.querySelector("#visitorName").value); if(!name)return;
      document.querySelector("#tagMessage").textContent=`${name}, ${nextCompliment()}!`;
      const reveal=document.querySelector("#successReveal"); reveal.classList.add("show"); reveal.setAttribute("aria-hidden","false");
    });
    document.querySelector("#closeReveal").addEventListener("click",()=>{const r=document.querySelector("#successReveal");r.classList.remove("show");r.setAttribute("aria-hidden","true");replay();});
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
