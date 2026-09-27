(function(){
  'use strict';
  function addPasswordEyes(){
    document.querySelectorAll('input[type="password"]').forEach(function(input){
      const field=input.closest('.field') || input.parentElement;
      if(!field || field.querySelector('.ilbp-password-eye')) return;
      field.style.position='relative'; input.style.paddingRight='48px';
      const b=document.createElement('button');
      b.type='button'; b.className='ilbp-password-eye'; b.textContent='👁';
      b.setAttribute('aria-label','Mostrar senha'); b.setAttribute('title','Mostrar senha');
      b.addEventListener('click',function(ev){
        ev.preventDefault(); ev.stopPropagation();
        const showing=input.type==='text'; input.type=showing?'password':'text';
        b.textContent=showing?'👁':'🙈';
        b.setAttribute('aria-label',showing?'Mostrar senha':'Ocultar senha');
        b.setAttribute('title',showing?'Mostrar senha':'Ocultar senha'); input.focus();
      });
      field.appendChild(b);
    });
  }
  new MutationObserver(addPasswordEyes).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',addPasswordEyes); else addPasswordEyes();
})();
