import React, { useContext } from 'react';
import { Button } from '@mui/material';
import './Notification.css';

import { SocketContext } from '../../SocketContext';

const Notification = () => {

  const { answerCall, call, callAccepted } = useContext(SocketContext);

  // console.log(call);

  return (
    <>
      {
        call.isReceivedCall && !callAccepted && (
          <div className='notificationContainer'>
            <div className='notification'>
              <span style={{ fontWeight: 600 }}>{call.name}</span>
              <span>is calling</span>
              <Button variant='contained' color='primary' onClick={answerCall} style={{ marginLeft: 8 }}>
                Answer
              </Button>
            </div>
          </div>
        )
      }
    </>
  )
}

export default Notification;