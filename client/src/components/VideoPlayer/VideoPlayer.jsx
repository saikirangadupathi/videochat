import React, { useContext } from 'react';
import { Grid, Paper, Typography, IconButton } from '@mui/material';
import { PhoneDisabled, Videocam, Mic, CameraAlt, MicOff, VideocamOff } from '@mui/icons-material';
import { SocketContext } from '../../SocketContext';
import './VideoPlayer.css';

const VideoPlayer = () => {
    const { call, callAccepted, callEnded, stream, myVideo, userVideo, Name, leaveCall, toggleAudio, toggleVideo, isAudioMuted, isVideoMuted, flipCamera } = useContext(SocketContext);

    // When in a call show full call UI similar to WhatsApp
    if (callAccepted && !callEnded) {
        return (
            <div className="callContainer">
                <video playsInline ref={userVideo} autoPlay muted={false} className="remoteVideo" />

                {/* small local thumbnail */}
                {stream && (
                    <div className="localThumb">
                        <video playsInline muted ref={myVideo} autoPlay className="localVideo" />
                    </div>
                )}

                {/* bottom controls */}
                <div className="callControls">
                    <IconButton className={`ctrlBtn ${isAudioMuted ? 'active' : ''}`} onClick={toggleAudio} title={isAudioMuted ? 'Unmute' : 'Mute'}>
                        {isAudioMuted ? <MicOff style={{ color: '#fff' }} /> : <Mic style={{ color: '#fff' }} />}
                    </IconButton>

                    <IconButton className={`ctrlBtn ${isVideoMuted ? 'active' : ''}`} onClick={toggleVideo} title={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}>
                        {isVideoMuted ? <VideocamOff style={{ color: '#fff' }} /> : <Videocam style={{ color: '#fff' }} />}
                    </IconButton>

                    <IconButton className="hangupBtn" onClick={leaveCall} title="End Call">
                        <PhoneDisabled style={{ color: '#fff' }} />
                    </IconButton>

                    <IconButton className="ctrlBtn" onClick={flipCamera} title="Switch Camera">
                        <CameraAlt style={{ color: '#fff' }} />
                    </IconButton>
                </div>
            </div>
        )
    }

    // Default non-call layout: show small preview cards
    return (
        <Grid container className='gridContainer'>
            {/* OWN Video */}
            {stream && (
                <Paper className='paper'>
                    <Grid item xs={12} md={6}>
                        <Typography variant='h5' gutterBottom className='videoTitle'> {Name || 'Name'} </Typography>
                        <video playsInline muted ref={myVideo} autoPlay className='video' />
                    </Grid>
                </Paper>
            )}

            {/* Users Video */}
            {callAccepted && !callEnded && (
                <Paper className='paper'>
                    <Grid item xs={12} md={6}>
                        <Typography variant='h5' gutterBottom className='videoTitle'> {call.name || 'Name'} </Typography>
                        <video playsInline ref={userVideo} autoPlay className='video' />
                    </Grid>
                </Paper>
            )}
        </Grid>
    )
}

export default VideoPlayer;