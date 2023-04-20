import net from "net";
export default function portInUse(port: number, callback: (status: boolean) => void) {
    var server = net.createServer(function (socket) {
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
};