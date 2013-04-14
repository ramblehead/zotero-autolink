var oldUpdateAttachmentButtonMenu = ZoteroPane.updateAttachmentButtonMenu;
function newUpdateAttachmentButtonMenu() {
    var ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
            .getService(Components.interfaces.nsIWindowWatcher);
    var ZoteroPane = ww.activeWindow.ZoteroPane;
    var id = "zotero-autolink-tb-attach-file-menuitem";
    if(ZoteroPane.document.getElementById(id) === null) {
        var tbb = ZoteroPane.document.getElementById("zotero-tb-attachment-add");
        var ns = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
        var mi = ZoteroPane.document.createElementNS(ns, "menuitem");
        mi.setAttribute("id", id);
        var cls = "menuitem-iconic zotero-menuitem-attachments-file";
        mi.setAttribute("class", cls);
        var lbl = "Attach Stored Copy of File with Autolink...";
        mi.setAttribute("label", lbl);
        mi.setAttribute("oncommand", "Zotero.Autolink.attachFileOnClick();");
        tbb.firstChild.insertBefore(mi, tbb.firstChild.childNodes[3]);
    }
    oldUpdateAttachmentButtonMenu.apply(this, arguments);
}
ZoteroPane.updateAttachmentButtonMenu = newUpdateAttachmentButtonMenu;
