(function (root, document) {
    "use strict";

    var config = root.KM_SAMPLE_CONFIG;
    var busy = false;
    var confirmDelete = false;

    function element(id) { return document.getElementById(id); }

    function status(message, kind) {
        var output = element("status");
        output.textContent = message;
        output.setAttribute("data-kind", kind || "info");
        output.hidden = false;
    }

    function errorLabel(error) {
        var name = root.KeyManagerSample.errorName(error);
        if (name === "KeyManagerUnavailable") { return "이 환경에서 KeyManager API를 사용할 수 없습니다."; }
        return "오류: " + name;
    }

    function begin(message) {
        if (busy) { return false; }
        busy = true;
        status(message, "info");
        Array.prototype.forEach.call(document.querySelectorAll("button"), function (button) {
            button.disabled = true;
        });
        return true;
    }

    function end() {
        busy = false;
        Array.prototype.forEach.call(document.querySelectorAll("button"), function (button) {
            button.disabled = false;
        });
    }

    function renderPermissionSummary(summary, action) {
        var completed = [];
        var failed = [];
        var targets = summary && summary.results ? summary.results : [];
        var saved = action === "저장 및 READ 부여";
        var revoking = action === "권한 해제";
        var retry = revoking ? "공유 해제를 다시 실행해 실패한 해제를 재시도하세요." : "READ 다시 부여로 권한 설정만 재시도할 수 있습니다.";
        var index;
        if (summary && summary.error) {
            end();
            status((saved ? "저장은 완료됐지만 READ 권한 설정에 실패했습니다. 저장된 값은 유지됩니다. " : action + "에 실패했습니다. ") + errorLabel(summary.error) + " " + retry, "error");
            return;
        }
        for (index = 0; index < targets.length; index += 1) {
            if (targets[index].error) {
                failed.push(targets[index].label + " (" + root.KeyManagerSample.errorName(targets[index].error) + ")");
            } else {
                completed.push(targets[index].label);
            }
        }
        end();
        if (failed.length) {
            status((saved ? "저장은 완료됐고 항목은 유지됩니다. " : "기존 값을 변경하지 않았습니다. ") + action + " 완료 대상: " + (completed.join(", ") || "없음") + ". 실패 대상: " + failed.join(", ") + ". " + retry, "error");
        } else {
            status(action + " 완료: " + completed.join(", ") + ".", "success");
        }
    }

    function readOwner() {
        if (!begin("Writer 소유 항목을 읽는 중…")) { return; }
        root.KeyManagerSample.readOwned(config.key, function (value) {
            var result = root.KeyManagerSample.classify(value, config.value);
            end();
            if (result === "match") { status("Writer 읽기 성공 · 시험값과 일치합니다.", "success"); }
            else if (result === "empty") { status("Writer 읽기 성공 · 값은 빈 문자열입니다.", "info"); }
            else { status("Writer 읽기 성공 · 시험값과 다릅니다.", "info"); }
        }, function (error) {
            end(); status(errorLabel(error), "error");
        });
    }

    function setPermission(permission) {
        if (!begin(permission === "READ" ? "READ 권한을 설정하는 중…" : "공유 권한을 해제하는 중…")) { return; }
        if (permission === "READ") {
            root.KeyManagerSample.retryReadPermissions(config, function (summary) { renderPermissionSummary(summary, "READ 부여"); });
        } else {
            root.KeyManagerSample.revokeReadPermissions(config, function (summary) { renderPermissionSummary(summary, "권한 해제"); });
        }
    }

    function save() {
        if (!begin("기존 항목 여부를 확인하는 중…")) { return; }
        root.KeyManagerSample.saveNew(config, function (result) {
            if (result.exists) {
                end(); status("이미 같은 이름의 항목이 있습니다. 덮어쓰지 않았습니다. 읽거나 명시적으로 삭제한 뒤 다시 시도하세요.", "error");
                return;
            }
            if (result.error) {
                end(); status(errorLabel(result.error), "error");
                return;
            }
            renderPermissionSummary(result.permissions, "저장 및 READ 부여");
        });
    }

    function showDelete() {
        confirmDelete = true;
        element("confirm-box").hidden = false;
        element("confirm-delete").focus();
    }

    function hideDelete() {
        confirmDelete = false;
        element("confirm-box").hidden = true;
        element("show-delete").focus();
    }

    function deleteItem() {
        if (!confirmDelete || !begin("데모 항목을 삭제하는 중…")) { return; }
        root.KeyManagerSample.removeOwned(config, function (error) {
            end();
            hideDelete();
            if (error) { status(errorLabel(error), "error"); }
            else { status("Writer 소유 tcstring 항목을 삭제했습니다. 공유 권한도 정리해야 한다면 TV SDK 동작을 확인하세요.", "success"); }
        });
    }

    function init() {
        element("sample-key").textContent = config.key;
        element("writer-package").textContent = config.writerPackageId;
        element("reader-package").textContent = config.readerPackageId;
        element("native-package").textContent = config.nativePackageId || "설정되지 않음";
        element("save").addEventListener("click", save);
        element("read-owner").addEventListener("click", readOwner);
        element("retry").addEventListener("click", function () { setPermission("READ"); });
        element("revoke").addEventListener("click", function () { setPermission("NONE"); });
        element("show-delete").addEventListener("click", showDelete);
        element("confirm-delete").addEventListener("click", deleteItem);
        element("cancel-delete").addEventListener("click", hideDelete);
        if (!root.tizen || !root.tizen.keymanager) {
            status("KeyManager API를 사용할 수 없습니다. Samsung TV의 WGT 안에서 실행하세요.", "info");
        }
    }

    document.addEventListener("DOMContentLoaded", init);
}(window, document));
