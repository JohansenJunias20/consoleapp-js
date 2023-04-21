"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const { RTCPeerConnection } = require("wrtc");
class WebRTCClient {
    constructor(ws_socket) {
        ws_socket.on("joinpeer", (socketid) => {
            this.onJoinPeer(socketid);
        });
        this.ws = ws_socket;
        this.ws.on("get:master_csharp", (socketid_server) => {
            this.server.socketid = socketid_server;
            this.startConnect();
        });
        const peer = new RTCPeerConnection({
            iceServers: [{ urls: "turn:skripsi.orbitskomputer.com:3478", username: "guest", credential: "welost123", user: "guest" },
                { urls: "stun:stun.l.google.com:19302" }
            ]
        });
        // peer.startConnect
        const ref = this;
        peer.ondatachannel = (e) => {
            // e.channel.
            if (e.channel.label == "unreliable") {
                ref.server.dcUnreliable = e.channel;
                e.channel.onopen = (e) => {
                    // e.
                    console.log("data channel unreliable is open!");
                };
                e.channel.onmessage = (e) => {
                    if (ref.onRecieveUnreliable) {
                        // console.log("recieve msg from server via UNRELIABLE data channel:");
                        ref.onRecieveUnreliable(e.data);
                    }
                };
            }
            else if (e.channel.label == "reliable") {
                // e.channel.send
                ref.server.dcReliable = e.channel;
                e.channel.onopen = () => {
                    // e.
                    console.log("data channel reliable is open!");
                    e.channel.onmessage = (e) => {
                        console.log("recieve msg from server via reliable data channel:");
                        console.log(e.data.toString());
                        if (ref.onRecieveReliable) {
                            ref.onRecieveReliable(e.data);
                        }
                        else {
                            console.log("onRecieveReliable not found!");
                        }
                    };
                };
            }
        };
        this.ws.on("offer", (data) => __awaiter(this, void 0, void 0, function* () {
            console.log("recieve offer!");
            peer.setRemoteDescription(data.sdp);
            var answer = yield peer.createAnswer();
            peer.setLocalDescription(answer);
            console.log("answering..");
            this.ws.emit("answer", ({ sdp: peer.localDescription, type: 0, socketid: this.server.socketid }));
        }));
        this.ws.on("icecandidate", ({ candidate }) => {
            console.log("recieve ice candidate from server!");
            // console.log({ candidate })
            if (!candidate)
                return;
            peer.addIceCandidate(candidate).then(e => {
                console.log("success add candidate");
            }).catch((e) => {
                console.log("failed add ice candidate");
            });
            ;
        });
        peer.onicecandidate = ({ candidate }) => {
            console.log("sending.. ice candidate");
            this.ws.emit("icecandidate", ({ socketid: this.server.socketid, candidate, sdpindex: 0, sdpmid: 0 }));
        };
        // var dcUnreliable = peer.createDataChannel("unreliable", { ordered: false, maxRetransmits: 0 });
        // dcUnreliable.onopen = (e) => {
        //     console.log("data channel unreliable is open!");
        // }
        // var dcreliable = peer.createDataChannel("unreliable", { ordered: true });
        // dcUnreliable.onopen = (e) => {
        //     console.log("data channel unreliable is open!");
        // }
        this.server = {
            peer,
            socketid: "",
        };
        // this.peers[socketid] = peer;
        this.ws.emit("get:master_csharp", "");
    }
    startConnect() {
        // throw new Error("Method not implemented.");
        // this.server.peer.onicecandidate = (candidate) => {
        //     this.ws.emit("icecandidate", ({ socketid: this.server.socketid, candidate, sdpmid: 0, sdpindex: 0 }));
        // }
        this.ws.emit("joinpeer", "");
    }
    onJoinPeer(socketid) {
        // if (this.peers[socketid]) {
        //     return; //sudah ada
        // }
    }
    sendUnreliable(data) {
        if (this.server.dcUnreliable) {
            this.server.dcUnreliable.send(data.toString());
        }
        else {
            console.log("dcUnReliable not available");
        }
    }
    sendReliable(data) {
        if (this.server.dcReliable) {
            this.server.dcReliable.send(data.toString());
        }
        else {
            console.log("dcReliable not available");
        }
    }
}
exports.default = WebRTCClient;
