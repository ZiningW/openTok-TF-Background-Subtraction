import React, { Component } from 'react';
import * as bodyPix from '@tensorflow-models/body-pix'
import * as partColorScales from './part_color_scales';
import {drawKeypoints, drawSkeleton} from './demo_util';

export default class TFBodyPix extends Component {

  constructor(props) {
    super(props);
    this.state = {
      video: null,
      stream: null,
      net: null,
      videoConstraints: {},
      canvas: null,
      userMediaSource: null,
      poseTracking: false,
      partMap: false,
      prevPartMap: null,
      bodyPixEnabled: false,
      segmentType: 'blur',
      mouseX: 0,
      mouseY: 0
    };
    this.bodySegmentationFrame = this.bodySegmentationFrame.bind(this);
    // this.onMouseClick = this.onMouseClick.bind(this);
  }

// Configure Webcams
  stopExistingVideoCapture() {
    if (this.state.video && this.state.video.srcObject) {
      this.state.video.srcObject.getTracks().forEach(track => {
        track.stop();
      })
      this.setState({
        video: null
      })
    }
  }
  
  async getDeviceIdForLabel(cameraLabel) {
    const videoInputs = await this.getVideoInputs();
  
    for (let i = 0; i < videoInputs.length; i++) {
      const videoInput = videoInputs[i];
      if (videoInput.label === cameraLabel) {
        return videoInput.deviceId;
      }
    }
  
    return null;
  }
  
  async getConstraints(cameraLabel) {
    let deviceId;
    let facingMode;
  
    if (cameraLabel) {
      deviceId = await this.getDeviceIdForLabel(cameraLabel);
    };
    return {deviceId, facingMode};
  }
  
  /**
   * Loads a camera 
   *
   */
  async setupCamera(cameraLabel) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error(
          'Browser API navigator.mediaDevices.getUserMedia not available');
    }
  
    const videoElement = document.getElementById('video');
  
    this.stopExistingVideoCapture();
  
    const videoConstraints = await this.getConstraints(cameraLabel);
  
    const stream = await navigator.mediaDevices.getUserMedia(
        {'audio': false, 'video': videoConstraints});

    videoElement.srcObject = stream;
  
    return new Promise((resolve) => {
      videoElement.onloadedmetadata = () => {
        videoElement.width = videoElement.videoWidth;
        videoElement.height = videoElement.videoHeight;
        resolve(videoElement);
      };
    });
  }
  
  async loadVideo(cameraLabel) {
    try {
      this.setState({
        video: await this.setupCamera(cameraLabel)
      })
    } catch (e) {
      let info = document.getElementById('info');
      info.textContent = 'this browser does not support video capture,' +
          'or this device does not have a camera';
      info.style.display = 'block';
      throw e;
    }
  
    this.state.video.play();

  }

