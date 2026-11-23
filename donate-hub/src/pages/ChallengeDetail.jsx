import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Check, Copy, Upload, X } from 'lucide-react'
import { useUser } from '../context/UserContext'
import ProofCard from '../components/ProofCard'
import {
  getChallengeDetails,
  joinChallenge,
  settleChallenge,
  submitProof,
  verifyProof,
} from '../services/proofStakeService'

const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
const maxImageSize = 5 * 1024 * 1024

export default function ChallengeDetail() {
  const { id } = useParams()
  const { currentUser, setArenaPromptOpen, refreshUser } = useUser()
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [caption, setCaption] = useState('')
  const [day, setDay] = useState(1)
  const [copyMessage, setCopyMessage] = useState('')

  useEffect(() => {
    if (!preview) return undefined
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      setDetails(await getChallengeDetails(id))
    } catch (loadError) {
      setError(loadError.message)
      setDetails(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    getChallengeDetails(id)
      .then(data => {
        if (active) setDetails(data)
      })
      .catch(loadError => {
        if (active) {
          setDetails(null)
          setError(loadError.message)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [id])

  const participant = details?.participants.find(item => item.profile_id === currentUser?.id)
  const isCreator = details?.challenge.creator_id === currentUser?.id
  const dayAlreadySubmitted = details?.proofs.some(
    proof => proof.profile_id === currentUser?.id && Number(proof.day_number) === Number(day),
  )

  const act = async operation => {
    if (!currentUser) {
      setArenaPromptOpen(true)
      return false
    }

    setBusy(true)
    setError('')
    try {
      await operation()
      await refreshUser()
      await load()
      return true
    } catch (actionError) {
      setError(actionError.message)
      return false
    } finally {
      setBusy(false)
    }
  }

  const chooseImage = event => {
    const selectedFile = event.target.files?.[0]
    event.target.value = ''
    if (!selectedFile) return
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Choose a JPG, PNG, or WEBP image.')
      return
    }
    if (selectedFile.size > maxImageSize) {
      setError('Image must be 5MB or smaller.')
      return
    }
    setError('')
    setFile(selectedFile)
    setPreview(URL.createObjectURL(selectedFile))
  }

  const vote = async (proof, verdict) => {
    let reason
    if (verdict === 'flag') {
      reason = window.prompt('Why is this receipt suspicious? (Required, max 240 characters)')
      if (reason === null) return
      reason = reason.trim().slice(0, 240)
      if (!reason) {
        setError('A short reason is required to flag a receipt.')
        return
      }
    }
    await act(() => verifyProof({
      proofId: proof.id,
      verifierId: currentUser.id,
      verdict,
      reason,
    }))
  }

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(details.challenge.invite_code)
      setCopyMessage('Invite code copied.')
    } catch {
      setCopyMessage('Could not access the clipboard. Select and copy the invite code manually.')
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-5 py-9 sm:px-8" aria-busy="true">
        <div className="h-72 animate-pulse rounded-2xl bg-zinc-900" />
      </main>
    )
  }

  if (error && !details) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-20">
        <div className="errorbox" role="alert">Couldn’t open this arena: {error}</div>
        <Link to="/" className="button-secondary mt-5 inline-flex">Back to the Arena</Link>
      </main>
    )
  }

  if (!details) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-20 text-center">
        <p className="eyebrow">404 // ARENA NOT FOUND</p>
        <h1 className="mt-3 text-3xl font-black">This challenge doesn’t exist.</h1>
        <p className="mt-2 text-zinc-400">Check the link or find another arena to join.</p>
        <Link to="/" className="button-primary mt-6 inline-flex">Back to the Arena</Link>
      </main>
    )
  }

  const { challenge, participants, proofs } = details

  return (
    <main className="mx-auto max-w-7xl px-5 py-9 sm:px-8">
      <section className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-[#0d0f14] p-6 sm:p-9">
        <div className="flex flex-wrap justify-between gap-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-2">
              <span className={`pill ${challenge.mode === 'duel' ? 'pill-violet' : 'pill-green'}`}>
                {challenge.mode === 'duel' ? '1V1 DUEL' : 'GROUP POT'}
              </span>
              <span className={`pill ${challenge.status === 'active' ? 'pill-green' : 'pill-amber'}`}>
                {challenge.status}
              </span>
            </div>
            <h1 className="mt-4 break-words text-4xl font-black">{challenge.title}</h1>
            <p className="mt-2 max-w-2xl whitespace-pre-line text-zinc-400">{challenge.description}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500">LIVE POT</p>
            <p className="tabular-nums text-4xl font-black text-emerald-400">
              ⚡ {Number(challenge.pot_total).toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              {challenge.entry_stake} entry · {challenge.duration_days} days
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button type="button" onClick={copyInvite} className="button-secondary">
            <Copy className="mr-1 inline size-4" />
            {challenge.invite_code}
          </button>
          {copyMessage && <span className="text-xs text-zinc-400" role="status">{copyMessage}</span>}
          {participant ? (
            <span className={`pill ${participant.status === 'active' ? 'pill-green' : 'pill-red'}`}>
              {participant.status === 'active'
                ? `You’re in — Streak: ${participant.current_streak} days`
                : `You are ${participant.status}`}
            </span>
          ) : (
            <button
              type="button"
              disabled={busy || challenge.status !== 'active'}
              onClick={() => act(() => joinChallenge(challenge.id, currentUser))}
              className="button-primary"
            >
              {busy ? 'Locking Stake…' : 'Join & Lock Stake'}
            </button>
          )}
        </div>
      </section>

      {error && <div className="errorbox mt-5" role="alert">{error}</div>}

      <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_310px]">
        <div>
          {participant?.status === 'active' && challenge.status === 'active' && (
            <section className="rounded-2xl border border-zinc-800 bg-[#0d0f14] p-5">
              <h2 className="text-xl font-black">Submit daily proof</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-[140px_1fr]">
                <label className="text-xs font-bold text-zinc-400">
                  Challenge day
                  <input
                    type="number"
                    min={1}
                    max={challenge.duration_days}
                    step={1}
                    value={day}
                    onChange={event => setDay(event.target.value)}
                    className="field mt-1"
                  />
                </label>
                <label className="text-xs font-bold text-zinc-400">
                  Receipt caption
                  <input
                    value={caption}
                    maxLength={500}
                    onChange={event => setCaption(event.target.value)}
                    placeholder="What did you complete?"
                    className="field mt-1"
                  />
                </label>
              </div>

              {dayAlreadySubmitted && (
                <p className="mt-3 text-sm text-amber-300">You already submitted a receipt for this day.</p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="button-secondary cursor-pointer">
                  <Upload className="mr-1 inline size-4" />
                  {file ? 'Replace image' : 'Add JPG, PNG or WEBP'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} className="sr-only" />
                </label>
                {preview && (
                  <div className="relative">
                    <img src={preview} alt="Proof preview" className="size-20 rounded-lg object-cover" />
                    <button
                      type="button"
                      aria-label="Remove selected proof image"
                      onClick={() => {
                        setFile(null)
                        setPreview('')
                      }}
                      className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  disabled={busy || !file || !caption.trim() || dayAlreadySubmitted}
                  onClick={async () => {
                    const submitted = await act(() => submitProof({
                      challengeId: challenge.id,
                      profileId: currentUser.id,
                      dayNumber: day,
                      caption,
                      file,
                    }))
                    if (submitted) {
                      setFile(null)
                      setPreview('')
                      setCaption('')
                    }
                  }}
                  className="button-primary"
                >
                  {busy ? 'Submitting…' : <><Check className="mr-1 inline size-4" />Submit Receipt</>}
                </button>
              </div>
            </section>
          )}

          <h2 className="mt-7 text-2xl font-black">Live receipts</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {proofs.length ? (
              proofs.map(proof => <ProofCard key={proof.id} proof={proof} currentUser={currentUser} onVote={vote} busy={busy} />)
            ) : (
              <p className="rounded-xl border border-dashed border-zinc-700 p-8 text-center text-zinc-500 sm:col-span-2">
                No receipts yet. Set the standard.
              </p>
            )}
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-zinc-800 bg-[#0d0f14] p-5">
          <h2 className="font-black">Standings</h2>
          {participants.length ? (
            <div className="mt-4 space-y-3">
              {participants.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">
                    <i
                      style={{ backgroundColor: item.profile?.avatar_color || '#71717a' }}
                      className="mr-2 inline-block size-2 rounded-full"
                    />
                    {item.profile?.username || 'Arena player'}
                  </span>
                  <span className="shrink-0 text-zinc-400">{item.current_streak}d · {item.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">No players have joined yet.</p>
          )}
          {isCreator && challenge.status === 'active' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => act(() => settleChallenge(challenge.id))}
              className="button-secondary mt-6 w-full text-amber-300"
            >
              {busy ? 'Settling…' : 'Settle Pot & Payout Survivors'}
            </button>
          )}
        </aside>
      </div>
    </main>
  )
}
