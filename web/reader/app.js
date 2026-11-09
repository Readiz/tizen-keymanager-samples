(function (root, document) {
    "use strict";

    function init() {
        var config = root.KM_SAMPLE_CONFIG;
        var button = document.getElementById("read");
        var output = document.getElementById("status");
        document.getElementById("writer-package").textContent = config.writerPackageId;
        document.getElementById("reader-package").textContent = config.readerPackageId;
        document.getElementById("sample-key").textContent = config.key;

        function show(message, kind) {
            output.textContent = message;
            output.setAttribute("data-kind", kind || "info");
            output.hidden = false;
        }

        button.addEventListener("click", function () {
            var called = false;
            button.disabled = true;
            show("Writer 소유 항목을 읽는 중…", "info");
            function finish(message, kind) {
                if (called) { return; }
                called = true;
                button.disabled = false;
                show(message, kind);
            }
            root.KeyManagerSample.readShared(config.writerPackageId, config.key, function (value) {
                var result = root.KeyManagerSample.classify(value, config.value);
                if (result === "match") { finish("Reader 읽기 성공 · 시험값과 일치합니다.", "success"); }
                else if (result === "empty") { finish("Reader 읽기 성공 · 값은 빈 문자열입니다.", "info"); }
                else { finish("Reader 읽기 성공 · 시험값과 다릅니다.", "info"); }
            }, function (error) {
                var name = root.KeyManagerSample.errorName(error);
                finish(name === "KeyManagerUnavailable" ? "KeyManager API를 사용할 수 없습니다. Samsung TV의 WGT 안에서 실행하세요." : "읽기 오류: " + name, "error");
            });
        });

        if (!root.tizen || !root.tizen.keymanager) {
            show("KeyManager API를 사용할 수 없습니다. Samsung TV의 WGT 안에서 실행하세요.", "info");
        }
    }

    document.addEventListener("DOMContentLoaded", init);
}(window, document));
