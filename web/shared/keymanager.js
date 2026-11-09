/* Tizen 3.0+ KeyManager helpers shared by both sample applications. */
(function (root) {
    "use strict";

    function once(callback) {
        var done = false;
        return function () {
            if (done) { return; }
            done = true;
            callback.apply(null, arguments);
        };
    }

    function api(method) {
        var keymanager = root.tizen && root.tizen.keymanager;
        if (!keymanager || typeof keymanager[method] !== "function") {
            var unavailable = new Error("Tizen KeyManager API is unavailable");
            unavailable.name = "KeyManagerUnavailable";
            throw unavailable;
        }
        return keymanager;
    }

    function errorName(error) {
        return error && error.name ? String(error.name) : "알 수 없는 오류";
    }

    function readOwned(key, success, failure) {
        var finish = once(function (error, value) {
            if (error) { failure(error); return; }
            success(value);
        });
        try {
            finish(null, api("getData").getData({ name: key }, null));
        } catch (error) {
            finish(error);
        }
    }

    function readShared(writerPackageId, key, success, failure) {
        var finish = once(function (error, value) {
            if (error) { failure(error); return; }
            success(value);
        });
        try {
            finish(null, api("getData").getData({ packageId: writerPackageId, name: key }, null));
        } catch (error) {
            finish(error);
        }
    }

    function classify(value, expected) {
        if (value === "") { return "empty"; }
        return value === expected ? "match" : "different";
    }

    function permissionTargets(config) {
        var targets = [{ label: "별도 웹 Reader", packageId: config.readerPackageId }];
        if (config.nativePackageId) {
            targets.push({ label: "제품 Native 앱", packageId: config.nativePackageId });
        }
        return targets;
    }

    function changePermissions(config, permission, done) {
        var keymanager;
        var targets = permissionTargets(config);
        var results = [];
        var position = 0;
        var finish = once(done);
        try {
            keymanager = api("setPermission");
        } catch (error) {
            finish({ error: error, results: [] });
            return;
        }

        function next() {
            var target;
            var complete;
            if (position >= targets.length) {
                finish({ error: null, results: results });
                return;
            }
            target = targets[position];
            position += 1;
            complete = once(function (error) {
                results.push({
                    label: target.label,
                    packageId: target.packageId,
                    permission: permission,
                    error: error || null
                });
                next();
            });
            try {
                keymanager.setPermission(
                    { name: config.key },
                    target.packageId,
                    permission,
                    function () { complete(null); },
                    function (error) { complete(error); }
                );
            } catch (error) {
                complete(error);
            }
        }

        next();
    }

    function saveNew(config, done) {
        var finish = once(done);
        readOwned(config.key, function () {
            finish({ exists: true, error: null, permissions: null });
        }, function (readError) {
            var keymanager;
            var saveComplete;
            if (errorName(readError) !== "NotFoundError") {
                finish({ exists: false, error: readError, permissions: null });
                return;
            }
            try {
                keymanager = api("saveData");
            } catch (error) {
                finish({ exists: false, error: error, permissions: null });
                return;
            }
            saveComplete = once(function (saveError) {
                if (saveError) {
                    finish({ exists: false, error: saveError, permissions: null });
                    return;
                }
                changePermissions(config, "READ", function (permissionSummary) {
                    finish({ exists: false, error: null, permissions: permissionSummary });
                });
            });
            try {
                keymanager.saveData(
                    config.key,
                    config.value,
                    null,
                    function () { saveComplete(null); },
                    function (error) { saveComplete(error); }
                );
            } catch (error) {
                saveComplete(error);
            }
        });
    }

    function retryReadPermissions(config, done) {
        changePermissions(config, "READ", once(done));
    }

    function revokeReadPermissions(config, done) {
        changePermissions(config, "NONE", once(done));
    }

    function removeOwned(config, done) {
        var finish = once(done);
        try {
            api("removeData").removeData({ name: config.key });
            finish(null);
        } catch (error) {
            if (errorName(error) === "NotFoundError") {
                finish(null);
            } else {
                finish(error);
            }
        }
    }

    root.KeyManagerSample = {
        errorName: errorName,
        classify: classify,
        readOwned: readOwned,
        readShared: readShared,
        saveNew: saveNew,
        retryReadPermissions: retryReadPermissions,
        revokeReadPermissions: revokeReadPermissions,
        removeOwned: removeOwned
    };
}(window));
