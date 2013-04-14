/* global Zotero, Components, dump, ZoteroPane, ZoteroOverlay */

Zotero.Autolink = new function() {
    this.init = init;
    this.extendItemContextMenu = extendItemContextMenu;
    this.editURLOnClick = editURLOnClick;
    this.editBaseURLOnClick = editBaseURLOnClick;
    this.attachFileOnClick = attachFileOnClick;
    this.addAutolinksToAll = addAutolinksToAll;
    this.removeAutolinksFromAll = removeAutolinksFromAll;

    var changeUrlCount = 0;

    function init() {
        config.init();

        // Register the callback in Zotero as an item observer
        var id = Zotero.Notifier.registerObserver(notifierCallback, ["item"]);

        // Unregister callback when the window closes.
        window.addEventListener("unload", function(e) {
            Zotero.Notifier.unregisterObserver(id);
        }, false);
    };

    var notifierCallback = new function() {
        this.notify = notify;

        function notify(event, type, ids, extraData) {
            if (event == "modify" && type == "item") {
                // dump("in 'if (event == \"modify\" && type == \"item\")'\n");
                // dump(JSON.stringify(ids, null, 4)+"\n");
                for(var i in ids) {
                    var item = Zotero.Items.get(ids[i]);
                    if (!isUrlAttachment(item)) continue;
                    // Avoid recursive call
                    if (changeUrlCount > 0) {
                        changeUrlCount--;
                        continue;
                    }
                    var oldFilename = getAutolinkUrl(item, false);
                    if(oldFilename) {
                        var newFilename = constructAutolinkUrl(item, false);
                        if(oldFilename !== newFilename) {
                            // dump("modifying url, according to filename...\n");
                            var url = constructAutolinkUrl(item);
                            item.setField("url", url);
                            item.setField("accessDate", "CURRENT_TIMESTAMP");
                            item.save();
                        }
                    }
                }
            }
        }
    };

    var config = new function() {
        this.init = init;
        // Might convert it to property...
        // property getter/setter definitions
        // look a bit ugly in js, I think...
        this.setBaseURL = setBaseURL;
        this.getBaseURL = getBaseURL;

        var baseURL = null;
        var DB = null;
        
        function init() {
            // Connect to (and create, if necessary)
            // autourl.sqlite in the Zotero directory.
            DB = new Zotero.DBConnection("autolink");

            if (!DB.tableExists("config")) {
                DB.query("CREATE TABLE config (baseurl TEXT)");
                DB.query("INSERT INTO config VALUES ('')");
            }
            getBaseURL();
        }

        function setBaseURL(value) {
            baseURL = value;
            DB.query("UPDATE config SET baseurl = " + "'" + value + "'");
        }

        function getBaseURL() {
            var result = baseURL;
            if(result == null) {
                var data = DB.query("SELECT baseurl FROM config")[0];
                baseURL = data["baseurl"];
                result = baseURL;
            }
            return result;
        }
    };

    function extendItemContextMenu () {
        var ZoteroPane = getActiveZoteroPane();

        var hidden = true;
        if (ZoteroPane.itemsView.selection.count == 1) {
            var item = ZoteroPane.getSelectedItems()[0];
            if (item.isAttachment()) {
                var mode = item.attachmentLinkMode;
                var M_URL = Zotero.Attachments.LINK_MODE_IMPORTED_URL;
                var M_FILE = Zotero.Attachments.LINK_MODE_IMPORTED_FILE;
                if(mode == M_URL || mode == M_FILE) hidden = false;
            }
        }

        var doc = ZoteroPane.document;
        var editURLMenuitem = 
                doc.getElementById('zotero-autolink-edit-url-menuitem');
        editURLMenuitem.hidden = hidden;

        ZoteroPane.buildItemContextMenu();
    }

    function editURLOnClick () {
        var window = getActiveWindow();
        var ZoteroPane = getActiveZoteroPane();
        var item = ZoteroPane.getSelectedItems()[0];

        var oldURL = { value: item.getField('url') };
        var newURL = { value: oldURL.value };
        var nsIPS = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
            .getService(Components.interfaces.nsIPromptService);
        var promptResult = nsIPS.prompt(
            window,
            '',
            'New URL:',
            newURL,
            null,
            {}
        );

        // If dialogue is cancelled
        if (!promptResult) return;
        // If value is not changed
        if (newURL.value == oldURL.value) return;

        changeUrlCount++;

        var URL = Zotero.Attachments.LINK_MODE_IMPORTED_URL;
        var FILE = Zotero.Attachments.LINK_MODE_IMPORTED_FILE;
        // If the new URL value is _not_ empty
        if (newURL.value) {
            item.setField('url', newURL.value);
            item.setField('accessDate', "CURRENT_TIMESTAMP");
            item.attachmentLinkMode = URL;
            //Zotero.Items.add(item.itemID, item);
            //Zotero.DB.beginTransaction();
            item.save();
            //Zotero.DB.commitTransaction();
            //Zotero.Items.cacheFields(['url','accessDate'], [item.itemID]);
        }
        // If the new URL value is empty
        else {
            if(item.attachmentLinkMode == URL) {
                item.setField('url', false);
                item.setField('accessDate', false);
                item.attachmentLinkMode = FILE;
                //Zotero.Items.add(item.itemID, item);
                //Zotero.DB.beginTransaction();
                item.save();
                //Zotero.DB.commitTransaction();
                //Zotero.Items.cacheFields(['url','accessDate'], [item.itemID]);
            }
        }
    };

    function editBaseURLOnClick() {
        var window = getActiveWindow();
        var oldBaseURL = { value: config.getBaseURL() };
        var newBaseURL = { value: oldBaseURL.value };
        var nsIPS = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
            .getService(Components.interfaces.nsIPromptService);
        var promptResult = nsIPS.prompt(
            window,
            "",
            "New Base URL for Autolink:",
            newBaseURL,
            null,
            {}
        );
        // If dialogue is cancelled
        if (!promptResult) return;
        if (newBaseURL.value == oldBaseURL.value) return;
        config.setBaseURL(newBaseURL.value);
        updateAttachmentsBaseURL();
    }

    // This function mostly resembles "Attach Stored Copy of File..."
    // function from Zotero source. It has been extended to handle
    // Autolink attachments
    // Its code is more or less makes sense to me, however I am not
    // entirely sure of the difference between ZoteroPane and
    // ZoteroPane_Local.
    function attachFileOnClick() {
        var window = getActiveWindow();
        var ZoteroPane = getActiveZoteroPane();

        var item = ZoteroPane.getSelectedItems()[0];
        var id = item.itemID;

        if (!ZoteroPane.canEdit()) {
            ZoteroPane.displayCannotEditLibraryMessage();
            return;
        }

        // TODO: disable in menu
        if (!ZoteroPane.canEditFiles()) {
            ZoteroPane.displayCannotEditLibraryFilesMessage();
            return;
        }

        var itemGroup = ZoteroPane.collectionsView.
            _getItemAtRow(ZoteroPane.collectionsView.selection.currentIndex);
        var libraryID = itemGroup.ref.libraryID;

        var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
        fp.init(window, Zotero.getString("pane.item.attachments.select"), nsIFilePicker.modeOpenMultiple);
        fp.appendFilters(Components.interfaces.nsIFilePicker.filterAll);

        if(fp.show() == nsIFilePicker.returnOK) {
            var files = fp.files;
            while (files.hasMoreElements()) {
                var file = files.getNext();
                file.QueryInterface(Components.interfaces.nsILocalFile);
                var attachmentID;
                //importSnapshotFromFile(file, url, title, mimeType, charset, sourceItemID)
                attachmentID = Zotero.Attachments.importFromFile(file, id, libraryID);
                var attachmentItem = Zotero.Items.get(attachmentID);
                var base = config.getBaseURL();
                var url = base + "/" + attachmentItem.key + "/" + file.leafName;
                //dump(url+"\n");
                attachmentItem.setField('url', url);
                attachmentItem.setField('accessDate', "CURRENT_TIMESTAMP");
                attachmentItem.attachmentLinkMode = Zotero.Attachments.LINK_MODE_IMPORTED_URL;
                attachmentItem.save();
                if(attachmentID && !id) {
                    var c = ZoteroPane.getSelectedCollection();
                    if(c) c.addItem(attachmentID);
                }
            }
        }
    };

    // Items batch processing

    function forItems(filter, action) {
        var items = Zotero.Items.getAll(false, "", true);

        // for(var i in items) {
        //     var item = items[i];
        //     if(filter(item)) action(item);
        // }

        Zotero.suppressUIUpdates = true;
        Zotero.DB.beginTransaction();
        try {
            for(var i in items) {
                var item = items[i];
                if(filter(item)) action(item);
            }
        }
        catch (e) {
            Zotero.DB.rollbackTransaction();
            Zotero.debug(e);
            throw(e);
        }
        finally {
            Zotero.suppressUIUpdates = false;
            Zotero.DB.commitTransaction();
        }
    }

    function updateAttachmentsBaseURL() {
        forItems(isAutolinkAttachment, function(item) {
            var oldUrl = getAutolinkUrl(item);
            var newUrl = constructAutolinkUrl(item);
            if (oldUrl !== newUrl) {
                changeUrlCount++;
                item.setField("url", newUrl);
                item.setField("accessDate", "CURRENT_TIMESTAMP");
                item.save();
            }
        });
    };

    function addAutolinksToAll() {
        var base = config.getBaseURL();
        forItems(isFileAttachment, function(item) {
            var M_URL = Zotero.Attachments.LINK_MODE_IMPORTED_URL;
            var file = item.getFile();
            var url = base + "/" + item.key + "/" + file.leafName;
            item.setField("url", url);
            item.setField("accessDate", "CURRENT_TIMESTAMP");
            item.attachmentLinkMode = M_URL;
            item.save();
        });
    }

    function removeAutolinksFromAll() {
        forItems(isAutolinkAttachment, function(item) {
            var M_FILE = Zotero.Attachments.LINK_MODE_IMPORTED_FILE;
            item.setField('url', false);
            item.setField('accessDate', false);
            item.attachmentLinkMode = M_FILE;
            item.save();
        });
    }

    // Utility functions

    function searchFilename(url, itemKey) {
        dump("entering function searchFilename\n");
        var regExpStr = itemKey + "/[^/\\\\]+$";
        var regExp = new RegExp(regExpStr);
        var idx = url.search(regExp);
        // dump("url = " + url + "\n");
        // dump("itemKey = " + itemKey + "\n");
        // dump("idx = " + idx + "\n");
        return idx;
    }

    function getAutolinkUrl(item, withBaseURL) {
        // dump("entering function getAutolinkUrl\n");
        // dump("item = " + item.key + "\n");
        withBaseURL = typeof withBaseURL !== "undefined" ? withBaseURL : true;
        if(!item.isAttachment()) return "";
        var M_URL = Zotero.Attachments.LINK_MODE_IMPORTED_URL;
        if(item.attachmentLinkMode == M_URL) {
            var url = item.getField("url");
            var idx = searchFilename(url, item.key);
            // not Autolink
            if(idx<0) return "";
            // Autolink url with base
            if (withBaseURL) return url;
            // Autolink url without base ("key/filename")
            return url.slice(idx);
        }
        return "";
    }

    function constructAutolinkUrl(item, withBaseURL) {
        withBaseURL = typeof withBaseURL !== "undefined" ? withBaseURL : true;
        var base = withBaseURL ? config.getBaseURL() + "/" : "";
        var file = item.getFile();
        return base + item.key + "/" + file.leafName;
    }

    function isAutolinkAttachment(item) {
        if(!item.isAttachment()) return false;
        var M_URL = Zotero.Attachments.LINK_MODE_IMPORTED_URL;
        if(item.attachmentLinkMode == M_URL) {
            var url = item.getField("url");
            var idx = searchFilename(url, item.key);
            if(idx>-1) return true;
        }
        return false;
    }

    function isUrlAttachment(item) {
        if(!item.isAttachment()) return false;
        var M_URL = Zotero.Attachments.LINK_MODE_IMPORTED_URL;
        if(item.attachmentLinkMode == M_URL) return true;
        return false;
    }

    function isFileAttachment(item) {
        if(!item.isAttachment()) return false;
        var M_FILE = Zotero.Attachments.LINK_MODE_IMPORTED_FILE;
        if(item.attachmentLinkMode == M_FILE) return true;
        return false;
    }

    function getActiveWindow() {
        // Find currently active firefox window
        var ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
                .getService(Components.interfaces.nsIWindowWatcher);
        return ww.activeWindow;
    }

    function getActiveZoteroPane () {
        var window = getActiveWindow();
        // Use global (context) ZoteroPane if activeWindow is not available
        // or if it does not have ZoteroPane in its layout.
        // If this plug-in works as expected, such situation should not occur.
        if (window == null) return ZoteroPane;
        if (window.ZoteroPane == null) return ZoteroPane;
        return window.ZoteroPane;
    }
};

// Initialise the utility
window.addEventListener("load", function(e) { Zotero.Autolink.init(); }, false);

// ZoteroPane.window.addEventListener("load", function(e) { dump("it works!\n"); }, false);


// Local Words: config accessDate url activeWindow ZoteroPane
// Local Words: js baseurl
