import { Socket } from "socket.io-client";
const { RTCPeerConnection } = require("wrtc");


class WebRTCServer {
    public peers: {
        [socketid: string]: { rtc: RTCPeerConnection, dcUnreliable: RTCDataChannel, dcReliable: RTCDataChannel },
    }
    private ws: Socket;
    constructor(ws_socket: Socket) {
        ws_socket.on("joinpeer", (socketid: string) => {
            this.onJoinPeer(socketid);
        });
        ws_socket.on("icecandidate", ({ candidate, socketid }) => {
            console.log("recieve ice candidate from clients");
            if (!candidate) return;
            // console.log({ candidate })
            console.log({ rtc: this.peers[socketid].rtc })
            this.peers[socketid].rtc.addIceCandidate(candidate).then(e => {
                console.log("success add candidate")
            }).catch((e) => {
                console.log("failed add ice candidate");
            });
        })
        ws_socket.on("answer", ({ sdp, socketid }) => {
            console.log("recieve answer.");
            this.peers[socketid].rtc.setRemoteDescription(sdp);
            // console.log({ peers: this.peers[socketid] });
        });
        this.ws = ws_socket;
        this.peers = {}
    }
    private onJoinPeer(socketid: string) {
        if (this.peers[socketid]) {
            return; //sudah ada
        }
        console.log("peer joined with: " + socketid);
        console.log("my socket id is: " + this.ws.id);
        var args = process.argv.slice(2);

        args.forEach(function (val, index, array) {
            console.log(index + ': ' + val);
        });
        var domain_turn = "skripsi.orbitskomputer.com"
        if (args.length != 0)
            domain_turn = args[0] == "SGP" ? "skripsi.orbitskomputer.com" : "skripsi-japan.orbitskomputer.com"
        console.log({ domain_turn })
        const peer: RTCPeerConnection = new RTCPeerConnection({
            iceServers:
                [{ urls: `turn:${domain_turn}:3478`, username: "guest", credential: "welost123", user: "guest" },
                { urls: "stun:stun.l.google.com:19302" }
                ]
        });
        peer.onicecandidateerror = (e) => {
            // console.log({e})
            // console.log("error ice candidate!");
        }
        peer.onicecandidate = ({ candidate }) => {
            console.log("sending ice candidate to client")
            this.ws.emit("icecandidate", ({ socketid: socketid, candidate, sdpindex: 0, sdpmid: 0 }))
        }
        peer.onnegotiationneeded = async () => {
            console.log("negotiation needed!");
            var offer_desc = await peer.createOffer()
            await peer.setLocalDescription(offer_desc);
            console.log("sending offer!!");
            this.ws.emit("offer", { sdp: peer.localDescription, type: 0, socketid }); //broadcast to others except me
        }
        const ref = this;
        var dcReliable = peer.createDataChannel("reliable", { ordered: false, maxRetransmits: 0 });
        dcReliable.onopen = (e) => {
            console.log("data channel Reliable is open!, starting broadcasting...");
            // setInterval(() => {
            //     ref.broadcast_reliable(Buffer.from("test", "utf-8"), "-1");

            // },1/30)

        }
        dcReliable.onerror = (e) => {
            console.log("dc reliable error");
        }

        dcReliable.onclose = () => {
            console.log("dc reliable is closed!");
        }
        dcReliable.onmessage = (e) => {
            console.log("recieve msg from client via reliable data channel:");

            var data = e.data;
            console.log(data.toString());
            // console.log("recieve message reliable");
            // console.log({ reliable: data.toString() })
            this.broadcast_reliable(data, socketid);
            if (this.recieveReliable)
                this.recieveReliable(data);
        }

        var dcUnreliable = peer.createDataChannel("unreliable", { ordered: false, maxRetransmits: 0 });
        dcUnreliable.onopen = (e) => {
            console.log("data channel unreliable is open!");

        }
        dcUnreliable.onmessage = (e) => {
            var data = e.data;
            // dcUnreliable.send(e
            // console.log({ data });
            // dcUnreliable.send({ type: "latency", });
            var jsonData = JSON.parse(data);
            if (jsonData.to == "all") {
                this.broadcast_unreliable(data, socketid);
                // return;
            }
            if (this.recieveUnreliable)
                this.recieveUnreliable(data);

        }

        this.peers[socketid] = {
            rtc: peer,
            dcReliable,
            dcUnreliable
        }
    }
    public async broadcast_unreliable(data: Buffer, socketid: string) {
        for (var key in this.peers) {
            if (key == socketid && socketid != "-1") continue;
            var peer = this.peers[key];
            if (peer.dcUnreliable.readyState == "open") {

                peer.dcUnreliable.send(data.toString());
                // await peer.dcUnreliable._RTCDataChannel__transport._data_channel_flush()
                // await peer.dcUnreliable._RTCDataChannel__transport._transmit()
            }
        }
    };
    public broadcast_reliable(data: Buffer, socketid: string) {
        for (var key in this.peers) {
            if (key == socketid && socketid != "-1") continue;
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
    public recieveReliable?: (data: Buffer) => void;
    public recieveUnreliable?: (data: Buffer) => void;

}

export default WebRTCServer;