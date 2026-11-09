/* Keyboard/TV remote support for TV browsers with an ES5 web engine. */
(function (root, document) {
    "use strict";

    function isVisible(control) {
        var current = control;
        while (current && current !== document.documentElement) {
            if (current.hidden || (current.getAttribute && current.getAttribute("aria-hidden") === "true")) {
                return false;
            }
            current = current.parentNode;
        }
        return !!(control.getClientRects && control.getClientRects().length);
    }

    function controls() {
        var matches = document.querySelectorAll("button, a[href], summary, [tabindex='0']");
        var result = [];
        var index;
        for (index = 0; index < matches.length; index += 1) {
            if (!matches[index].disabled && isVisible(matches[index])) { result.push(matches[index]); }
        }
        return result;
    }

    function moveFocus(current, direction) {
        var available = controls();
        var origin;
        var best = null;
        var bestScore = Infinity;
        var index;
        var candidate;
        var x;
        var y;
        var main;
        var cross;
        var score;
        if (!available.length) { return; }
        if (available.indexOf(current) === -1) {
            available[0].focus();
            return;
        }
        origin = current.getBoundingClientRect();
        x = origin.left + origin.width / 2;
        y = origin.top + origin.height / 2;
        for (index = 0; index < available.length; index += 1) {
            candidate = available[index];
            if (candidate === current) { continue; }
            origin = candidate.getBoundingClientRect();
            main = direction === "left" ? x - (origin.left + origin.width / 2) :
                direction === "right" ? origin.left + origin.width / 2 - x :
                direction === "up" ? y - (origin.top + origin.height / 2) :
                origin.top + origin.height / 2 - y;
            if (main <= 1) { continue; }
            cross = direction === "left" || direction === "right" ?
                Math.abs(y - (origin.top + origin.height / 2)) :
                Math.abs(x - (origin.left + origin.width / 2));
            score = main + cross * 3;
            if (score < bestScore) { best = candidate; bestScore = score; }
        }
        if (best) { best.focus(); }
    }

    function handleBack(event, target) {
        var backControl;
        var details;
        var index;
        var application;
        var backControls = document.querySelectorAll("[data-back='true']");
        for (index = 0; index < backControls.length; index += 1) {
            if (!backControls[index].disabled && isVisible(backControls[index])) {
                backControl = backControls[index];
                break;
            }
        }
        if (backControl) {
            event.preventDefault();
            backControl.click();
            return;
        }
        details = document.querySelectorAll("details[open]");
        if (details.length) {
            event.preventDefault();
            details[details.length - 1].removeAttribute("open");
            details[details.length - 1].querySelector("summary").focus();
            return;
        }
        if (root.tizen && root.tizen.application && root.tizen.application.getCurrentApplication) {
            try {
                application = root.tizen.application.getCurrentApplication();
                if (application && application.exit) {
                    event.preventDefault();
                    application.exit();
                }
            } catch (ignore) { /* Preserve the platform's default Back behavior. */ }
        }
    }

    document.addEventListener("keydown", function (event) {
        var code = event.keyCode || event.which;
        var target = event.target || document.activeElement;
        if (code >= 37 && code <= 40) {
            event.preventDefault();
            moveFocus(target, code === 37 ? "left" : code === 38 ? "up" : code === 39 ? "right" : "down");
        } else if (code === 10009 || code === 27) {
            handleBack(event, target);
        }
    });

    document.addEventListener("DOMContentLoaded", function () {
        var available = controls();
        if (available.length && document.activeElement === document.body) {
            available[0].focus();
        }
    });

    root.KeyManagerRemote = {
        focusFirst: function () {
            var available = controls();
            var control = available.length ? available[0] : null;
            if (control) { control.focus(); }
        },
        controls: controls,
        moveFocus: moveFocus
    };
}(window, document));
