import './watch.css';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import * as tf from "@tensorflow/tfjs";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import '@mediapipe/face_mesh';
import Webcam from 'react-webcam';
import YouTube from 'react-youtube';

function Watch() {

  const [lastPositions, setLastPositions] = useState([]);
  const [detector, setDetector] = useState(null);
  const [outputData, setOutputData] = useState("");
  const [movements, setMovements] = useState([]);
  const [recordingState, setRecordingState] = useState(0); //0:not recording, 1:recording, 2:recording finished
  const [time, setTime] = useState(0);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const webcamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const canvasRef = useRef(null);

  const runFacemesh = async () => {
    const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
    const detectorConfig = {
      runtime: 'mediapipe',
      solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh'
    };
    setDetector(await faceLandmarksDetection.createDetector(model, detectorConfig));
    console.log("ready");
  }

  async function recordScreen() {
    return await navigator.mediaDevices.getDisplayMedia({
        audio: true, 
        video: { mediaSource: "screen"}
    });
  }

  function saveFile(recordedChunks){
    const blob = new Blob(recordedChunks, {
       type: 'video/webm'
     });
     let filename = window.prompt('Enter file name'),
         downloadLink = document.createElement('a');
     downloadLink.href = URL.createObjectURL(blob);
     downloadLink.download = `${filename}.webm`;
 
     document.body.appendChild(downloadLink);
     downloadLink.click();
     URL.revokeObjectURL(blob); // clear from memory
     document.body.removeChild(downloadLink);
 }

  const startRecording = useCallback(async() => {
    let stream = await recordScreen();
    // the stream data is stored in this array
    let recordedChunks = []; 
  
    const mediaRecorder = new MediaRecorder(stream);
  
    mediaRecorder.ondataavailable = function (e) {
      if (e.data.size > 0) {
        recordedChunks.push(e.data);
      }  
    };
    mediaRecorder.onstop = function () {
       saveFile(recordedChunks);
       recordedChunks = [];
    };
    mediaRecorder.start(200); // For every 200ms the stream data will be stored in a separate chunk.
    mediaRecorderRef.current = mediaRecorder;

    console.log("recording started");
    setRecordingState(1);
  },[mediaRecorderRef, setRecordingState])

  const stopRecording = useCallback(() => {
    console.log("recording stopped");
    mediaRecorderRef.current.stop();
    setOutputData(outputData => time + ", " + outputData);
    setRecordingState(2);
  }, [setRecordingState, mediaRecorderRef, time])

  const handleDownloadVideo = useCallback(() => {
    if (recordedChunks.length) {
      const blob = new Blob(recordedChunks, {
        type: "video/webm",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      document.body.appendChild(a);
      a.style = "display: none";
      a.href = url;
      a.download = "react-webcam-stream-capture.webm";
      a.click();
      window.URL.revokeObjectURL(url);
      setRecordedChunks([]);
    }
  }, [recordedChunks]);

  const getDistance = (x1,y1,x2,y2) => {
    const a = x1 - x2;
    const b = y1 - y2;

    return Math.sqrt( a*a + b*b );
  }

  const trackMovement = useCallback((predictions, ctx) => {
    const targetPoints = [73,76,180,303,306,404];
    const horizontalControlPoints = [234,454];
    let isBigMovement = false;
    if(predictions.length > 0){
        predictions.forEach((prediction) => {
          const keypoints = prediction.keypoints;
          const newMovements = [];
          const newPositions = lastPositions;
          isBigMovement = false;

          const faceWidth = getDistance(keypoints[horizontalControlPoints[0]].x, keypoints[horizontalControlPoints[0]].y,keypoints[horizontalControlPoints[1]].x, keypoints[horizontalControlPoints[1]].y);

          for(let i =0;i<targetPoints.length;i++){
            const x = keypoints[targetPoints[i]].x;
            const y = keypoints[targetPoints[i]].y;
            let movement = 0;
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, 3*Math.PI);
            ctx.fillStyle = "aqua";
            ctx.fill();
            
            if(newPositions[i] !== undefined){
              movement = getDistance(x,y,lastPositions[i].x,lastPositions[i].y);
              movement = getDistance(x, y, lastPositions[i].x, lastPositions[i].y);

              movement = movement*100/faceWidth; //normalize the movement using facewidth from the horizontal control points
              newMovements.push(movement);
              newPositions[i] = {"x":x, "y":y};
            }
            else{
              newMovements.push(movement);
              newPositions.push({x:x,y:y});
            }
            if(i>3 && movement > 3.0 && movement <10.0 && !isBigMovement){ //movement more than 10 points is too big and most likely a full head movement so we ignore it
              console.log("big movement detected");
              setOutputData(outputData => outputData + time + ", ");
              isBigMovement = true;
            }
          }
          setMovements(newMovements);
          setLastPositions(newPositions);
        });
    }
    else{
        console.log("prediction length is 0")
    }
  }, [lastPositions, time])

  //detect function
  const detect = useCallback( async(model) => {
    if(
      webcamRef.current !== null &&
      webcamRef.current.video.readyState ===4
    ){
      const video = webcamRef.current.video;
      const videoWidth = webcamRef.current.video.videoWidth;
      const videoHeight = webcamRef.current.video.videoHeight;

      webcamRef.current.video.width = videoWidth;
      webcamRef.current.video.height = videoHeight;

      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      const estimationConfig = {flipHorizontal: false};
      const face = await model.estimateFaces(video, estimationConfig);
      //console.log(face);

      const ctx = canvasRef.current.getContext("2d");
      trackMovement(face, ctx);
    }
  }, [webcamRef, canvasRef, trackMovement])

  const handleDownloadText = () => {
    const element = document.createElement('a');
    const file = new Blob([outputData], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = 'reaction-output-data.txt';
    document.body.appendChild(element);
    element.click();
  };

  useEffect(()=>{
    runFacemesh();
  }, [webcamRef]);

  useEffect(() => {
    if (recordingState === 1) {
      setTimeout(() => {
        detect(detector)
      }, 200);
    }
  }, [recordingState, detector, detect]);

  useEffect(()=>{
    let interval;
    if(recordingState === 1) {
      interval = setInterval(() => { 
        setTime(time => time + 200);
      }, 200);
    }
    return () => clearInterval(interval);
  }, [recordingState]);

  return (
    <div className="App">
      <div className="container">
        <div className='video-section'>
          <div className='youtube-player'>
            <YouTube 
              videoId="2g811Eo7K8U"
              opts={{
                height: '390',
                width: '640',
              }}
            />
            {recordingState === 0 ? <div className='youtube-blocker'><div className='youtube-blocker-text'>please start the recording first</div></div> : <></>}
          </div>
          <div className='reaction-section'>
            <Webcam ref={webcamRef} style={
              {
                position:"absolute",
                zIndex:9,
                width:480,
                height:300
              }
            } />
            <canvas ref={canvasRef} style={
              {
                position:"absolute",
                zIndex:9,
                width:480,
                height:300
              }
            } />
          </div>
        </div>
        <div className='control-buttons'>
          <button disabled={recordingState!==0} onClick={startRecording}>Start Recording</button>
          <button disabled={recordingState!==1} onClick={stopRecording}>Stop Recording</button>
          <button disabled={recordingState!==2} onClick={handleDownloadText}>Download Data</button>
          <button disabled={recordingState!==2} onClick={handleDownloadVideo}>Download Video</button>
        </div>
        <div className='stat-section'>
          Right Lip: {movements[0]}<br/>
          Left Lip: {movements[1]}<br/>
          Left Eyebrow: {movements[2]}<br/>
          Left Eye: {movements[3]}<br/>
          Right Eyebrow: {movements[4]}<br/>
          Right Eye: {movements[5]}<br/>
        </div>
      </div>
    </div>
  );
}

export default Watch;
