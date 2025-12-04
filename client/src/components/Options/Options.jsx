import { Button, Container, TextField, Grid, Typography, Paper } from '@mui/material'
import React, { useState, useContext } from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { Assignment, Phone, PhoneDisabled } from '@mui/icons-material';
import { SocketContext } from '../../SocketContext';
import './Options.css';

const Options = ({ children }) => {

  const { me, callAccepted, Name, setName, callEnded, leaveCall, callUser, flipCamera, toggleAudio, toggleVideo, isAudioMuted, isVideoMuted, currentPeer, setCurrentPeer, connectTo } = useContext(SocketContext);
  const [idToCall, setIdToCall] = useState('');

  // console.log(Name);

  return (
    <Container className='container'>
      <Paper elevation={2} className='paper'>
        <div className='sidebarHeader'>
          <div className='profileCircle'>{Name ? Name.charAt(0).toUpperCase() : (me ? me.charAt(0).toUpperCase() : 'U')}</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700}}>{Name || 'Your Name'}</div>
            <div style={{fontSize:12, color:'#666'}}>{me ? `ID: ${me}` : 'Connecting...'}</div>
          </div>
        </div>

        <form className='root' noValidate autoComplete='off'>
          <div className='padding'>
            <TextField label='Name' value={Name} onChange={(e) => setName(e.target.value)} fullWidth />
            <CopyToClipboard text={me} className='margin' >
              <Button variant='contained' color='primary' fullWidth startIcon={<Assignment fontSize='large' />}>
                Copy Your ID
              </Button>
            </CopyToClipboard>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input value={idToCall} onChange={(e) => setIdToCall(e.target.value)} placeholder='Peer ID to connect/call' style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid rgba(0,0,0,0.12)' }} />
              <Button variant='contained' color='primary' onClick={() => { if (idToCall) { callUser(idToCall); } }}>Call</Button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <Button fullWidth className='btn' onClick={() => { if (idToCall) { connectTo(idToCall); } }}>
                Connect
              </Button>
            </div>

            <div style={{ marginTop: 8, fontSize: 13, color: '#075e54' }}>{currentPeer ? `Connected to: ${currentPeer}` : 'Not connected'}</div>

            {/* Audio/video toggles are only shown in the in-call UI. */}
          </div>

          <div className='padding' style={{marginTop:6}}>
            <Typography gutterBottom variant='subtitle1'> Recent Contacts </Typography>
            <div className="contactsList">
              {/* Placeholder recent contacts - click to set currentPeer */}
              <div className="contactItem" onClick={() => setCurrentPeer(me)}>
                <div className="profileCircle">{me ? me.charAt(0).toUpperCase() : 'U'}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700}}>You</div>
                  <div style={{fontSize:12,color:'#666'}}>Your ID</div>
                </div>
              </div>
              {currentPeer && (
                <div className="contactItem" onClick={() => setCurrentPeer(currentPeer)}>
                  <div className="profileCircle">{currentPeer.charAt(0).toUpperCase()}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700}}>Connected</div>
                    <div style={{fontSize:12,color:'#666'}}>{currentPeer}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="floatingCall">
              {callAccepted && !callEnded ? (
                <Button variant='contained' color='secondary' startIcon={<PhoneDisabled /> } onClick={leaveCall} className='btn'>Hang Up</Button>
              ) : (
                <Button variant='contained' color='primary' startIcon={<Phone />} onClick={() => callUser(idToCall)} className='btn'>Call</Button>
              )}
            </div>
          </div>
        </form>

      </Paper>
    </Container>
  )
}

export default Options