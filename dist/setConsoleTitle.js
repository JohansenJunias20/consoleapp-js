"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function setConsoleTitle(title) {
    process.stdout.write(String.fromCharCode(27) + "]0;" + title + String.fromCharCode(7));
}
exports.default = setConsoleTitle;
