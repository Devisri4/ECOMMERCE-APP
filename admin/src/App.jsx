import React, { useEffect, useState } from "react";
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import { Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Add from './pages/Add'
import Edit from './pages/Edit'
import List from './pages/List'
import Orders from './pages/Orders'
import Login from './components/Login'
import { ToastContainer, toast } from 'react-toastify';
import axios from 'axios';
import 'react-toastify/dist/ReactToastify.css';

export const backendUrl = import.meta.env.VITE_BACKEND_URL
export const currency ='$'

// Registered at module load (not in an effect) so it also covers requests that child pages
// send on their first render — React runs child effects before the parent's.
let onSessionExpired = () => {}
axios.interceptors.response.use((res) => {
  if (res.config?.headers?.token && res.data?.success === false && res.data?.message === 'Not Authorized Login Again') {
    onSessionExpired()
  }
  return res
})

const App = () => {

  const [token, setToken] = useState(localStorage.getItem('token') ? localStorage.getItem('token') : '');


useEffect(() => {
  localStorage.setItem('token', token);
}, [token]);

// Expired/invalid admin session (e.g. after the token format change) → back to the login screen
useEffect(() => {
  onSessionExpired = () => {
    setToken('');
    toast.error('Your session has expired. Please sign in again.', { toastId: 'session-expired' });
  };
  return () => { onSessionExpired = () => {} };
}, []);

  return (
    <div className='min-h-screen bg-[#18181b] text-zinc-200'>
      {/* Admin-branded notifications — see .Toastify overrides in index.css */}
      <ToastContainer position="bottom-right" hideProgressBar autoClose={3000} icon={false} newestOnTop limit={3} />
      {token === ""
        ? <Login setToken={setToken}/>
        : <>
        <Navbar setToken={setToken} />
          <div className='flex w-full flex-col md:flex-row'>
            <Sidebar />
            <main className='min-w-0 flex-1 px-4 py-8 text-base sm:px-8 lg:px-10'>
              <Routes>
                <Route path='/' element={<Dashboard token={token} />} />
                <Route path='/add' element={<Add token={token} />} />
                <Route path='/list' element={<List token={token} />} />
                <Route path='/edit/:productId' element={<Edit token={token} />} />
                <Route path='/orders' element={<Orders token={token} />} />
                <Route path='*' element={<Navigate to='/' replace />} />
              </Routes>
            </main>
          </div>
        </>
      }
    </div>
  )
}

export default App
