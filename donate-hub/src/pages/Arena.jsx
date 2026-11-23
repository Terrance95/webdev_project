import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Swords } from 'lucide-react'
import { useUser } from '../context/UserContext'
import { getArenaStats, getChallenges, joinByInviteCode } from '../services/proofStakeService'

const categories = ['All', 'Coding', 'Fitness', 'Study', 'Habit', 'Other']
const modes = ['All', 'Group Pot', '1v1 Duel']
const emptyStats = { activePot: 0, activeChallengers: 0, verifiedReceipts: 0 }

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-zinc-800 bg-[#0d0f14] p-5">
      <div className="h-5 w-24 rounded bg-zinc-800" />
      <div className="mt-6 h-6 w-3/4 rounded bg-zinc-800" />
      <div className="mt-3 h-4 rounded bg-zinc-900" />
      <div className="mt-2 h-4 w-2/3 rounded bg-zinc-900" />
      <div className="mt-8 h-8 w-1/3 rounded bg-zinc-800" />
    </div>
  )
}

export default function Arena() {
  const [filters, setFilters] = useState({ category: 'All', mode: 'All', search: '' })
  const [items, setItems] = useState([])
  const [stats, setStats] = useState(emptyStats)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [error, setError] = useState('')
  const [statsError, setStatsError] = useState('')
  const [code, setCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(false)
  const { currentUser, setArenaPromptOpen, refreshUser } = useUser()
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    getChallenges(filters)
      .then(data => {
        if (active) setItems(data)
      })
      .catch(loadError => {
        if (active) setError(loadError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [filters])

  useEffect(() => {
    let active = true
    getArenaStats()
      .then(data => {
        if (active) setStats(data)
      })
      .catch(loadError => {
        if (active) setStatsError(loadError.message)
      })
      .finally(() => {
        if (active) setStatsLoading(false)
      })
    return () => { active = false }
  }, [])

  const updateFilter = (key, value) => setFilters(current => ({ ...current, [key]: value }))
  const resetFilters = () => setFilters({ category: 'All', mode: 'All', search: '' })

  const submitInvite = async event => {
    event.preventDefault()
    if (!currentUser) {
      setArenaPromptOpen(true)
      return
    }

    setJoining(true)
    setJoinError('')
    try {
      const challenge = await joinByInviteCode(code, currentUser)
      await refreshUser()
      navigate(`/challenge/${challenge.id}`)
    } catch (joinError) {
      setJoinError(joinError.message)
    } finally {
      setJoining(false)
    }
  }

  return (
    <main>
      <section className="hero">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <p className="eyebrow">PEER-VERIFIED ACCOUNTABILITY</p>
          <h1 className="mt-4 max-w-3xl text-5xl font-black tracking-tight sm:text-7xl">
            Prove it.<br /><span className="text-emerald-400">Or lose the pot.</span>
          </h1>
          <p className="mt-5 max-w-xl text-zinc-400">
            Put Stakes on the line, build a streak, and let the arena judge every receipt.
          </p>

          <form onSubmit={submitInvite} className="mt-8 flex max-w-lg gap-2 rounded-xl border border-zinc-700 bg-[#0d0f14] p-2">
            <label htmlFor="duel-code" className="sr-only">Six-character challenge invite code</label>
            <input
              id="duel-code"
              value={code}
              onChange={event => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              maxLength={6}
              autoComplete="off"
              placeholder="JOIN BY DUEL CODE"
              className="min-w-0 flex-1 bg-transparent px-3 text-sm font-bold tracking-widest outline-none"
            />
            <button disabled={joining || code.length !== 6} className="button-primary">
              {joining ? 'Joining…' : 'Enter'}
            </button>
          </form>
          {joinError && <p className="mt-2 text-sm text-red-400" role="alert">{joinError}</p>}

          <div className="mt-10 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              [stats.activePot, 'Active Pot Stakes'],
              [stats.activeChallengers, 'Active Challengers'],
              [stats.verifiedReceipts, 'Verified Receipts'],
            ].map(([value, label]) => (
              <div key={label} className="stat">
                <b>{statsLoading ? '—' : Number(value).toLocaleString()}</b>
                <span>{label}</span>
              </div>
            ))}
          </div>
          {statsError && <p className="mt-3 text-sm text-red-400" role="alert">Live stats unavailable: {statsError}</p>}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2" aria-label="Filter by category">
            {categories.map(category => (
              <button
                type="button"
                key={category}
                aria-pressed={filters.category === category}
                onClick={() => updateFilter('category', category)}
                className={`filter ${filters.category === category ? 'selected' : ''}`}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="flex flex-col justify-between gap-3 sm:flex-row">
            <div className="flex flex-wrap gap-2" aria-label="Filter by arena mode">
              {modes.map(mode => (
                <button
                  type="button"
                  key={mode}
                  aria-pressed={filters.mode === mode}
                  onClick={() => updateFilter('mode', mode)}
                  className={`filter ${filters.mode === mode ? 'selected' : ''}`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <label className="relative">
              <span className="sr-only">Search challenges</span>
              <Search className="absolute left-3 top-3 size-4 text-zinc-500" />
              <input
                className="field w-full pl-9 sm:w-72"
                placeholder="Search challenges"
                value={filters.search}
                onChange={event => updateFilter('search', event.target.value)}
              />
            </label>
          </div>
        </div>

        {error && <div className="errorbox mt-6" role="alert">Couldn’t load the arena: {error}</div>}

        {loading ? (
          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map(index => <SkeletonCard key={index} />)}
          </div>
        ) : !error && items.length ? (
          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map(challenge => (
              <Link key={challenge.id} to={`/challenge/${challenge.id}`} className="challenge-card block">
                <div className="flex justify-between gap-2">
                  <span className={`pill ${challenge.mode === 'duel' ? 'pill-violet' : 'pill-green'}`}>
                    {challenge.mode === 'duel' ? '1V1 DUEL' : 'GROUP POT'}
                  </span>
                  <span className={`pill ${challenge.status === 'active' ? 'pill-amber' : 'pill-red'}`}>
                    {challenge.status}
                  </span>
                </div>
                <h2 className="mt-5 text-xl font-black">{challenge.title}</h2>
                <p className="mt-2 line-clamp-2 min-h-10 text-sm text-zinc-400">{challenge.description}</p>
                <div className="mt-6 flex items-end justify-between gap-3">
                  <div>
                    <span className="text-xs text-zinc-500">LIVE POT</span>
                    <p className="tabular-nums text-2xl font-black text-emerald-400">
                      ⚡ {Number(challenge.pot_total).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right text-xs text-zinc-400">
                    <p>{challenge.duration_days} days</p>
                    <p>{challenge.participant_count} players · {challenge.entry_stake} entry</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : !error ? (
          <div className="mt-10 rounded-2xl border border-dashed border-zinc-700 p-12 text-center">
            <Swords className="mx-auto text-zinc-600" />
            <h2 className="mt-3 text-xl font-bold">No matches found.</h2>
            <p className="mt-2 text-zinc-400">Reset your filters or launch a new stake.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={resetFilters} className="button-secondary">Reset filters</button>
              <Link to="/create" className="button-primary">New Stake</Link>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  )
}
