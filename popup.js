'use strict';
document.documentElement.lang = chrome.i18n.getUILanguage();
document.querySelectorAll('[data-i18n]').forEach(element => {
  element.textContent = chrome.i18n.getMessage(element.dataset.i18n);
});
document.title = chrome.i18n.getMessage('extensionName');
