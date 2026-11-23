import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import { UserProvider } from './context/UserContext'
import Arena from './pages/Arena'
import ChallengeDetail from './pages/ChallengeDetail'
import CreateChallenge from './pages/CreateChallenge'
import Leaderboard from './pages/Leaderboard'
import VerifyFeed from './pages/VerifyFeed'

function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-28 text-center">
      <p className="eyebrow">404 // LOST IN THE ARENA</p>
      <h1 className="mt-3 text-4xl font-black">This page doesn’t exist.</h1>
      <p className="mt-3 text-zinc-400">The route may have moved or the arena may have closed.</p>
      <Link to="/" className="button-primary mt-6 inline-flex">Back to the Arena</Link>
    </main>
  )
}

export default function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Arena />} />
          <Route path="/create" element={<CreateChallenge />} />
          <Route path="/challenge/:id" element={<ChallengeDetail />} />
          <Route path="/verify" element={<VerifyFeed />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </UserProvider>
  )
}
