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
  const position=()=>{
   const width=wrap.clientWidth,height=wrap.clientHeight;if(!width||!height)return;
   const placed=[],pinBoxes=labels.map(({anchor})=>({left:anchor.x*width-24,right:anchor.x*width+24,top:anchor.y*height-24,bottom:anchor.y*height+24}));
   const overlaps=(a,b)=>a.left<b.right+2&&a.right>b.left-2&&a.top<b.bottom+2&&a.bottom>b.top-2;
   labels.forEach(({label,anchor,p,line})=>{
    const candidate=validPoint(p.label_anchor_candidate)?p.label_anchor_candidate:{x:anchor.x+(anchor.x>.65?-.13:.13),y:anchor.y-.04};
    const half=label.offsetWidth/2,halfHeight=label.offsetHeight/2;
    let box=null,x=0,y=0;
    // Candidate anchors are hints: never place a caption over a numbered touch target.
    for(const cx of [candidate.x*width,anchor.x*width-half-28,anchor.x*width+half+28,width/2]){
     for(const dy of [0,-32,32,-64,64,-96,96,-128,128]){
      x=Math.max(half+2,Math.min(width-half-2,cx));y=Math.max(halfHeight+2,Math.min(height-halfHeight-2,candidate.y*height+dy));
      const next={left:x-half,right:x+half,top:y-halfHeight,bottom:y+halfHeight};
      if(![...pinBoxes,...placed].some(other=>overlaps(next,other))){box=next;break}
     }
     if(box)break;
    }
    placed.push(box||{left:x-half,right:x+half,top:y-halfHeight,bottom:y+halfHeight});
    label.style.left=(22+x-anchor.x*width)+'px';label.style.top=(22+y-anchor.y*height)+'px';
    line.setAttribute('x1',1000*anchor.x);line.setAttribute('y1',1000*anchor.y);line.setAttribute('x2',1000*x/width);line.setAttribute('y2',1000*y/height);
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
