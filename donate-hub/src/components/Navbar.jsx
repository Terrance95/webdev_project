import { useState } from 'react'
import { Crosshair, Menu, X, Zap } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { useUser } from '../context/UserContext'

const links = [
  { to: '/', label: 'Arena', end: true },
  { to: '/verify', label: 'Verify Feed' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/create', label: '+ New Stake' },
]

function navClass({ isActive }) {
  return `rounded-lg px-3 py-2 text-sm font-bold transition ${
    isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
  }`
}

export default function Navbar() {
  const {
    currentUser,
    loginOrCreateUser,
    logout,
    arenaPromptOpen,
    setArenaPromptOpen,
    sessionError,
  } = useUser()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => setMenuOpen(false)
  const submit = async event => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await loginOrCreateUser(name)
      setName('')
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-[#050507]/90 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6" aria-label="Main navigation">
          <Link to="/" onClick={closeMenu} className="flex items-center gap-2 text-lg font-black tracking-tight">
            <span className="grid size-8 place-items-center rounded-lg bg-emerald-500 text-black">
              <Crosshair size={18} />
            </span>
            ProofStake
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {links.map(link => (
              <NavLink key={link.to} to={link.to} end={link.end} className={navClass}>
                {link.label}
              </NavLink>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentUser ? (
              <>
                <span className="hidden rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-sm font-bold text-amber-300 sm:block">
                  <Zap className="mr-1 inline size-3" />
                  <span className="tabular-nums">{currentUser.stakes_balance}</span> Stakes
                </span>
                <button
                  type="button"
                  onClick={() => setArenaPromptOpen(true)}
                  className="max-w-32 truncate rounded-lg border border-zinc-700 px-3 py-2 text-sm font-bold hover:bg-zinc-900 sm:max-w-44"
                  title={`Switch player (currently ${currentUser.username})`}
                >
                  {currentUser.username}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setArenaPromptOpen(true)}
                className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-black hover:bg-emerald-400"
              >
                Enter Arena
              </button>
            )}
            <button
              type="button"
              className="grid size-9 place-items-center rounded-lg text-zinc-300 hover:bg-zinc-900 md:hidden"
              onClick={() => setMenuOpen(open => !open)}
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </nav>

        {menuOpen && (
          <div className="grid gap-1 border-t border-zinc-800 px-4 py-3 md:hidden">
            {links.map(link => (
              <NavLink key={link.to} to={link.to} end={link.end} onClick={closeMenu} className={navClass}>
                {link.label}
              </NavLink>
            ))}
            {currentUser && (
              <span className="px-3 py-2 text-sm font-bold text-amber-300">
                <Zap className="mr-1 inline size-3" />
                <span className="tabular-nums">{currentUser.stakes_balance}</span> Stakes
              </span>
            )}
          </div>
        )}
      </header>

      {sessionError && (
        <div className="mx-auto max-w-7xl px-4 pt-3 sm:px-6" role="alert">
          <p className="errorbox">{sessionError}</p>
        </div>
      )}

      {arenaPromptOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setArenaPromptOpen(false)
          }}
        >
          <form
            onSubmit={submit}
            className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-[#0d0f14] p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="enter-arena-title"
          >
            <p className="eyebrow">PLAYER SESSION</p>
            <h2 id="enter-arena-title" className="mt-2 text-2xl font-black">
              {currentUser ? 'Switch player' : 'Enter the Arena'}
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Enter an existing username to switch players, or choose a new one to start with 500 Stakes.
            </p>
            <label htmlFor="player-username" className="sr-only">Player username</label>
            <input
              id="player-username"
              autoFocus
              autoComplete="username"
              value={name}
              onChange={event => setName(event.target.value)}
              maxLength={24}
              placeholder="your_username"
              className="field mt-5"
            />
            {error && <p className="mt-2 text-sm text-red-400" role="alert">{error}</p>}
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={() => setArenaPromptOpen(false)} className="button-secondary flex-1">
                Cancel
              </button>
              {currentUser && (
                <button type="button" onClick={logout} className="button-secondary flex-1">
                  Continue as guest
                </button>
              )}
              <button disabled={busy || !name.trim()} className="button-primary flex-1">
                {busy ? 'Entering…' : currentUser ? 'Switch' : 'Enter Arena'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
