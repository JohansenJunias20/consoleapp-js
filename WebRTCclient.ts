import { Socket } from "socket.io-client";
const { RTCPeerConnection } = require("wrtc");


class WebRTCClient {
    public server: {
        peer: RTCPeerConnection,
        socketid?: string,
        dcUnreliable?: RTCDataChannel,
        dcReliable?: RTCDataChannel
    }
    private ws: Socket;
    constructor(ws_socket: Socket) {
        ws_socket.on("joinpeer", (socketid: string) => {
            this.onJoinPeer(socketid);
        });
        this.ws = ws_socket;



        this.ws.on("get:master_csharp", (socketid_server) => {
            this.server.socketid = socketid_server;
            this.startConnect();
        })

        const peer: RTCPeerConnection = new RTCPeerConnection({
            iceServers:
                [{ urls: "turn:skripsi.orbitskomputer.com:3478", username: "guest", credential: "welost123", user: "guest" },
                { urls: "stun:stun.l.google.com:19302" }
                ]
        });
        // peer.startConnect
        const ref = this;
        peer.ondatachannel = (e) => {
            // e.channel.

            if (e.channel.label == "unreliable") {
                ref.server.dcUnreliable = e.channel;
                e.channel.onopen = (_) => {
                    // e.
                    // setInterval(()=>{
                    //     e.channel.send(Buffer.from("hello","utf-8"));
                    // },2000);
                    console.log("data channel unreliable is open!");
                }
                e.channel.onmessage = (e) => {

                    if (ref.onRecieveUnreliable) {
                        // console.log("recieve msg from server via UNRELIABLE data channel:");
                        ref.onRecieveUnreliable(e.data);
                    }

                }
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
                    }
                }

            }
        }
        this.ws.on("offer", async (data) => {
            console.log("recieve offer!");
            peer.setRemoteDescription(data.sdp);
            var answer = await peer.createAnswer()
            peer.setLocalDescription(answer);
            console.log("answering..");
            this.ws.emit("answer", ({ sdp: peer.localDescription, type: 0, socketid: this.server.socketid }));
        })

        this.ws.on("icecandidate", ({ candidate }) => {
            console.log("recieve ice candidate from server!");
            // console.log({ candidate })
            if (!candidate) return;
            peer.addIceCandidate(candidate).then(e => {
                console.log("success add candidate")
            }).catch((e) => {
                console.log("failed add ice candidate");
            });;
        })


        peer.onicecandidate = ({ candidate }) => {
            console.log("sending.. ice candidate");
            this.ws.emit("icecandidate", ({ socketid: this.server.socketid, candidate, sdpindex: 0, sdpmid: 0 }))
        }



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
        }
        // this.peers[socketid] = peer;
        this.ws.emit("get:master_csharp", "");

    }
    public onRecieveReliable?: (data: Buffer) => void;
    public onRecieveUnreliable?: (data: Buffer) => void;
    private startConnect() {
        // throw new Error("Method not implemented.");
        // this.server.peer.onicecandidate = (candidate) => {
        //     this.ws.emit("icecandidate", ({ socketid: this.server.socketid, candidate, sdpmid: 0, sdpindex: 0 }));
        // }
        this.ws.emit("joinpeer", "");
    }
    private onJoinPeer(socketid: string) {
        // if (this.peers[socketid]) {
        //     return; //sudah ada
        // }
    }
    public sendUnreliable(data: Buffer) {
        if (this.server.dcUnreliable) {
            // var rData = { timestamp: Date.now(), data };
            // console.log("send unreliable to server");
            this.server.dcUnreliable.send(data.toString());
        }
        else {
            console.log("dcUnReliable not available")
        }
    }
    public sendReliable(data: Buffer) {
        if (this.server.dcReliable) {
            this.server.dcReliable.send(data.toString());
        }
        else {
            console.log("dcReliable not available")
        }
    }

}
export default WebRTCClient;