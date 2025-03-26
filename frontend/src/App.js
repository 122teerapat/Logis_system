import React, { useEffect } from 'react'
import{
  BrowserRouter,
  Routes,
  Route,
}from "react-router-dom"
import Home from "./components/Home"
import Parcel from './components/Parcel'


function App() {
  useEffect(() => {
    fetch('http://127.0.0.1:8081/')
    .then(res => res.json())
    .then(data => console.log(data))
    .catch(err => console.log(err))
  })
  
  return (
    <div className="App"> 
      <BrowserRouter>
        <Routes>
            <Route path="/" element={<Home/>}/>
        </Routes>
      </BrowserRouter>
    </div>
  )
}

export default App