(function(){
  var retrying=false,lastScreen=null;
  function notice(text,error){var old=document.querySelector('.il-camera-state');if(old)old.remove();var n=document.createElement('div');n.className='il-camera-state';n.textContent=text;n.style.cssText='position:fixed;z-index:30000;top:18px;left:50%;transform:translateX(-50%);max-width:calc(100vw - 28px);padding:10px 15px;border-radius:13px;background:'+(error?'#8b1730':'#073d4d')+';color:#fff;font-weight:800;font-size:13px;box-shadow:0 10px 35px #000b;text-align:center';document.body.appendChild(n);if(!error)setTimeout(function(){n.remove()},3500)}
  async function recover(screen,video){
    if(retrying||!screen.isConnected)return;retrying=true;notice('Ligando a câmera…');
    try{
      var current=video.srcObject,track=current&&current.getVideoTracks&&current.getVideoTracks()[0];
      if(track&&track.readyState==='live'){video.muted=true;video.playsInline=true;await video.play().catch(function(){});await new Promise(function(r){setTimeout(r,1200)});if(video.videoWidth>0){notice('Câmera ligada');return}}
      var stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'user'},width:{ideal:1280},height:{ideal:720}},audio:false});
      var newTrack=stream.getVideoTracks()[0];video.srcObject=stream;video.muted=true;video.playsInline=true;await video.play();
      var pc=window.__ilActivePeerConnection;if(pc&&newTrack){var sender=pc.getSenders().find(function(x){return x.track&&x.track.kind==='video'});if(sender){var oldTrack=sender.track;await sender.replaceTrack(newTrack);if(oldTrack&&oldTrack!==newTrack)oldTrack.stop()}}
      notice('Câmera ligada');
    }catch(e){notice('A câmera foi bloqueada. Abra as permissões do IL Chat e permita a câmera.','error')}
    finally{retrying=false}
  }
  function check(){
    var screen=document.querySelector('.call-screen'),gemini=document.querySelector('.ilg-btn');if(gemini)gemini.style.setProperty('display',screen?'none':'','important');
    if(!screen){lastScreen=null;return}if(!screen.classList.contains('video')||screen===lastScreen)return;lastScreen=screen;
    setTimeout(function(){var video=screen.querySelector('.self-video video');if(video&&video.videoWidth===0)recover(screen,video)},2200);
  }
  new MutationObserver(check).observe(document.body,{childList:true,subtree:true});check();
})();