import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import DonateItem from './pages/DonateItem'
import Home from './pages/Home'
import ItemDetails from './pages/ItemDetails'
export default function App() { return <BrowserRouter><Navbar/><Routes><Route path="/" element={<Home/>}/><Route path="/donate" element={<DonateItem/>}/><Route path="/item/:id" element={<ItemDetails/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></BrowserRouter> }
