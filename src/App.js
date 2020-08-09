import React, {Component} from 'react';
import OTChat from './components/OTChat';
import TFBodyPix from './components/TFBodyPix';

class App extends Component {

  constructor(props){
    super(props)
    this.state = {
        videoSource: null
    }
  }

  setVideoSource = (videoSource) => {
    this.setState({ videoSource });
  }

  render() {
    return (
      <div className="App">

        <TFBodyPix videoSourced={this.setVideoSource}/>

        <OTChat credentials = {this.props.credentials} 
                videoSource = {this.state.videoSource} 
                changedMediaSource = {this.setUserMediaSource}/>

      </div>
    );
  }
}

export default App;

