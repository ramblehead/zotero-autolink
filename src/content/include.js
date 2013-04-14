// Only create main object once
if (!Zotero.Autolink) {
	const loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
					.getService(Components.interfaces.mozIJSSubScriptLoader);
	loader.loadSubScript("chrome://autolinkzotero/content/autolink.js");
}

// var oldOnLoad = ZoteroOverlay.onLoad;
// function vrOnLoad() {
//     dump("ZoteroOverlay.onLoad Overload\n");
//     oldOnLoad.apply(this, arguments);
//     var b = ZoteroPane.document.getElementById("zotero-tb-attachment-add");
//     var e = ZoteroPane.document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "menuitem");
//     e.setAttribute("label", "UUU");
//     b.firstChild.appendChild(e);
// }
// ZoteroOverlay.onLoad = vrOnLoad;

// var oldUpdateAttachmentButtonMenu = ZoteroPane.updateAttachmentButtonMenu;
// function newUpdateAttachmentButtonMenu() {
//     var ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
//             .getService(Components.interfaces.nsIWindowWatcher);
//     var ZoteroPane = ww.activeWindow.ZoteroPane;
//     var id = "zotero-autolink-tb-attach-file-menuitem";
//     if(ZoteroPane.document.getElementById(id) === null) {
//         var tbb = ZoteroPane.document.getElementById("zotero-tb-attachment-add");
//         var ns = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
//         var mi = ZoteroPane.document.createElementNS(ns, "menuitem");
//         mi.setAttribute("id", id);
//         var cls = "menuitem-iconic zotero-menuitem-attachments-file";
//         mi.setAttribute("class", cls);
//         var lbl = "Attach Stored Copy of File with Autolink...";
//         mi.setAttribute("label", lbl);
//         mi.setAttribute("oncommand", "Zotero.Autolink.attachFileOnClick();");
//         tbb.firstChild.insertBefore(mi, tbb.firstChild.childNodes[3]);
//     }
//     oldUpdateAttachmentButtonMenu.apply(this, arguments);
// }
// ZoteroPane.updateAttachmentButtonMenu = newUpdateAttachmentButtonMenu;

// window.addEventListener("load", function(e) {
//     function initTab(tab) {
//         var browser = window.gBrowser.getBrowserForTab(tab);
//         dump("browser.currentURI.spec = " + browser.currentURI.spec + "\n");
// 		if(browser.currentURI.spec == ZOTERO_TAB_URL) {
//             dump("In Zotero initTab()\n");
// 		}
//     }

//     // Init all existing tabs first
//     var tabs = window.gBrowser.tabs;
//     for (var i = 0; i < tabs.length; i++) initTab(tabs[i]);

//     // Listen to TabOpen to init any new tabs opened
//     window.gBrowser.tabContainer.addEventListener("TabOpen", function(event) {
//         initTab(event.target);
//     }, false);
// }, false);
