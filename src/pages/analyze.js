import React, { useEffect, useRef, useState } from 'react';
import ReactPlayer from 'react-player';
import './analyze.css';

function Analyze(){
    const [videoUrl, setVideoUrl] = useState('');
    const [timestamps, setTimestamps] = useState([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [videoDuration, setVideoDuration] = useState(0);
    const [videoCurrentTime, setVideoCurrentTime] = useState(0);
    const [progress, setProgress] = useState(0);
    const videoRef = useRef(null);
  
    const setVideoFile = (event) => {
      const file = event.target.files[0];
      const videoUrl = URL.createObjectURL(file);
      setVideoUrl(videoUrl);
    }

    const setDataFile = (event) => {
        const reader = new FileReader()
        reader.onload = async (e) => { 
            const text = (e.target.result)
            const textArray = text.split(', ');
            console.log(textArray);
            let numberArray = [];
            for(var i = 0;i<textArray.length-1;i++){
                numberArray.push(parseInt(textArray[i]));
            }
            setTimestamps(numberArray);
            setVideoDuration(numberArray[0]/1000);
            console.log('video duration: ' + videoDuration);
        };
        reader.readAsText(event.target.files[0])
    }

    function Timestamp(){
        if(timestamps.length === 0) return (<></>);
        const times = [...timestamps];
        const videoLength = times.shift();
        const timeMarks = times.map((element, index) => 
            <div className='marker' key={index} style={{position:"absolute", left:element*100/videoLength+"%", backgroundColor:"red", width:"3px"}}>&nbsp;</div>
        ); 

        return (<div className='marker-area'>{timeMarks}</div>);
    }

    const playOrPause = (event) =>{
        if(!isPlaying) {
            videoRef.current.play();
            setIsPlaying(true);

            window.setInterval(function () {
                setVideoCurrentTime(videoRef.current?.currentTime); 
                setProgress((videoRef.current?.currentTime / videoDuration) * 100);
            }, 1000);
        }
        else{
            videoRef.current.pause();
            setIsPlaying(false);
        }
    }

    const seek = (event) => {
        const progressTime = (event.nativeEvent.offsetX / 580) * videoDuration;
        setVideoCurrentTime(progressTime); 
        setProgress((videoRef.current?.currentTime / videoDuration) * 100);
        videoRef.current.currentTime = progressTime;
    }
    
    return (
      <div className='analysis-section'>
        <div className='input-section'>
            Video file: <br/>
            <input type="file" onChange={setVideoFile} /> <br/>
            Data file: <br/>
            <input type="file" onChange={setDataFile} />
        </div>
        <div className='video-section'>
            <div className='video-box'>
                <video id='video01' ref={videoRef} src={videoUrl} onClick={playOrPause} width="100%" height="100%" controls={false}/>
                <div className='video-control-section'>
                    {Math.floor(videoCurrentTime / 60) + ":" + ("0" + Math.floor(videoCurrentTime % 60)).slice(-2)} / {Math.floor(videoDuration / 60) + ":" + ("0" + Math.floor(videoDuration % 60)).slice(-2)}
                    <div className='video-progress' onClick={seek}>
                        <div style={{width:progress+"%"}} className='video-progress-fill'></div>
                    </div>
                </div>
                <Timestamp/>
            </div>
        </div>
      </div>
    );
}

export default Analyze;