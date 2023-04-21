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
class WebRTCServer {
    constructor(ws_socket) {
        ws_socket.on("joinpeer", (socketid) => {
            this.onJoinPeer(socketid);
        });
        ws_socket.on("icecandidate", ({ candidate, socketid }) => {
            console.log("recieve ice candidate from clients");
            if (!candidate)
                return;
            // console.log({ candidate })
            console.log({ rtc: this.peers[socketid].rtc });
            this.peers[socketid].rtc.addIceCandidate(candidate).then(e => {
                console.log("success add candidate");
            }).catch((e) => {
                console.log("failed add ice candidate");
            });
        });
        ws_socket.on("answer", ({ sdp, socketid }) => {
            console.log("recieve answer.");
            this.peers[socketid].rtc.setRemoteDescription(sdp);
            // console.log({ peers: this.peers[socketid] });
        });
        this.ws = ws_socket;
        this.peers = {};
    }
    onJoinPeer(socketid) {
        if (this.peers[socketid]) {
            return; //sudah ada
        }
        console.log("peer joined with: " + socketid);
        console.log("my socket id is: " + this.ws.id);
        const peer = new RTCPeerConnection({
            iceServers: [{ urls: "turn:skripsi.orbitskomputer.com:3478", username: "guest", credential: "welost123", user: "guest" },
                { urls: "stun:stun.l.google.com:19302" }
            ]
        });
        peer.onicecandidateerror = (e) => {
            // console.log({e})
            // console.log("error ice candidate!");
        };
        peer.onicecandidate = ({ candidate }) => {
            console.log("sending ice candidate to client");
            this.ws.emit("icecandidate", ({ socketid: socketid, candidate, sdpindex: 0, sdpmid: 0 }));
        };
        peer.onnegotiationneeded = () => __awaiter(this, void 0, void 0, function* () {
            console.log("negotiation needed!");
            var offer_desc = yield peer.createOffer();
            yield peer.setLocalDescription(offer_desc);
            console.log("sending offer!!");
            this.ws.emit("offer", { sdp: peer.localDescription, type: 0, socketid }); //broadcast to others except me
        });
        const ref = this;
        var dcReliable = peer.createDataChannel("reliable", { ordered: false, maxRetransmits: 0 });
        dcReliable.onopen = (e) => {
            console.log("data channel Reliable is open!, starting broadcasting...");
            // setInterval(() => {
            //     ref.broadcast_reliable(Buffer.from("test", "utf-8"), "-1");
            // },1/30)
        };
        dcReliable.onerror = (e) => {
            console.log("dc reliable error");
        };
        dcReliable.onclose = () => {
            console.log("dc reliable is closed!");
        };
        dcReliable.onmessage = (e) => {
            console.log("recieve msg from client via reliable data channel:");
            var data = e.data;
            console.log(data.toString());
            // console.log("recieve message reliable");
            // console.log({ reliable: data.toString() })
            this.broadcast_reliable(data, socketid);
            if (this.recieveReliable)
                this.recieveReliable(data);
        };
        var dcUnreliable = peer.createDataChannel("unreliable", { ordered: false, maxRetransmits: 0 });
        dcUnreliable.onopen = (e) => {
            console.log("data channel unreliable is open!");
        };
        dcUnreliable.onmessage = (e) => {
            var data = e.data;
            // dcUnreliable.send(e
            // console.log({ data });
            // dcUnreliable.send({ type: "latency", });
            // this.broadcast_unreliable(data, socketid);
            if (this.recieveUnreliable)
                this.recieveUnreliable(data);
        };
        this.peers[socketid] = {
            rtc: peer,
            dcReliable,
            dcUnreliable
        };
    }
    broadcast_unreliable(data, socketid) {
        for (var key in this.peers) {
            if (key == socketid && socketid != "-1")
                continue;
            var peer = this.peers[key];
            if (peer.dcUnreliable.readyState == "open")
                peer.dcUnreliable.send(data.toString());
        }
    }
    ;
    broadcast_reliable(data, socketid) {
        for (var key in this.peers) {
            if (key == socketid && socketid != "-1")
                continue;
            var peer = this.peers[key];
            if (peer.dcReliable.readyState == "open") {
                console.log("broadcast to client " + key);
                console.log(data.toString());
                peer.dcReliable.send(data.toString());
            }
            else {
                console.log("failed to send because state is: " + peer.dcReliable.readyState);
            }
        }
    }
}
exports.default = WebRTCServer;
