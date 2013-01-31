var js = document.createElement('script');
js.setAttribute('data-base', chrome.extension.getURL('/'));
js.src = chrome.extension.getURL("js/customavatars.js?v=1_" + new Date().getTime());
js.id='customavatars';
document.body.appendChild(js);