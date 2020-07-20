import React, {Component} from 'react';
import { OTSession, OTPublisher, OTStreams, OTSubscriber } from 'opentok-react';
import OT from '@opentok/client'

export default class OTChat extends Component {
    constructor(props) {
      super(props);
  
      this.state = {
        error: null,
        connection: 'Connecting',
        publishVideo: true,
        videoSource: true,
        userMediaSource: null
      };
  
      this.sessionEventHandlers = {
        sessionConnected: () => {
          this.setState({ connection: 'Connected' });
        },
        sessionDisconnected: () => {
          this.setState({ connection: 'Disconnected' });
        },
        sessionReconnected: () => {
          this.setState({ connection: 'Reconnected' });
        },
        sessionReconnecting: () => {
          this.setState({ connection: 'Reconnecting' });
        },
      };
  
      this.publisherEventHandlers = {
        accessDenied: () => {
          console.log('User denied access to media source');
        },
        streamCreated: () => {
          console.log('Publisher stream created');

        },
        streamDestroyed: ({ reason }) => {
          console.log(`Publisher stream destroyed because: ${reason}`);
        },
      };
  
      this.subscriberEventHandlers = {
        videoEnabled: () => {
          console.log('Subscriber video enabled');
        },
        videoDisabled: () => {
          console.log('Subscriber video disabled');
        },
      };
    }
  
    onSessionError = error => {
      this.setState({ error });
    };
  
    onPublish = () => {
      console.log('Publish Success');
    };
  
    onPublishError = error => {
      this.setState({ error });
    };
  
    onSubscribe = () => {
      console.log('Subscribe Success');
    };
  
    onSubscribeError = error => {
      this.setState({ error });
    };
  
    toggleVideo = () => {
      this.setState(state => ({
        publishVideo: !state.publishVideo,
      }));
    };

    async getOTUserMedia(){
      this.setState({
        userMediaSource: (await OT.getUserMedia()).getVideoTracks()[0]
      })
    }

    componentDidMount(){
      this.getOTUserMedia()
    }

    async componentDidUpdate(prevProps) {

      if (this.props.videoSource !== prevProps.videoSource) {

        this.setState({
          videoSource: this.props.videoSource
        });
        
      }
    }
  
    render() {
      const { apiKey, sessionId, token } = this.props.credentials;
      const { error, connection, publishVideo } = this.state;
      return (
        <div>
          <div id="sessionStatus">Session Status: {connection}</div>
          {error ? (
            <div className="error">
              <strong>Error:</strong> {error}
            </div>
          ) : null}

            <OTSession
              apiKey={apiKey}
              sessionId={sessionId}
              token={token}
              onError={this.onSessionError}
              eventHandlers={this.sessionEventHandlers}
            >
            <button id="videoButton" onClick={this.toggleVideo}>
              {publishVideo ? 'Disable' : 'Enable'} Video
            </button>
            <OTPublisher
              properties={{ insertMode: 'append',
                            videoSource: this.state.videoSource,
                            publishVideo: this.state.publishVideo,
                            height: 500,
                            width: 500}}
              onPublish={this.onPublish}
              onError={this.onPublishError}
              eventHandlers={this.publisherEventHandlers}
            />

            <OTStreams>
              <OTSubscriber
                properties={{ width: 500, 
                              height: 500 }}
                onSubscribe={this.onSubscribe}
                onError={this.onSubscribeError}
                eventHandlers={this.subscriberEventHandlers}
              />
            </OTStreams>
          </OTSession>
        </div>
      );
    }
  }