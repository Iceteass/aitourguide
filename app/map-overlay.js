// Normalized reference routes and opt-in labels; legacy maps keep embedded pins.
(() => {
'use strict';
const validPoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1;
function visibleSegments(route,points){
 if(!route)return [];
 if(route.coordinate_system!=='relative'||!Array.isArray(route.segments)||!Array.isArray(route.omitted_connections||[]))throw Error('추천 경로 형식 오류');
 const key=s=>[s.from_poi_id,s.to_poi_id].sort().join('>');
 const ids=new Set(points.map(p=>p.poi_id)),omitted=new Set((route.omitted_connections||[]).map(key));
 return route.segments.filter(s=>s.visibility==='show'&&!omitted.has(key(s))).map(s=>{
  if(!ids.has(s.from_poi_id)||!ids.has(s.to_poi_id)||!Array.isArray(s.waypoints)||s.waypoints.length<2||!s.waypoints.every(validPoint))throw Error('추천 경로 좌표 오류');
  return s;
 });
}
let observer=null;
function render(wrap,{points,pois,route,pinStyle,warning=''}){
 observer?.disconnect();observer=null;
 wrap.querySelectorAll('[data-map-overlay]').forEach(n=>n.remove());
 const buttons=[...wrap.querySelectorAll('#hotspots button')];
 buttons.forEach((b,i)=>{b.classList.remove('v-labelled-pin');b.textContent=i+1});
 const image=wrap.querySelector('img');
 if(pinStyle==='number-label'){
  const labels=[],links=document.createElementNS('http://www.w3.org/2000/svg','svg');
  links.dataset.mapOverlay='pin-links';links.classList.add('v-pin-connectors');links.setAttribute('viewBox','0 0 1000 1000');links.setAttribute('preserveAspectRatio','none');links.setAttribute('aria-hidden','true');image.after(links);
  buttons.forEach((b,i)=>{
   const p=points[i],anchor=validPoint(p.pin_anchor)?p.pin_anchor:p;
   b.classList.add('v-labelled-pin');b.style.left=100*anchor.x+'%';b.style.top=100*anchor.y+'%';
   const number=document.createElement('span');number.className='v-pin-number';number.textContent=p.number||i+1;
   const label=document.createElement('span');label.className='v-pin-label';label.textContent=p.label||pois[i].title;
   const line=document.createElementNS(links.namespaceURI,'line');line.setAttribute('vector-effect','non-scaling-stroke');links.append(line);
   b.replaceChildren(number,label);labels.push({b,label,anchor,p,line});
  });
  const legend=document.createElement('details');legend.dataset.mapOverlay='label-legend';legend.className='v-map-label-legend';legend.hidden=true;
  const summary=document.createElement('summary');summary.textContent='장소 이름 보기';legend.append(summary);
  const list=document.createElement('ol');legend.append(list);
  labels.forEach(({b,label,p},i)=>{const item=document.createElement('li'),button=document.createElement('button');button.type='button';button.textContent=(p.number||i+1)+'. '+label.textContent;button.onclick=()=>b.click();item.append(button);list.append(item)});wrap.append(legend);
  const position=()=>{
   // Restore measurable captions after a previous compact fallback.
   labels.forEach(({label})=>{label.style.visibility='hidden';label.style.display=''});
   const width=wrap.clientWidth,height=wrap.clientHeight;if(!width||!height)return;
   const overlaps=(a,b)=>a.left<b.right+3&&a.right>b.left-3&&a.top<b.bottom+3&&a.bottom>b.top-3;
   const crosses=(a,b)=>{
    const turn=(x,y,z)=>(y.x-x.x)*(z.y-x.y)-(y.y-x.y)*(z.x-x.x);
    const on=(p,q,r)=>Math.abs(turn(p,q,r))<.001&&r.x>=Math.min(p.x,q.x)-.001&&r.x<=Math.max(p.x,q.x)+.001&&r.y>=Math.min(p.y,q.y)-.001&&r.y<=Math.max(p.y,q.y)+.001;
    return (turn(a.start,a.end,b.start)*turn(a.start,a.end,b.end)<0&&turn(b.start,b.end,a.start)*turn(b.start,b.end,a.end)<0)||on(a.start,a.end,b.start)||on(a.start,a.end,b.end)||on(b.start,b.end,a.start)||on(b.start,b.end,a.end);
   };
   const hits=(line,box)=>{
    const corners=[{x:box.left,y:box.top},{x:box.right,y:box.top},{x:box.right,y:box.bottom},{x:box.left,y:box.bottom}];
    return corners.some((start,i)=>crosses(line,{start,end:corners[(i+1)%4]}));
   };
   const pinBoxes=labels.map(({anchor})=>({left:anchor.x*width-24,right:anchor.x*width+24,top:anchor.y*height-24,bottom:anchor.y*height+24}));
   // Generate short local connectors first, then solve labels and lines together.
   // Checking future pins here prevents an early caption from blocking another spot.
   const candidates=labels.map(({label,anchor,p},index)=>{
    const start={x:anchor.x*width,y:anchor.y*height},half=label.offsetWidth/2,hh=label.offsetHeight/2,result=[];
    const hint=validPoint(p.label_anchor_candidate)?{x:p.label_anchor_candidate.x*width,y:p.label_anchor_candidate.y*height}:start;
    const step=Math.max(8,Math.sqrt(width*height/5000));
    for(let y=hh+3;y<=height-hh-3;y+=step)for(let x=half+3;x<=width-half-3;x+=step){
     const box={left:x-half,right:x+half,top:y-hh,bottom:y+hh};
     if(pinBoxes.some(pin=>overlaps(box,pin)))continue;
     const dx=x-start.x,dy=y-start.y,ratio=Math.min(half/Math.abs(dx||.001),hh/Math.abs(dy||.001));
     const line={start,end:{x:x-dx*ratio,y:y-dy*ratio}};
     if(pinBoxes.some((pin,j)=>j!==index&&hits(line,pin)))continue;
     result.push({box,line,x,y,score:Math.hypot(dx,dy)+.08*Math.hypot(x-hint.x,y-hint.y)});
    }
    return result.sort((a,b)=>a.score-b.score).slice(0,160);
   });
   const placed=[];let attempts=0;const maxAttempts=12000;
   const solve=index=>{
    if(index===labels.length)return true;
    for(const next of candidates[index]){
     if(attempts>=maxAttempts)return false;attempts++;
     if(placed.some(other=>overlaps(next.box,other.box)||hits(next.line,other.box)||hits(other.line,next.box)||crosses(next.line,other.line)))continue;
     placed.push(next);if(solve(index+1))return true;placed.pop();
    }
    return false;
   };
   const solved=solve(0);
   legend.hidden=solved;links.style.display=solved?'':'none';wrap.dataset.labelLayout=solved?'placed':'legend';
   labels.forEach(({label})=>{label.style.visibility=solved?'':'hidden';label.style.display=solved?'':'none'});
   if(!solved)return;
   labels.forEach(({label,anchor,line},i)=>{
    const {x,y,line:connector}=placed[i];
    label.style.left=(22+x-anchor.x*width)+'px';label.style.top=(22+y-anchor.y*height)+'px';
    line.setAttribute('x1',1000*anchor.x);line.setAttribute('y1',1000*anchor.y);
    line.setAttribute('x2',1000*connector.end.x/width);line.setAttribute('y2',1000*connector.end.y/height);
   });
  };
  observer=new ResizeObserver(position);observer.observe(wrap);position();
 }
 let segments=[];
 try{segments=visibleSegments(route,points)}catch(error){warning=error.message+' · 지도 스팟은 계속 이용할 수 있습니다.'}
 if(segments.length){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.dataset.mapOverlay='route';svg.classList.add('v-reference-route');svg.setAttribute('viewBox','0 0 1000 1000');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');
  for(const segment of segments){const line=document.createElementNS(svg.namespaceURI,'polyline');line.setAttribute('points',segment.waypoints.map(p=>1000*p.x+','+1000*p.y).join(' '));line.dataset.from=segment.from_poi_id;line.dataset.to=segment.to_poi_id;line.setAttribute('vector-effect','non-scaling-stroke');svg.append(line)}
  image.after(svg);
  const toggle=document.createElement('button');toggle.type='button';toggle.dataset.mapOverlay='toggle';toggle.className='v-route-toggle';toggle.setAttribute('aria-pressed','true');toggle.textContent='참고 동선 숨기기';toggle.onclick=()=>{const show=toggle.getAttribute('aria-pressed')!=='true';toggle.setAttribute('aria-pressed',String(show));svg.style.display=show?'':'none';toggle.textContent=show?'참고 동선 숨기기':'참고 동선 표시'};wrap.append(toggle);
 }
 if(route||warning){const notice=document.createElement('p');notice.dataset.mapOverlay='notice';notice.className='v-route-notice';notice.setAttribute('role','status');notice.textContent=warning||'추천 동선은 참고용입니다. 실제 이동은 현장 안내·출입 제한을 따르세요.';wrap.append(notice)}
}
self.JourneyMapOverlay={visibleSegments,render};
})();
