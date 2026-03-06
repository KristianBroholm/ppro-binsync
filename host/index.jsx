// ExtendScript for Premiere Pro Bin Management
if (typeof($) == 'undefined') { $ = {}; }

$._ext_PPRO = {
    /**
     * Recursively searches for a file path in the project.
     * Normalizes slashes and handles case-insensitivity for robustness.
     */
    isFileInProject: function(root, filePath) {
        var target = filePath.replace(/\\/g, '/').toLowerCase();
        
        for (var i = 0; i < root.children.numItems; i++) {
            var item = root.children[i];
            
            if (item.type === ProjectItemType.BIN) {
                if (this.isFileInProject(item, filePath)) return true;
            } else {
                var mediaPath = item.getMediaPath();
                if (mediaPath) {
                    var normalizedMedia = mediaPath.replace(/\\/g, '/').toLowerCase();
                    if (normalizedMedia === target) {
                        return true;
                    }
                }
            }
        }
        return false;
    },

    /**
     * Finds or creates a bin hierarchy.
     */
    getOrCreateBin: function(pathString) {
        if (!app.project) {
            return "null";
        }

        var root = app.project.rootItem;
        if (!pathString || pathString === "" || pathString === "." || pathString === "./") {
            return "root";
        }

        pathString = pathString.replace(/^\/+|\/+$/g, '');
        var folders = pathString.split('/');
        var currentParent = root;

        for (var i = 0; i < folders.length; i++) {
            var folderName = folders[i];
            if (!folderName) continue;
            
            var found = false;
            for (var j = 0; j < currentParent.children.numItems; j++) {
                var item = currentParent.children[j];
                if (item.type === ProjectItemType.BIN && item.name === folderName) {
                    currentParent = item;
                    found = true;
                    break;
                }
            }

            if (!found) {
                currentParent = currentParent.createBin(folderName);
            }
        }
        return "success";
    },

    /**
     * Imports a file into a specific bin hierarchy if not already present.
     */
    importFileToBin: function(filePath, relativeBinPath) {
        try {
            if (!app.project) {
                return "Error: No active project.";
            }

            // RIGOROUS DUPLICATE CHECK
            if (this.isFileInProject(app.project.rootItem, filePath)) {
                return "exists";
            }

            this.getOrCreateBin(relativeBinPath);
            
            var targetBin = app.project.rootItem;
            if (relativeBinPath && relativeBinPath !== "" && relativeBinPath !== ".") {
                 var folders = relativeBinPath.replace(/^\/+|\/+$/g, '').split('/');
                 for (var i = 0; i < folders.length; i++) {
                     for (var j = 0; j < targetBin.children.numItems; j++) {
                         var item = targetBin.children[j];
                         if (item.type === ProjectItemType.BIN && item.name === folders[i]) {
                             targetBin = item;
                             break;
                         }
                     }
                 }
            }
            
            var success = app.project.importFiles([filePath], true, targetBin, false);
            return success ? "true" : "false";
        } catch (e) {
            return "Error: " + e.toString();
        }
    },

    /**
     * Attaches a proxy file to a high-res media item.
     * Uses path matching for precision, falls back to extension-less name matching.
     */
    attachProxyByPath: function(proxyPath, highResPath) {
        if (!app.project) return "Error: No project.";
        
        var targetHighRes = highResPath.replace(/\\/g, '/').toLowerCase();
        var targetFile = new File(highResPath);
        var targetNameBase = targetFile.name.substring(0, targetFile.name.lastIndexOf('.')).toLowerCase();
        // Remove common proxy suffix for comparison
        targetNameBase = targetNameBase.replace(/_proxy$/, "");
        
        function findAndAttach(root) {
            for (var i = 0; i < root.children.numItems; i++) {
                var item = root.children[i];
                if (item.type === ProjectItemType.BIN) {
                    if (findAndAttach(item)) return true;
                } else if (item.canProxy()) {
                    var mediaPath = item.getMediaPath();
                    if (mediaPath) {
                        var normalizedMedia = mediaPath.replace(/\\/g, '/').toLowerCase();
                        // 1. Match by exact path
                        if (normalizedMedia === targetHighRes) {
                            return item.attachProxy(proxyPath, 1); // 1 = is proxy
                        }
                    }
                    // 2. Match by base name (ignores extension and _proxy suffix)
                    var itemNameBase = item.name.substring(0, item.name.lastIndexOf('.')).toLowerCase();
                    itemNameBase = itemNameBase.replace(/_proxy$/, "");
                    
                    if (itemNameBase === targetNameBase) {
                         return item.attachProxy(proxyPath, 1);
                    }
                }
            }
            return false;
        }

        var success = findAndAttach(app.project.rootItem);
        return success ? "true" : "false";
    },

    /**
     * Traverses up from an item to find its relative bin path from root.
     */
    getItemBinPath: function(item) {
        var path = [];
        var current = item.parent;
        while (current && current.name !== "Root" && current.type === ProjectItemType.BIN) {
            // Check if current is rootItem to stop
            if (app.project && current.nodeId === app.project.rootItem.nodeId) {
                break;
            }
            path.unshift(current.name);
            current = current.parent;
        }
        return path.join('/');
    },

    /**
     * Returns the parent directory of the current project file.
     */
    getProjectParentPath: function() {
        if (!app.project || !app.project.path || app.project.path === "") {
            return "null";
        }
        var projFile = new File(app.project.path);
        if (projFile.parent) {
            return projFile.parent.fsName;
        }
        return "null";
    }
};


/**
 * Global listener for project item additions.
 * Bridges to the CEP panel via CSXSEvent.
 */
var oldItemAddedCallback = app.onItemAddedToProjectSuccess;
app.onItemAddedToProjectSuccess = function(whichProject, addedProjectItem) {
    if (oldItemAddedCallback) {
        try { oldItemAddedCallback(whichProject, addedProjectItem); } catch (e) {}
    }

    if (addedProjectItem && addedProjectItem.type === ProjectItemType.CLIP) {
        var mediaPath = addedProjectItem.getMediaPath();
        if (mediaPath) {
            var binPath = $._ext_PPRO.getItemBinPath(addedProjectItem);
            
            var xLib = new ExternalObject("lib:PlugPlugExternalObject");
            if (xLib) {
                var event = new CSXSEvent();
                event.type = "com.binsync.itemAdded";
                event.data = JSON.stringify({
                    mediaPath: mediaPath,
                    binPath: binPath,
                    name: addedProjectItem.name
                });
                event.dispatch();
            }
        }
    }
};

