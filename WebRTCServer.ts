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
            console.log({ candidate })
            this.peers[socketid].rtc.addIceCandidate(candidate);
        })
        ws_socket.on("answer", ({ sdp, socketid }) => {
            console.log("recieve answer.");
            this.peers[socketid].rtc.setRemoteDescription(sdp);
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
        
        const peer: RTCPeerConnection = new RTCPeerConnection({
            iceServers:
                [{ urls: "turn:skripsi.orbitskomputer.com:3478", username: "guest", credential: "welost123", user:"guest"},
                { urls: "stun:stun.l.google.com:19302" }
                ]
        });
        peer.onicecandidateerror = (e)=>{
            console.log("error ice candidate!");
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
            this.broadcast_unreliable(data, socketid);

            if (this.recieveUnreliable)
                this.recieveUnreliable(data);

        }

        this.peers[socketid] = {
            rtc: peer,
            dcReliable,
            dcUnreliable
        }
    }
    public broadcast_unreliable(data: Buffer, socketid: string) {
        for (var key in this.peers) {
            if (key == socketid && socketid != "-1") continue;
            var peer = this.peers[key];
            if (peer.dcUnreliable.readyState == "open")
                peer.dcUnreliable.send(data.toString());
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