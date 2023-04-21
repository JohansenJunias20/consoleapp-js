"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const net_1 = __importDefault(require("net"));
function portInUse(port, callback) {
    var server = net_1.default.createServer(function (socket) {
        // socket.write('Echo server\r\n');
        socket.pipe(socket);
    });
    server.on('error', function (e) {
        // console.log({ e })
        callback(true);
    });
    server.on('listening', function () {
        server.close(() => {
            callback(false);
        });
    });
    server.listen(port, '127.0.0.1');
}
exports.default = portInUse;
;
