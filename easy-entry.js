(function(){
  "use strict";
  var installedAuth=false, installedInvite=false, loading=false;

  function addWelcome(){
    var card=document.querySelector(".auth-card");
    if(!card||card.querySelector(".il-easy-start"))return;
    var guide=document.createElement("section");
    guide.className="il-easy-start";
    guide.setAttribute("aria-label","Como começar no IL Chats");
    guide.innerHTML="<strong>Entre e convide seus amigos — é fácil</strong><p>O IL Chats funciona como o WhatsApp: você cria sua conta e convida as pessoas com quem deseja conversar.</p><ul><li>Cadastro rápido e gratuito</li><li>Convite pronto pelo WhatsApp</li><li>Mensagens, fotos, áudio e vídeo</li></ul>";
    var title=card.querySelector("h2");
    if(title)card.insertBefore(guide,title);else card.prepend(guide);
    installedAuth=true;
  }

  function toolsClient(){
    if(window.__ilToolsClient)return window.__ilToolsClient;
    if(!window.supabase)return null;
    window.__ilToolsClient=window.supabase.createClient("https://ngidsolvxegpyrprlbex.supabase.co","sb_publishable_-8u67PtkHJj1yRVWtOIkog_2skdsDcz",{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    return window.__ilToolsClient;
  }

  async function invite(){
    if(loading)return;
    loading=true;
    try{
      var db=toolsClient();
      if(!db){alert("Aguarde alguns segundos e tente novamente.");return;}
      var auth=await db.auth.getUser(),user=auth.data&&auth.data.user;
      if(!user){alert("Entre na sua conta para convidar amigos.");return;}
      var result=await db.from("profiles").select("username,display_name").eq("id",user.id).maybeSingle();
      var profile=result.data;
      if(!profile||!profile.username){alert("Complete seu perfil antes de convidar.");return;}
      var link=location.origin+location.pathname+"?contato="+encodeURIComponent(profile.username);
      var name=profile.display_name||profile.username;
      var text="Olá! "+name+" convidou você para conversar no IL Chats. É gratuito e fácil de usar. Abra o convite: "+link;
      location.href="https://wa.me/?text="+encodeURIComponent(text);
    }catch(error){alert("Não foi possível abrir o convite agora. Tente novamente.");}
    finally{loading=false;}
  }

  function addInvite(){
    var empty=document.querySelector(".empty-conversation");
    if(!empty||empty.querySelector(".il-invite-whatsapp"))return;
    var button=document.createElement("button");
    button.type="button";
    button.className="il-invite-whatsapp";
    button.textContent="Convidar amigos pelo WhatsApp";
    button.onclick=invite;
    var help=document.createElement("small");
    help.className="il-invite-help";
    help.textContent="Seus contatos aparecem quando aceitarem seu convite.";
    empty.append(button,help);
    installedInvite=true;
  }

  function install(){
    if(!installedAuth||!document.querySelector(".il-easy-start"))addWelcome();
    if(!installedInvite||!document.querySelector(".il-invite-whatsapp"))addInvite();
  }
  new MutationObserver(install).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener("load",function(){setTimeout(install,300)});
  install();
})();
