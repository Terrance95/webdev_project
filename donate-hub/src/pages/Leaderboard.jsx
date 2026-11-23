import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { getLeaderboard, getUserReceipts } from '../services/proofStakeService'

const rankColors = ['text-amber-300', 'text-zinc-300', 'text-orange-400']

export default function Leaderboard() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [receipts, setReceipts] = useState([])
  const [receiptsLoading, setReceiptsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getLeaderboard()
      .then(data => {
        if (active) setPlayers(data)
      })
      .catch(loadError => {
        if (active) setError(loadError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const openTimeline = async player => {
    setSelected(player)
    setReceipts([])
    setError('')
    setReceiptsLoading(true)
    try {
      setReceipts(await getUserReceipts(player.id))
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setReceiptsLoading(false)
    }
  }

  const closeTimeline = () => {
    setSelected(null)
    setReceipts([])
    setError('')
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
      <p className="eyebrow text-amber-300">THE BOARD</p>
      <h1 className="mt-3 text-4xl font-black">Proof earns position.</h1>
      <p className="mt-2 text-zinc-400">Ranked by Stakes, wins, then Skeptic Bounties. Select a player to inspect receipts.</p>
      {error && !selected && <div className="errorbox mt-5" role="alert">{error}</div>}

      <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-800">
        <div className="hidden grid-cols-[65px_minmax(0,1fr)_110px_80px_110px] gap-3 bg-zinc-900 px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500 sm:grid">
          <span>Rank</span><span>Player</span><span>Stakes</span><span>Wins</span><span>Bounties</span>
        </div>
        {loading ? (
          <div className="space-y-2 bg-[#0d0f14] p-4" aria-busy="true">
            {[1, 2, 3].map(index => <div key={index} className="h-16 animate-pulse rounded-lg bg-zinc-900" />)}
          </div>
        ) : players.length ? (
          players.map((player, index) => (
            <button
              type="button"
              key={player.id}
              onClick={() => openTimeline(player)}
              className="grid w-full grid-cols-[40px_minmax(0,1fr)_90px] items-center gap-x-3 gap-y-2 border-t border-zinc-800 bg-[#0d0f14] px-4 py-4 text-left hover:bg-zinc-900/70 sm:grid-cols-[65px_minmax(0,1fr)_110px_80px_110px]"
            >
              <b className={rankColors[index] || 'text-zinc-500'}>#{index + 1}</b>
              <span className="min-w-0 truncate font-bold">
                <i
                  style={{ backgroundColor: player.avatar_color || '#71717a' }}
                  className="mr-2 inline-block size-2 rounded-full"
                />
                {player.username}
              </span>
              <span className="tabular-nums text-emerald-300">{Number(player.stakes_balance).toLocaleString()}</span>
              <span className="hidden sm:inline">{player.wins_count}</span>
              <span className="hidden sm:inline">{player.bounties_earned}</span>
              <span className="col-start-2 text-xs text-zinc-500 sm:hidden">
                {player.wins_count} wins · {player.bounties_earned} bounties
              </span>
            </button>
          ))
        ) : !error ? (
          <p className="bg-[#0d0f14] p-10 text-center text-zinc-500">No players on the board yet.</p>
        ) : null}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/70"
          onMouseDown={event => {
            if (event.target === event.currentTarget) closeTimeline()
          }}
        >
          <section
            className="h-full w-full max-w-xl overflow-y-auto border-l border-zinc-700 bg-[#0d0f14] p-5 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipts-title"
          >
            <button type="button" onClick={closeTimeline} className="float-right rounded-lg p-2 text-zinc-400 hover:bg-zinc-800" aria-label="Close receipts">
              <X size={20} />
            </button>
            <p className="eyebrow">PUBLIC RECEIPTS</p>
            <h2 id="receipts-title" className="mt-2 text-3xl font-black">{selected.username}</h2>
            {error && <div className="errorbox mt-5" role="alert">{error}</div>}

            {receiptsLoading ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2" aria-busy="true">
                {[1, 2].map(index => <div key={index} className="aspect-square animate-pulse rounded-xl bg-zinc-900" />)}
              </div>
            ) : receipts.length ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {receipts.map(receipt => (
                  <article key={receipt.id} className="overflow-hidden rounded-xl border border-zinc-800">
                    <img
                      src={receipt.image_url}
                      alt={receipt.caption || 'Proof receipt'}
                      loading="lazy"
                      className="aspect-square w-full bg-zinc-900 object-cover"
                    />
                    <div className="p-3">
                      <p className="font-bold">{receipt.challenge_title}</p>
                      <p className="mt-1 text-xs text-zinc-400">Day {receipt.day_number} · {receipt.status}</p>
                      <p className="mt-2 break-words text-sm text-zinc-300">{receipt.caption}</p>
                      <time className="mt-2 block text-xs text-zinc-500" dateTime={receipt.created_at}>
                        {new Date(receipt.created_at).toLocaleString()}
                      </time>
                    </div>
                  </article>
                ))}
              </div>
            ) : !error ? (
              <p className="mt-6 text-zinc-500">No public receipts yet.</p>
            ) : null}
          </section>
        </div>
      )}
    </main>
  )
}