// Assign Parameters for TF - BodyPix

  guiState = {
    algorithm: 'multi-person-instance',
    input: {
      architecture: 'MobileNetV1',
      outputStride: 16,
      internalResolution: 'low',
      multiplier: 0.50,
      quantBytes: 2
    },
    multiPersonDecoding: {
      maxDetections: 5,
      scoreThreshold: 0.3,
      nmsRadius: 20,
      numKeypointForMatching: 17,
      refineSteps: 10
    },
    segmentation: {
      segmentationThreshold: 0.7,
      effect: 'mask',
      maskBackground: true,
      opacity: 0.9,
      backgroundBlurAmount: 9,
      maskBlurAmount: 8,
      edgeBlurAmount: 8
    },
    partMap: {
      colorScale: 'rainbow',
      effect: 'partMap',
      segmentationThreshold: 0.5,
      opacity: 0.9,
      blurBodyPartAmount: 3,
      bodyPartEdgeBlurAmount: 3,
    }
  };

  async estimateSegmentation() {
    return await this.state.net.segmentMultiPerson(this.state.video, {
      internalResolution: this.guiState.input.internalResolution,
      segmentationThreshold: this.guiState.segmentation.segmentationThreshold,
      maxDetections: this.guiState.multiPersonDecoding.maxDetections,
      scoreThreshold: this.guiState.multiPersonDecoding.scoreThreshold,
      nmsRadius: this.guiState.multiPersonDecoding.nmsRadius,
      numKeypointForMatching: this.guiState.multiPersonDecoding.numKeypointForMatching,
      refineSteps: this.guiState.multiPersonDecoding.refineSteps
    });
  }

  async estimatePartSegmentation() {

    return await this.state.net.segmentMultiPersonParts(this.state.video, {
      internalResolution: this.guiState.input.internalResolution,
      segmentationThreshold: this.guiState.segmentation.segmentationThreshold,
      maxDetections: this.guiState.multiPersonDecoding.maxDetections,
      scoreThreshold: this.guiState.multiPersonDecoding.scoreThreshold,
      nmsRadius: this.guiState.multiPersonDecoding.nmsRadius,
      numKeypointForMatching: this.guiState.multiPersonDecoding.numKeypointForMatching,
      refineSteps: this.guiState.multiPersonDecoding.refineSteps
    });
  }

  drawPoses(personOrPersonPartSegmentation, flipHorizontally, ctx) {
    if (Array.isArray(personOrPersonPartSegmentation)) {
      personOrPersonPartSegmentation.forEach(personSegmentation => {
        let pose = personSegmentation.pose;

        if (flipHorizontally) {
          pose = bodyPix.flipPoseHorizontal(pose, personSegmentation.width);
        }

        console.log("pose", pose.keypoints)
        drawKeypoints(pose.keypoints, 0.1, ctx);
        drawSkeleton(pose.keypoints, 0.1, ctx);

      });
    } else {
      personOrPersonPartSegmentation.allPoses.forEach(pose => {
        if (flipHorizontally) {
          pose = bodyPix.flipPoseHorizontal(
              pose, personOrPersonPartSegmentation.width);
        }
        drawKeypoints(pose.keypoints, 0.1, ctx);
        drawSkeleton(pose.keypoints, 0.1, ctx);
      })
    }
  }
  
  async loadBodyPix() {
    this.setState({
      net: await bodyPix.load({
                                architecture: this.guiState.input.architecture,
                                outputStride: this.guiState.input.outputStride,
                                multiplier: this.guiState.input.multiplier,
                                quantBytes: this.guiState.input.quantBytes
                              })
    })
  }

  async bodySegmentationFrame(){
    const multiPersonSegmentation = await this.estimateSegmentation();
    const flipHorizontally = true;
    const ctx = this.state.canvas.getContext('2d');

    switch (this.state.segmentType){
      
      case 'blur':

        bodyPix.drawBokehEffect(this.state.canvas, 
                                  this.state.video, 
                                  multiPersonSegmentation,
                                  +this.guiState.segmentation.backgroundBlurAmount,
                                  this.guiState.segmentation.edgeBlurAmount, 
                                  flipHorizontally);

      break;
      
      case 'mask':

        const foregroundColor = {r: 255, g: 255, b: 255, a: 0};
        const backgroundColor = {r: 0, g: 0, b: 0, a: 1000};
        const mask = bodyPix.toMask(
            multiPersonSegmentation, foregroundColor, backgroundColor,
            true);

        bodyPix.drawMask(this.state.canvas, 
                          this.state.video, 
                          mask, 
                          this.guiState.segmentation.opacity, 
                          this.guiState.segmentation.maskBlurAmount, 
                          flipHorizontally);
        break;
      
        case 'partMap':
          const multiPersonPartSegmentation = await this.estimatePartSegmentation();
          const coloredPartImageData = bodyPix.toColoredPartMask(
              multiPersonPartSegmentation,
              partColorScales[this.guiState.partMap.colorScale]);
          const maskBlurAmount = 0;
          bodyPix.drawMask(this.state.canvas, 
                          this.state.video, 
                          coloredPartImageData, 
                          this.guiState.partMap.opacity,
                          maskBlurAmount, 
                          flipHorizontally);
        break;

        default:
        break;

    }

    if (this.state.poseTracking === true){
      this.drawPoses(multiPersonSegmentation, flipHorizontally, ctx);
    };

    requestAnimationFrame(this.bodySegmentationFrame);
  }  


  segmentBodyInRealTime() {
    this.setState({
      canvas: document.getElementById('output')
    })
    this.setState({
      stream: this.state.canvas.captureStream().getVideoTracks()[0]
    })
    this.bodySegmentationFrame();
  }


  async bindPage() {
    // Load TF BodyPix Model
    await this.loadBodyPix();
    // Set up user webcam to start capturing
    await this.loadVideo(null);
    // Attach segmentation analysis to webcam stream
    this.segmentBodyInRealTime();
  }

  componentDidMount() {
    this.bindPage();
  }

  toggleBodyPix = () => {
    this.setState({
      bodyPixEnabled: !this.state.bodyPixEnabled,
    });

    if (this.state.stream !== true) {
      this.setState({
        stream: true
      });
    } else {
      this.segmentBodyInRealTime()
    }
  };

  togglePose = () => {
    this.setState({
      poseTracking: !this.state.poseTracking,
    });
  };


  togglesegmentType = (event) =>{
    this.setState({
      segmentType: event.target.value
    });
  };

  // onMouseClick(e) {
  //   console.log("entered")
  //   this.setState({ 
  //     mouseX: e.nativeEvent.offsetX, 
  //     mouseY: e.nativeEvent.offsetY
  //   });
  //   console.log('mouse locationX', this.state.mouseX)
  //   console.log('mouse locationY', this.state.mouseY)
  // }

  render() {

    return (
      <div>
        <div>
        {/* onMouseMove={this.onMouseClick} */}
          <video id="video" style={{display: "none" }} ></video>
          <canvas id="output" style={{display: "none"}} ></canvas>

          <button 
            onClick = {() => {this.toggleBodyPix() ; this.props.videoSourced(this.state.stream) }}>
            {this.state.stream === true ? 'Disable' : 'Enable'} Background Subtraction
          </button>

          {this.state.bodyPixEnabled && 
            <div>

              <select value={this.state.segmentType} onChange={this.togglesegmentType}>
                <option value="mask">Mask</option>
                <option value="blur">Blur</option>
                <option value="partMap">Part Map</option>
              </select>
              <button onClick = { this.togglePose }> {this.state.poseTracking ? 'Stop' : 'Start'} Tracking Poses </button> 
            </div>
          }
        </div>
      </div>
    );  
  }
}
