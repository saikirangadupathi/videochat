const app = require('express')();
const server = require('http').createServer(app);
const cors = require('cors');

const io = require('socket.io')(server, {
    cors: {
        origin: '*',
        method: ['GET', 'POST']
    }
});

app.use(cors());

app.get('/', (req, res) => {
    res.send('Welcome to HomePage');
});

io.on('connection', (socket) => {

    socket.emit('me', socket.id);
    // console.log(socket.id);

    socket.on('disconnect', (socket) => {
        console.log(socket);
    });

    socket.on('calluser', ({ userToCall, signalData, from, name }) => {
        io.to(userToCall).emit('calluser', { signal: signalData, from, name })
    });

    socket.on('answercall', (data) => {
        io.to(data.to).emit('callaccepted', data.signal);
    });
    
    // messaging: forward messages to a specific recipient or broadcast
    socket.on('sendMessage', (data) => {
        // data: { id, to, message, from, name, createdAt }
        const senderSocketId = socket.id;
        const recipientId = data && data.to ? data.to : null;
        console.log('[sendMessage] from', senderSocketId, 'to', recipientId, 'id', data && data.id);
        try {
            if (recipientId) {
                // strict one-to-one: forward only to recipient and echo to sender
                io.to(recipientId).emit('receiveMessage', { ...data, from: senderSocketId });
                io.to(senderSocketId).emit('receiveMessage', { ...data, from: senderSocketId });
                io.to(senderSocketId).emit('messageDelivered', { id: data.id, to: recipientId, status: 'delivered' });
                console.log('[sendMessage] delivered to', recipientId, 'and echoed to', senderSocketId);
            } else {
                // fallback: broadcast to all except sender
                socket.broadcast.emit('receiveMessage', { ...data, from: senderSocketId });
                io.to(senderSocketId).emit('messageDelivered', { id: data.id, to: null, status: 'broadcasted' });
                console.log('[sendMessage] broadcasted from', senderSocketId);
            }
        } catch (err) {
            console.error('[sendMessage] Error forwarding message', err);
            try { io.to(senderSocketId).emit('messageDelivered', { id: data && data.id, to: recipientId, status: 'error', error: String(err) }); } catch(e){}
        }
    });

    // forward connect request so the target can set currentPeer
    socket.on('connectRequest', (data) => {
        // data: { to, from, name }
        console.log('connectRequest from', data.from, 'to', data.to);
        try {
            if (data.to) {
                // Check if the target socket ID is currently connected
                const targetSocket = io.sockets.sockets.get(data.to);
                if (targetSocket) {
                    io.to(data.to).emit('connectRequest', { from: data.from, name: data.name });
                    io.to(data.from).emit('connectAck', { to: data.to, status: 'sent' });
                    console.log('[connectRequest] forwarded to', data.to);
                } else {
                    // target not connected
                    io.to(data.from).emit('connectAck', { to: data.to, status: 'not-found' });
                    console.log('[connectRequest] target not found:', data.to);
                }
            }
        } catch (err) {
            console.error('connectRequest error', err);
            io.to(data.from).emit('connectAck', { to: data.to, status: 'error', error: String(err) });
        }
    });

    // message read receipt
    socket.on('messageRead', (data) => {
        // data: { id, from, to }
        console.log('[messageRead] from', data.from, 'for', data.id, 'to', data.to);
        try {
            if (data.to) {
                io.to(data.to).emit('messageRead', data);
                console.log('[messageRead] forwarded to', data.to);
            }
        } catch (err) {
            console.error('[messageRead] error', err);
        }
    });
});

const port = process.env.PORT || 5050;
server.listen(port, () => {
    console.log(`Server is running at: http://localhost:${port}/`)
})
