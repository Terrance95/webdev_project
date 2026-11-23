import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { createChallenge } from '../services/proofStakeService'

const stakeOptions = ['50', '100', '250', 'custom']

export default function CreateChallenge() {
  const { currentUser, loadingUser, setArenaPromptOpen, refreshUser } = useUser()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Coding',
    mode: 'group',
    duration_days: 7,
    entry_stake: '50',
  })
  const [customStake, setCustomStake] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!loadingUser && !currentUser) setArenaPromptOpen(true)
  }, [currentUser, loadingUser, setArenaPromptOpen])

  const setField = (field, value) => {
    setForm(current => ({ ...current, [field]: value }))
    setError('')
  }
  const selectedStake = stakeOptions.includes(form.entry_stake) ? form.entry_stake : 'custom'
  const stakeValue = selectedStake === 'custom' ? customStake : form.entry_stake
  const remainingBalance = Number(currentUser?.stakes_balance || 0) - Number(stakeValue || 0)

  const submit = async event => {
    event.preventDefault()
    if (!form.title.trim()) {
      setError('Challenge title is required.')
      return
    }
    if (!form.description.trim()) {
      setError('Challenge description is required.')
      return
    }
    if (!Number.isSafeInteger(Number(stakeValue)) || Number(stakeValue) < 1) {
      setError('Enter a whole-number stake greater than zero.')
      return
    }
    if (currentUser && Number(stakeValue) > Number(currentUser.stakes_balance)) {
      setError('Your entry stake cannot exceed your current balance.')
      return
    }
    if (!currentUser) {
      setArenaPromptOpen(true)
      return
    }

    setBusy(true)
    setError('')
    try {
      const challenge = await createChallenge({ ...form, entry_stake: stakeValue }, currentUser)
      await refreshUser()
      navigate(`/challenge/${challenge.id}`)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <p className="eyebrow">OPEN A NEW ARENA</p>
      <h1 className="mt-3 text-4xl font-black">Put your discipline on the line.</h1>
      <p className="mt-3 text-zinc-400">Lock an entry stake and invite players to prove their streak.</p>

      <form noValidate onSubmit={submit} className="mt-8 space-y-5 rounded-2xl border border-zinc-800 bg-[#0d0f14] p-5 sm:p-7">
        <label className="block text-sm font-bold">
          Challenge title
          <input
            required
            aria-invalid={Boolean(error && !form.title.trim())}
            className="field mt-2"
            maxLength={100}
            value={form.title}
            onChange={event => setField('title', event.target.value)}
            placeholder="Ship a feature every day"
          />
        </label>

        <label className="block text-sm font-bold">
          Description
          <textarea
            required
            aria-invalid={Boolean(error && !form.description.trim())}
            className="field mt-2 min-h-28"
            maxLength={1000}
            value={form.description}
            onChange={event => setField('description', event.target.value)}
            placeholder="Define what counts as proof…"
          />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-bold">
            Category
            <select className="field mt-2" value={form.category} onChange={event => setField('category', event.target.value)}>
              {['Coding', 'Fitness', 'Study', 'Habit', 'Other'].map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-bold">
            Duration
            <select
              className="field mt-2"
              value={form.duration_days}
              onChange={event => setField('duration_days', Number(event.target.value))}
            >
              {[3, 7, 14, 30].map(days => <option key={days} value={days}>{days} days</option>)}
            </select>
          </label>
        </div>

        <fieldset>
          <legend className="text-sm font-bold">Arena mode</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              ['group', 'Group Pot'],
              ['duel', '1v1 Duel'],
            ].map(([mode, label]) => (
              <button
                type="button"
                key={mode}
                aria-pressed={form.mode === mode}
                onClick={() => setField('mode', mode)}
                className={`filter ${form.mode === mode ? 'selected' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="block text-sm font-bold">
          Entry stake
          <select
            className="field mt-2"
            value={selectedStake}
            onChange={event => setField('entry_stake', event.target.value === 'custom' ? 'custom' : event.target.value)}
          >
            {stakeOptions.map(option => (
              <option key={option} value={option}>{option === 'custom' ? 'Custom amount' : `${option} Stakes`}</option>
            ))}
          </select>
        </label>
        {selectedStake === 'custom' && (
          <label className="block text-sm font-bold">
            Custom amount
            <input
              required
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              className="field mt-2"
              value={customStake}
              onChange={event => {
                setCustomStake(event.target.value)
                setError('')
              }}
            />
          </label>
        )}

        {currentUser ? (
          <>
            <div className={`rounded-xl p-4 text-sm ${remainingBalance < 0 ? 'bg-red-500/10 text-red-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
              Your balance after locking: <b className="tabular-nums">{Number.isFinite(remainingBalance) ? remainingBalance : '—'} Stakes</b>
            </div>
            {remainingBalance < 0 && (
              <p className="errorbox" role="alert">Entry stake exceeds your current balance.</p>
            )}
          </>
        ) : (
          <p className="rounded-xl bg-zinc-900 p-4 text-sm text-zinc-400">
            Enter the Arena before launching a challenge. New players start with 500 Stakes.
          </p>
        )}

        {error && <p className="errorbox" role="alert">{error}</p>}
        <button disabled={busy || (currentUser && remainingBalance < 0)} className="button-primary w-full">
          {busy ? 'Launching…' : 'Launch Stake'}
        </button>
      </form>
    </main>
  )
}
