import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import Watch from './pages/watch'
import Analyze from './pages/analyze'
import Login from './pages/login';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';
import { Routes, Route } from 'react-router-dom';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  
  <BrowserRouter>
    <Routes>
      <Route index element={<Login />} />
      <Route path='login' element={<Login />} />
      <Route path='analyze' element={<Analyze />} />
      <Route path='watch' element={<Watch />} />
    </Routes>
  </BrowserRouter>
  
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
