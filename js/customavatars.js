var CustomAvatarsBase = $('#customavatars').data('base');
var InuLog  = function(a) { console.log(util.nowStr()+' Custom Avatars >> '+a); }


//DEBUG_MODE=1;

var inuloadJavascript = function(f,g,h) {
  var d = new jQuery.Deferred();
  
  var js = document.createElement('script');
  js.src = CustomAvatarsBase + 'js/'+f+'.js?v=' + Date.now();
  if (h&&h.url) {
    js.src = h.url+f+'.js';
  }
  
  //InuLog("Loading " + js.src);
  
  document.body.appendChild(js);

  setTimeout(function() {
    if (!h && window[g]) {
      d.resolve()
    }
    else if (h && !h.false && window[g]) {
      d.resolve()
    }
    else if (h && h.false && !window[g]) {
      d.resolve()
    }
    else {
      setTimeout(function(a) { a(); }, 50, arguments.callee)
    }
  }, 50)
  return d.promise(); 
}

InuLog("Initializing");
$.when(
  inuloadJavascript('reset', 'reset')
).then(function(){
  InuLog('reset.js loaded..')
  $.when(
    inuloadJavascript('underscore', '_')
  ).then(function() {
    InuLog('underscore.js loaded..')
    $.when(
	  inuloadJavascript('script', 'mConstObject')
    ).then(function() {
	  InuLog('custom avatars loaded :D')
    })
  })
})
