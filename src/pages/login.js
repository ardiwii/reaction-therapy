import { useState } from "react";
import { useNavigate } from "react-router";
import './login.css'

function Login(){

    const [userid, setUserid] = useState("");
    const [password, setPassword] = useState("");
    let navigate = useNavigate();

    const handleIdInput = (e) =>{
        setUserid(e.target.value)
    }

    const handlePasswordInput = (e) =>{
        setPassword(e.target.value)
    }

    const login = (e) =>{
        if(userid === "doctor" || userid === "admin"){
            navigate("/analyze");
        }
        else{
            localStorage.setItem("userid", userid);
            navigate("watch");
        }
    }

    return (
        <>
            <div className="page-container">
                <div className="login-box">
                    <div className="login-row">Username: <input onChange={handleIdInput} type='text'></input></div> <br/>
                    <div className="login-row">Password: <input onChange={handlePasswordInput} type='password'></input></div> <br/>
                    <div className="login-row"><button onClick={login}>Log In</button></div>
                </div>
            </div>
        </>
    )
}

export default Login;