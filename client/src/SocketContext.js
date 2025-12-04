import React, { createContext, useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import Peer from 'simple-peer';

const SocketContext = createContext();

const socket = io('http://localhost:5050/');

const ContextProvider = ({ children }) => {

    const [stream, setStream] = useState(null);
    const [facingMode, setFacingMode] = useState('user');
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoMuted, setIsVideoMuted] = useState(false);
    const [me, setMe] = useState('');
    const [messages, setMessages] = useState([]);
    const [currentPeer, setCurrentPeer] = useState(null);
    const [lastSent, setLastSent] = useState(null);
    const [lastReceived, setLastReceived] = useState(null);
    const [toast, setToast] = useState(null);
    const [call, setCall] = useState({});
    const [callAccepted, setCallAccepted] = useState(false);
    const [callEnded, setCallEnded] = useState(false);
    const [Name, setName] = useState('');
    const myVideo = useRef();
    const userVideo = useRef();
    const connectionRef = useRef();

    useEffect(() => {
        const startStream = async () => {
            try {
                const currentStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: facingMode },
                    audio: true
                });
                setStream(currentStream);
                if (myVideo.current) myVideo.current.srcObject = currentStream;
            } catch (err) {
                // fallback to default camera
                const currentStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setStream(currentStream);
                if (myVideo.current) myVideo.current.srcObject = currentStream;
            }
        };

        startStream();

        socket.on('me', (id) => setMe(id));

        socket.on('calluser', ({ from, name: callerName, signal }) => {
            setCall({ isReceivedCall: true, from, name: callerName, signal });
            setCurrentPeer(from);
        });

        socket.on('receiveMessage', (data) => {
            // data: { to, message, from, name, createdAt }
            try {
                const senderId = data.from;
                // consider message from me if senderId equals my id
                // Use socket.id to determine if message originated from this client (avoids stale closure on `me`)
                const isFromMe = (senderId === socket.id);
                const incomingBase = {
                    id: data.id,
                    from: senderId,
                    name: data.name,
                    createdAt: data.createdAt || Date.now(),
                    fromMe: isFromMe
                };
                let incoming;
                if (data.message && typeof data.message === 'object' && data.message.type === 'file') {
                    incoming = {
                        ...incomingBase,
                        fileName: data.message.name,
                        fileType: data.message.mime,
                        fileUrl: data.message.dataUrl,
                        status: isFromMe ? 'read' : 'delivered'
                    };
                } else {
                    incoming = {
                        ...incomingBase,
                        text: (typeof data.message === 'string') ? data.message : String(data.message),
                        status: isFromMe ? 'read' : 'delivered'
                    };
                }
                console.log('receiveMessage handler:', data, 'computed fromMe=', isFromMe, 'local me=', me, 'socket.id=', socket.id);
                // show a small toast for incoming messages (not from me)
                if (!isFromMe) {
                    try {
                        setToast({ text: `${incoming.name || incoming.from}: ${incoming.text ? (incoming.text.length>60?incoming.text.slice(0,57)+'...':incoming.text) : (incoming.fileName||'file')}` });
                        setTimeout(()=>setToast(null), 2200);
                    } catch(e){}
                }
                setMessages(prev => {
                    // if message with same id exists, update it (upgrade status) instead of ignoring
                    if (incoming.id && prev.some(m => m.id === incoming.id)) {
                        // helper to choose higher-status
                        const rank = (s) => s === 'read' ? 3 : s === 'delivered' ? 2 : s === 'sent' ? 1 : 0;
                        return prev.map(m => {
                            if (m.id !== incoming.id) return m;
                            const existingStatus = m.status || 'sent';
                            const incomingStatus = incoming.status || existingStatus;
                            const chosenStatus = rank(incomingStatus) > rank(existingStatus) ? incomingStatus : existingStatus;
                            return { ...m, ...incoming, status: chosenStatus };
                        });
                    }
                    return [...prev, incoming];
                });
                setLastReceived({ data, time: Date.now() });
            } catch (err) {
                console.error('Error processing receiveMessage', err, data);
            }
        });

        socket.on('messageDelivered', (info) => {
            console.log('messageDelivered ack:', info);
            try {
                if (info && info.id) {
                    setMessages(prev => prev.map(m => m.id === info.id ? { ...m, status: 'delivered' } : m));
                }
            } catch (e) {
                console.error('Error handling messageDelivered', e, info);
            }
        });

        socket.on('messageRead', (info) => {
            console.log('messageRead received:', info);
            try {
                if (info && info.id) {
                    setMessages(prev => prev.map(m => m.id === info.id ? { ...m, status: 'read' } : m));
                }
            } catch (e) {
                console.error('Error handling messageRead', e, info);
            }
        });
        
        socket.on('connectRequest', (data) => {
            // other peer wants to connect to us; set them as current peer
            try {
                console.log('connectRequest received from', data.from, data.name);
                setCurrentPeer(data.from);
                // auto-accept and show toast
                try { setToast({ text: `Connected to ${data.name || data.from}` }); setTimeout(()=>setToast(null),2500); } catch(e){}
            } catch (err) {
                console.error('connectRequest handler error', err, data);
            }
        });

        socket.on('connectAck', (info) => {
            console.log('connectAck:', info);
            try {
                if (!info) return;
                if (info.status === 'sent' && info.to) {
                    // connection succeed
                    setCurrentPeer(info.to);
                    setToast({ text: `Connected: ${info.to}` }); setTimeout(()=>setToast(null),2000);
                } else if (info.status === 'not-found') {
                    // target not connected
                    setToast({ text: `Connect failed: target ${info.to} not online` }); setTimeout(()=>setToast(null),3000);
                } else if (info.status === 'error') {
                    setToast({ text: `Connect error: ${info.error || 'unknown'}` }); setTimeout(()=>setToast(null),3000);
                } else {
                    // generic fallback
                    if (info.to) { setCurrentPeer(info.to); setToast({ text: `Connect acknowledged: ${info.to}` }); setTimeout(()=>setToast(null),2000); }
                }
            } catch(e) { console.error('connectAck handler error', e, info); }
        });
    }, []);


    useEffect(() => {
        // cleanup on unmount
        return () => {
            socket.off('receiveMessage');
            socket.off('messageDelivered');
            socket.off('messageRead');
        }
    }, []);

    const flipCamera = async () => {
        try {
            const newFacing = facingMode === 'user' ? 'environment' : 'user';
            // try to get media with the requested facingMode
            let newStream;
            try {
                newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: newFacing } }, audio: true });
            } catch (e) {
                // some browsers don't support exact; try without exact
                try {
                    newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: newFacing }, audio: true });
                } catch (err) {
                    // fallback to default
                    newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                }
            }

            const prevStream = stream;
            // Preserve mute states on the new stream
            if (isAudioMuted) newStream.getAudioTracks().forEach(t => t.enabled = false);
            if (isVideoMuted) newStream.getVideoTracks().forEach(t => t.enabled = false);

            setStream(newStream);
            setFacingMode(newFacing);
            if (myVideo.current) myVideo.current.srcObject = newStream;

            // Replace outgoing video track for existing peer connection
            if (connectionRef.current && connectionRef.current._pc) {
                const pc = connectionRef.current._pc;
                const senders = pc.getSenders();
                const newVideoTrack = newStream.getVideoTracks()[0];
                const sender = senders.find(s => s.track && s.track.kind === 'video');
                if (sender && newVideoTrack) {
                    // replaceTrack is supported on RTCRtpSender
                    sender.replaceTrack(newVideoTrack);
                }
            }

            // Stop previous tracks to free camera
            if (prevStream) {
                prevStream.getTracks().forEach(t => t.stop());
            }
        } catch (err) {
            console.error('Failed to flip camera', err);
        }
    }

    const toggleAudio = () => {
        if (!stream) return;
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length) {
            const enabled = audioTracks[0].enabled;
            audioTracks.forEach(t => t.enabled = !enabled);
            setIsAudioMuted(!enabled);
        }
    }

    const toggleVideo = () => {
        if (!stream) return;
        const videoTracks = stream.getVideoTracks();
        if (videoTracks.length) {
            const enabled = videoTracks[0].enabled;
            videoTracks.forEach(t => t.enabled = !enabled);
            setIsVideoMuted(!enabled);
        }
    }

    // console.log(me);

    const answerCall = () => {
        setCallAccepted(true);

        const peer = new Peer({ initiator: false, trickle: false, stream: stream });

        peer.on('signal', (data) => {
            socket.emit('answercall', { signal: data, to: call.from });
        });

        peer.on('stream', (currentStream) => {
            if (userVideo.current) userVideo.current.srcObject = currentStream;
        });

        peer.signal(call.signal);

        connectionRef.current = peer;
    }

    const callUser = (id) => {
        const peer = new Peer({ initiator: true, trickle: false, stream: stream });

        peer.on('signal', (data) => {
            socket.emit('calluser', { userToCall: id, signalData: data, from: me, name: Name });
        });

        peer.on('stream', (currentStream) => {
            if (userVideo.current) userVideo.current.srcObject = currentStream;
        });

        socket.on('callaccepted', (signal) => {
            setCallAccepted(true);
            peer.signal(signal);
        });

        connectionRef.current = peer;
        setCurrentPeer(id);
    }

    const sendMessage = (text, toOverride = null) => {
        if (!text) return;
        const target = toOverride || currentPeer || null;
        const msg = {
            id: `${Date.now()}-${Math.floor(Math.random()*100000)}`,
            to: target,
            message: text,
            from: me,
            name: Name,
            createdAt: Date.now()
        };
        console.log('sendMessage emit:', msg);
        socket.emit('sendMessage', msg);
        setLastSent({ msg, time: Date.now() });
        setMessages(prev => [...prev, { id: msg.id, from: me, name: Name, text, createdAt: msg.createdAt, fromMe: true, status: 'sent' }]);
    }

    const sendFile = (file, toOverride = null) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result;
            const target = toOverride || currentPeer || null;
            const msg = {
                id: `${Date.now()}-${Math.floor(Math.random()*100000)}`,
                to: target,
                message: {
                    type: 'file',
                    name: file.name,
                    mime: file.type,
                    dataUrl
                },
                from: me,
                name: Name,
                createdAt: Date.now()
            };
            console.log('sendFile emit:', msg);
            socket.emit('sendMessage', msg);
            setLastSent({ msg, time: Date.now() });

            // add to local messages as file (initial status 'sent')
            setMessages(prev => [...prev, { id: msg.id, from: me, name: Name, fileName: file.name, fileType: file.type, fileUrl: dataUrl, createdAt: msg.createdAt, fromMe: true, status: 'sent' }]);
        };
        reader.readAsDataURL(file);
    }

    const connectTo = (id) => {
        if (!id) return;
        try {
            setCurrentPeer(id);
            socket.emit('connectRequest', { to: id, from: me, name: Name });
            console.log('connectTo emitted to', id);
            setToast({ text: `Connect request sent to ${id}` }); setTimeout(()=>setToast(null),2500);
        } catch (err) {
            console.error('connectTo error', err);
        }
    }

    const markMessageRead = (id) => {
        if (!id) return;
        const msg = messages.find(m => m.id === id);
        if (!msg) return;
        try {
            socket.emit('messageRead', { id, from: me, to: msg.from });
            setMessages(prev => prev.map(m => m.id === id ? { ...m, status: 'read' } : m));
        } catch (err) {
            console.error('markMessageRead error', err);
        }
    }

    const leaveCall = () => {
        // end the WebRTC call but keep the socket connection so chat still works
        try {
            if (connectionRef.current) {
                connectionRef.current.destroy();
                connectionRef.current = null;
            }
        } catch (err) {
            console.warn('leaveCall: error destroying peer', err);
        }

        // update call state so UI can reflect hangup
        setCallAccepted(false);
        setCallEnded(true);
        setCall({});

        // stop any remote video stream element if present
        try {
            if (userVideo.current && userVideo.current.srcObject) {
                userVideo.current.srcObject.getTracks().forEach(t => t.stop());
                userVideo.current.srcObject = null;
            }
        } catch (e) { /* ignore */ }

        // Note: do NOT reload the page here. Reloading disconnects the socket,
        // which prevents further messaging. Keeping the socket connection lets
        // users continue to exchange chat messages after hanging up.
    }

    return (
        <SocketContext.Provider value={{ call, callAccepted, callEnded, stream, myVideo, userVideo, Name, setName, me, callUser, leaveCall, answerCall, flipCamera, facingMode, toggleAudio, toggleVideo, isAudioMuted, isVideoMuted, messages, sendMessage, sendFile, currentPeer, setCurrentPeer, connectTo, lastSent, lastReceived, markMessageRead, toast }}>
            {children}
        </SocketContext.Provider>
    );
}

export { ContextProvider, SocketContext };










