import { AppBar, Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';
import './App.css';
import VideoPlayer from './components/VideoPlayer/VideoPlayer';
import Options from './components/Options/Options';
import Notification from './components/Notification/Notification';
import Chat from './components/Chat/Chat';
import React, { useContext } from 'react';
import { SocketContext } from './SocketContext';

// const useStyles = makeStyles((theme) => ({
//   appBar: {
//     // [theme.breakpoints.down('xs')]: {
//     //   width: '90%',
//     // },
//   },

//   image: {
//     marginLeft: '15px',
//   },
// }));

function App() {
  // const classes = useStyles();

  return (
    <div className='wrapper'>
      <AppBar className='appBar' position='static' color='inherit'>
        <Typography variant='h6' align='left' className='brand'>
          Video Call App
        </Typography>
      </AppBar>

      <div className='appMain'>
        <aside className='sidebar'>
          <Options />
        </aside>

        <main className='centerPanel'>
          <div className='callCard'>
            <VideoPlayer />
          </div>

          <div className='chatCard'>
            <Notification />
            <Chat />
          </div>
        </main>
        </div>

        {/* small toast from socket context */}
        <Toast />
      </div>
    );
  }

  function Toast() {
    const { toast } = useContext(SocketContext);
    if (!toast) return null;
    return (
      <div style={{ position: 'fixed', right: 18, bottom: 22, background: 'rgba(0,0,0,0.8)', color: '#fff', padding: '10px 14px', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.2)', zIndex: 1200 }}>
        {toast.text}
      </div>
    );
  }

  function DebugPanel() {
    const { me, currentPeer, lastSent, lastReceived, messages } = useContext(SocketContext);
    return (
      <div style={{ position: 'fixed', left: 18, bottom: 22, background: 'rgba(255,255,255,0.96)', color: '#222', padding: '10px 12px', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.12)', zIndex: 1200, maxWidth: 360, fontSize: 13 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Debug</div>
        <div><strong>me:</strong> {me || '—'}</div>
        <div><strong>currentPeer:</strong> {currentPeer || '—'}</div>
        <div><strong>lastSent:</strong> {lastSent ? `${lastSent.msg.id} → ${lastSent.msg.to || 'broadcast'}` : '—'}</div>
        <div><strong>lastRecv:</strong> {lastReceived ? `${lastReceived.data.id || '—'} from ${lastReceived.data.from}` : '—'}</div>
        <div style={{ marginTop: 6 }}><strong>messages:</strong> {messages ? messages.length : 0}</div>
        <div style={{ maxHeight: 140, overflowY: 'auto', marginTop: 6 }}>
          {messages && messages.slice(-6).reverse().map(m => (
            <div key={m.id} style={{ padding: '6px 0', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: 12 }}><strong>{m.fromMe ? 'You' : (m.from||'peer')}</strong>: {m.text ? (m.text.length>40?m.text.slice(0,37)+'...':m.text) : (m.fileName||'file')}</div>
              <div style={{ fontSize: 11, color:'#666' }}>{m.id} • {m.status || 'sent'}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  export default App;
