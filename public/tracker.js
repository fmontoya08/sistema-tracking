/* Mini Analytics tracker (vanilla JS) */
(function(){
  try {
    var scr = document.currentScript;
    var API_TRACK = scr.getAttribute('data-endpoint') || '/api/track.php';
    var API_EVENT = scr.getAttribute('data-event-endpoint') || '/api/event.php';
    var SITE = scr.getAttribute('data-site') || 'default';
    var LS_KEY = 'ma_session_key';
    var UTM_KEY = 'ma_utm';

    function getUTM(){
      try{
        var utm = localStorage.getItem(UTM_KEY);
        if (utm) return JSON.parse(utm);
        var p = new URLSearchParams(location.search);
        var obj = {
          utm_source: p.get('utm_source') || null,
          utm_medium: p.get('utm_medium') || null,
          utm_campaign: p.get('utm_campaign') || null
        };
        if (obj.utm_source || obj.utm_medium || obj.utm_campaign) {
          localStorage.setItem(UTM_KEY, JSON.stringify(obj));
          return obj;
        }
        return {};
      }catch(e){ return {}; }
    }

    function sid(){
      try {
        var s = localStorage.getItem(LS_KEY);
        if (!s) {
          s = (Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));
          localStorage.setItem(LS_KEY, s);
        }
        return s;
      } catch(e) {
        return (window.__ma_s ||= Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));
      }
    }

    function send(url, payload){
      var data = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        var blob = new Blob([data], {type:'application/json'});
        navigator.sendBeacon(url, blob);
      } else {
        fetch(url, {method:'POST', headers:{'Content-Type':'application/json'}, body:data, keepalive:true}).catch(()=>{});
      }
    }

    function basePayload(){
      var utm = getUTM();
      return {
        site: SITE,
        session_key: sid(),
        url: location.href,
        title: document.title,
        referrer: document.referrer || null,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
        utm_source: utm.utm_source || null,
        utm_medium: utm.utm_medium || null,
        utm_campaign: utm.utm_campaign || null,
        width: window.innerWidth || null,
        height: window.innerHeight || null
      };
    }

    // Pageview on load
    function trackPageview(){
      var p = basePayload();
      p.type = 'pageview';
      send(API_TRACK, p);
    }

    // Heartbeat cada 5s
    var hbInterval;
    function startHeartbeat(){
      hbInterval = setInterval(function(){
        var p = basePayload();
        p.type = 'heartbeat';
        send(API_TRACK, p);
      }, 5000);
      document.addEventListener('visibilitychange', function(){
        if (document.hidden && hbInterval) { clearInterval(hbInterval); hbInterval=null; }
        else if (!document.hidden && !hbInterval) { startHeartbeat(); }
      });
    }

    // Detectar desconexión
    window.addEventListener('pagehide', function(){
      var p = basePayload();
      p.type = 'disconnect';
      navigator.sendBeacon(API_TRACK, new Blob([JSON.stringify(p)], {type:'application/json'}));
    });

    // Public API para eventos personalizados
    window.MiniAnalytics = {
      event: function(name, data){
        var p = basePayload();
        p.name = name;
        p.data = data || null;
        send(API_EVENT, p);
      }
    };

    trackPageview();
    startHeartbeat();
  } catch(e){}
})();
