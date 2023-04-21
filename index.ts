import net from "net";
const host = '127.0.0.1';
const TCPserver = net.createServer();
import udp from "dgram";
const UDPserver = udp.createSocket('udp4');
const UDPclient = udp.createSocket('udp4');
var TCPServerPort, UDPServerPort, UDPClientPort: number;
const { RTCPeerConnection } = require("wrtc");
import portInUse from "./portInUse";
var SOCKETID = "";
var isTaken = false;
async function checkPorts(port: number) {
    await new Promise((resolve) => {
        setTimeout(resolve, 1000);
    })
    portInUse(port, (status) => {
        console.log({ status })
        // return;
        if (!status) {

            //TCP Server
            TCPserver.listen(port, host, () => {
                console.log('TCP Server is running on port ' + port + '.');
                UDPserver.bind(port - 2);
                TCPServerPort = port;
                UDPServerPort = port - 2;
                UDPClientPort = port - 1;
                console.log({ TCPServerPort, UDPServerPort, UDPClientPort })
            });
            TCPserver.on("error", (err) => {
                console.log({ err })
                checkPorts(port + 3)
            })
            //UDP Server
        }
        else {
            checkPorts(port + 3);
        }
    })



}
// checkPorts(3003);

var ROLE = "";
import io from "socket.io-client";
import WebRTCServer from "./WebRTCServer";
import WebRTCClient from "./WebRTCclient";
import setConsoleTitle from "./setConsoleTitle";
var rtcServer: WebRTCServer, rtcClient: WebRTCClient;

function connectWSserver() {
    const ip = "ws://45.76.147.126:3000";
    const socket = io(ip);
    socket.on("connect", () => {
        console.log("CONNECTED!!");
        SOCKETID = socket.id;
        console.log({ socketid: socket.id })
    })
    // socket.on("connect", () => {
    // console.log(socket.connected); // true
    // });
    socket.on("role", (role) => {
        ROLE = role;
        console.log({ role })
        if (role == "server") {
            rtcServer = new WebRTCServer(socket);
            rtcServer.recieveReliable = (data) => {
                if (TCPsock)
                    TCPsock.write(data);
            }
            rtcServer.recieveUnreliable = (data) => {
                UDPclient.send(data, UDPClientPort, 'localhost', function (error) {
                    if (error) {
                        throw error;
                        UDPclient.close();
                    } else {
                        // console.log('Data sent !!!');
                    }

                });
            }

        }
        else {
            rtcClient = new WebRTCClient(socket);
            rtcClient.onRecieveReliable = (data) => {
                // console.log("recieve msg from server:");
                // console.log(data.toString());
                if (TCPsock) {
                    TCPsock.write(data);

                }
                else {
                    console.log("TCPSock not available!");
                }
            }
            rtcClient.onRecieveUnreliable = (data) => {
                // console.log("recieve msg unreliable from server:");
                UDPclient.send(data, UDPClientPort, 'localhost', function (error) {
                    if (error) {
                        throw error;
                        UDPclient.close();
                    } else {
                        // console.log('Data sent !!!');
                    }

                });
            }
        }
        setConsoleTitle(role);
    })
    // socket.
}
connectWSserver();


var TCPsock: net.Socket;
// var TCPsockets = []
TCPserver.on('connection', function (sock) {
    console.log('CONNECTED: ' + sock.remoteAddress + ':' + sock.remotePort);
    if (isTaken) {
        sock.write("taken");
        return;
    }


    isTaken = true;
    sock.write("ready");
    TCPsock = sock;
    // TCPsockets.push(sock);
    // sock.write(sock.remoteAddress + ':' + sock.remotePort + "  hello! ");

    sock.on('data', function (data) {
        if (data.toString() == "role") {
            sock.write(JSON.stringify({ channel: "role", to: "all", data: { role: ROLE, socketid: SOCKETID } }))
            return;
        }
        if (ROLE == "server") {
            rtcServer.broadcast_reliable(data, "-1");
        }
        else if (ROLE == "client") {
            rtcClient.sendReliable(data);
        }
        console.log({ data: data.toString() })
        // console.log('DATA ' + sock.remoteAddress + ': ' + data);
        // // Write the data back to all the connected, the client will receive it as data from the TCPserver
        // TCPsockets.forEach(function (sock, index, array) {
        //     sock.write(sock.remoteAddress + ':' + sock.remotePort + " said " + data + '\n');
        // });
    });
});


UDPserver.on('message', function (msg, info) {
    // console.log('Data received from client : ' + msg.toString());
    // console.log('Received %d bytes from %s:%d\n', msg.length, info.address, info.port);
    if (ROLE == "server") {
        rtcServer.broadcast_unreliable(msg, "-1");
    }
    else if (ROLE == "client") {
        rtcClient.sendUnreliable(msg);
    }
    // //sending msg
    // server.send(msg, info.port, 'localhost', function (error) {
    //     if (error) {
    //         client.close();
    //     } else {
    //         console.log('Data sent !!!');
    //     }

    // });

});


