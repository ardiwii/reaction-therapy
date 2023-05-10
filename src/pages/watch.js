import './watch.css';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import * as tf from "@tensorflow/tfjs";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import '@mediapipe/face_mesh';
import Webcam from 'react-webcam';
import YouTube from 'react-youtube';
import { ref, uploadBytes, uploadString } from "firebase/storage";
import storage from "../firebase"
import userEvent from '@testing-library/user-event';

function Watch() {

  const [recordingId, setRecordingId] = useState("");
  const [userid, setUserid] = useState("");
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
  const feedbackCanvasRef = useRef(null);
  const thumbsUpRef = useRef(null);

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

  const startRecording = useCallback(async() => {

    setRecordingId(new Date(Date.now()).toISOString());

    let stream = await recordScreen();
    // the stream data is stored in this array
    setRecordedChunks([]); 
  
    const mediaRecorder = new MediaRecorder(stream);
  
    mediaRecorder.ondataavailable = function (e) {
      if (e.data.size > 0) {
        let tempChunk = recordedChunks;
        tempChunk.push(e.data);
        setRecordedChunks(tempChunk);
      }  
    };
    mediaRecorder.start(200); // For every 200ms the stream data will be stored in a separate chunk.
    mediaRecorderRef.current = mediaRecorder;

    console.log("recording started");
    setRecordingState(1);
  },[mediaRecorderRef, setRecordingState, recordedChunks])

  const stopRecording = useCallback(() => {
    console.log("recording stopped");
    setOutputData(outputData => time + ", " + outputData);
    mediaRecorderRef.current.stop();
    setRecordingState(2);
  }, [setRecordingState, mediaRecorderRef, time])

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
            ctx.arc(150, 150, 1, 0, 5*Math.PI);
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
              thumbsUpRef.current.style.display = "block";
              setTimeout(() => {
                thumbsUpRef.current.style.display = "none";
              }, 1000);
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
    element.download = `${userid}-output-data.txt`;
    document.body.appendChild(element);
    element.click();
  };

  useEffect(()=>{
    runFacemesh();
  }, [webcamRef, feedbackCanvasRef]);

  useEffect(()=>{
    const ctx = feedbackCanvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.arc(180, 240, 8, 0, 2*Math.PI);
    const moveValue0 = movements[0] !== undefined ? Math.max(255 - (movements[0] / 8.0 * 255), 0) : 255;
    ctx.fillStyle = `rgb(255,${moveValue0},${moveValue0})`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(120, 240, 8, 0, 2*Math.PI);
    const moveValue1 = movements[1] !== undefined ? Math.max(255 - (movements[1] / 8.0 * 255), 0) : 255;
    ctx.fillStyle = `rgb(255,${moveValue1},${moveValue1})`;
    ctx.fill();
  }, [feedbackCanvasRef, movements])

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

  useEffect(() => {
    setUserid(localStorage.getItem("userid"));
  }, [userid]);

  useEffect(() => {
    if(recordingState === 2){
      
      const textStoreRef = ref(storage, `${userid}/${recordingId} - data`);
      uploadString(textStoreRef, outputData, "raw", { contentType: "text/plain", }).then((snapshot) => {
        console.log('Uploaded data string!');
      }, [outputData]);

      const videoBlob = new Blob(recordedChunks, {
        type: 'video/webm'
      });
  
      // upload to firebase
      // const videoStoreRef = ref(storage, `${userid}/${recordingId} - video`);
      // uploadBytes(videoStoreRef, videoBlob).then((snapshot) => {
      //   console.log('Uploaded recording file!');
      // });
  
      let downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(videoBlob);
      downloadLink.download = `${userid}-${recordingId}.webm`;
  
      document.body.appendChild(downloadLink);
      downloadLink.click();
      URL.revokeObjectURL(videoBlob); // clear from memory
      document.body.removeChild(downloadLink);

      // setRecordedChunks([]);
    }
  }, [recordingState, outputData, recordingId, userid, recordedChunks]);

  return (
    <div className="App">
      <div className="container">
        <div className='video-section'>
          <div>
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
            <div className='control-buttons'>
              <button disabled={recordingState!==0} onClick={startRecording}>Start Recording</button>
              <button disabled={recordingState!==1} onClick={stopRecording}>Stop Recording</button>
              <button disabled={recordingState!==2} onClick={handleDownloadText}>Download Data</button>
            </div>
            <div className='control-buttons'>logged in as: {userid}</div>
          </div>
          <div className='reaction-section'>
            <div className='reaction-video'>
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
              <div ref={thumbsUpRef} style={{
                position:"absolute", zIndex:10, display:"none"}
              }>
                <img src='ThumbsUp.gif' alt='thumbs up animated gif' width={50} height={50}/>
              </div>
            </div>
            <div className='stat-section'>
              <img src="facewire.png" alt="wireframe of a face" style={
                {
                  position:"absolute",
                  width:"300px",
                  height:"300px"
                }
              } />
              <canvas ref={feedbackCanvasRef} width={300} height={300} style={
                {
                  position:"absolute"
                }
              } />
              {/* Right Lip: {movements[0]}<br/>
              Left Lip: {movements[1]}<br/>
              Left Eyebrow: {movements[2]}<br/>
              Left Eye: {movements[3]}<br/>
              Right Eyebrow: {movements[4]}<br/>
              Right Eye: {movements[5]}<br/> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Watch;
