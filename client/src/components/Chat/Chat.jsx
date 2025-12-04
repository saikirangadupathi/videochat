import React, { useContext, useState, useRef, useEffect } from 'react';
import { SocketContext } from '../../SocketContext';
import { IconButton, InputBase } from '@mui/material';
import { Send, AttachFile } from '@mui/icons-material';
import './Chat.css';

const Chat = () => {
  const { messages, sendMessage, sendFile, me, currentPeer, lastSent, lastReceived, markMessageRead } = useContext(SocketContext);
  const [text, setText] = useState('');
  const [toId, setToId] = useState(currentPeer || '');
  const listRef = useRef();

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const target = toId && toId.length ? toId : null;
    sendMessage(text.trim(), target);
    setText('');
  }

  const fileInputRef = useRef();
  const handleAttach = () => fileInputRef.current && fileInputRef.current.click();
  const handleFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) {
      const target = toId && toId.length ? toId : null;
      sendFile(f, target);
    }
    // reset input
    e.target.value = '';
  }

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);
  
  // auto-fill recipient input when currentPeer changes
  useEffect(() => {
    if (currentPeer) setToId(currentPeer);
  }, [currentPeer]);

  // mark incoming messages as read when they appear
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    messages.forEach(m => {
      if (!m.fromMe && m.status !== 'read') {
        // mark read locally and notify sender
        try { markMessageRead(m.id); } catch (e) { console.error(e); }
      }
    });
  }, [messages]);

  return (
    <div className="chatContainer">
      <div className="chatHeader">Messages</div>

      <div className="chatToolbar">
        <input value={toId} onChange={(e) => setToId(e.target.value)} placeholder={currentPeer ? `Peer id: ${currentPeer}` : 'Recipient id (optional)'} className="peerInput" />
        <div className="yourId">{me ? `Your id: ${me}` : 'Your id: ...'}</div>
      </div>

      <div className="chatInfo">
        <div>Connected: <strong className="accent">{currentPeer || '—'}</strong></div>
        <div>LastSent: <strong>{lastSent ? `${lastSent.msg.to || 'broadcast'} @ ${new Date(lastSent.time).toLocaleTimeString()}` : '—'}</strong></div>
        <div>LastRecv: <strong>{lastReceived ? `${lastReceived.data.from} @ ${new Date(lastReceived.time).toLocaleTimeString()}` : '—'}</strong></div>
      </div>

      <div className="messagesList" ref={listRef}>
        {messages && messages.map((m, idx) => (
          <div key={m.id || idx} className={`msgRow ${m.fromMe ? 'me' : 'them'}`}>
            <div className="avatar">{m.name ? m.name.charAt(0).toUpperCase() : (m.from ? m.from.charAt(0) : '?')}</div>
            <div className="msgBubble">
              {m.fileUrl ? (
                m.fileType && m.fileType.startsWith('image/') ? (
                  <img src={m.fileUrl} alt={m.fileName} className="msgFile" />
                ) : (
                  <a href={m.fileUrl} download={m.fileName} className="fileLink">{m.fileName}</a>
                )
              ) : (
                <div className="msgText">{m.text}</div>
              )}
              <div className="msgMeta">
                <span className="metaLeft">{m.name || (m.from === me ? 'You' : m.name)}</span>
                <span className="metaRight">{new Date(m.createdAt).toLocaleTimeString()}
                  {m.fromMe && (
                    <span className={`ticks ${m.status === 'read' ? 'read' : m.status === 'delivered' ? 'delivered' : 'sent'}`}>
                      {m.status === 'read' ? '✓✓' : m.status === 'delivered' ? '✓✓' : '✓'}
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <form className="chatInput" onSubmit={handleSend}>
        <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFile} />
        <IconButton onClick={handleAttach} size="large">
          <AttachFile />
        </IconButton>
        <InputBase
          placeholder="Type a message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          fullWidth
          className="chatTextInput"
        />
        <IconButton type="submit" color="primary">
          <Send />
        </IconButton>
      </form>
    </div>
  )
}

export default Chat;
