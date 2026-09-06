(function(){
  function bind(){
    var b=document.querySelector('.ilg-btn');
    if(!b||b.dataset.dragFixed)return;
    b.dataset.dragFixed='1';
    var saved;try{saved=JSON.parse(localStorage.getItem('ilchats-gemini-position')||'null')}catch(_){}
    function place(x,y){var maxX=Math.max(8,innerWidth-b.offsetWidth-8),maxY=Math.max(8,innerHeight-b.offsetHeight-76);x=Math.min(maxX,Math.max(8,x));y=Math.min(maxY,Math.max(8,y));b.style.setProperty('left',x+'px','important');b.style.setProperty('top',y+'px','important');b.style.setProperty('right','auto','important');b.style.setProperty('bottom','auto','important');return{x:x,y:y}}
    if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y))requestAnimationFrame(function(){place(saved.x,saved.y)});
    b.addEventListener('pointerdown',function(e){
      if(e.button!==undefined&&e.button!==0)return;
      var rect=b.getBoundingClientRect(),sx=e.clientX,sy=e.clientY,ox=sx-rect.left,oy=sy-rect.top,moved=false;
      b.setPointerCapture&&b.setPointerCapture(e.pointerId);b.classList.add('ilg-dragging');
      function move(ev){if(Math.hypot(ev.clientX-sx,ev.clientY-sy)>5)moved=true;if(moved){ev.preventDefault();place(ev.clientX-ox,ev.clientY-oy)}}
      function end(){b.removeEventListener('pointermove',move);b.removeEventListener('pointerup',end);b.removeEventListener('pointercancel',end);b.classList.remove('ilg-dragging');if(moved){var r=b.getBoundingClientRect();localStorage.setItem('ilchats-gemini-position',JSON.stringify({x:r.left,y:r.top}));b.addEventListener('click',function stop(x){x.preventDefault();x.stopImmediatePropagation();b.removeEventListener('click',stop,true)},true)}}
      b.addEventListener('pointermove',move);b.addEventListener('pointerup',end);b.addEventListener('pointercancel',end);
    });
  }
  new MutationObserver(bind).observe(document.body,{childList:true,subtree:true});bind();
})();