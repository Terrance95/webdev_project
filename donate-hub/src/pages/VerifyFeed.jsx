import { useCallback, useEffect, useState } from 'react'
import { useUser } from '../context/UserContext'
import ProofCard from '../components/ProofCard'
import { getPendingProofs, verifyProof } from '../services/proofStakeService'

export default function VerifyFeed() {
  const { currentUser, refreshUser } = useUser()
  const [proofs, setProofs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setError('')
    try {
      setProofs(await getPendingProofs())
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

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

    setBusy(true)
    setError('')
    try {
      await verifyProof({ proofId: proof.id, verifierId: currentUser.id, verdict, reason })
      await refreshUser()
      await load()
    } catch (voteError) {
      setError(voteError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
      <p className="eyebrow text-red-400">SKEPTIC COURT</p>
      <h1 className="mt-3 text-4xl font-black">Judge the receipts.</h1>
      <p className="mt-2 text-zinc-400">
        Two peer votes decide a proof. Catch a fake and earn a +25 Skeptic Bounty.
      </p>
      {error && <div className="errorbox mt-5" role="alert">{error}</div>}

      {loading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {[1, 2, 3].map(index => <div key={index} className="h-80 animate-pulse rounded-xl bg-zinc-900" />)}
        </div>
      ) : proofs.length ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {proofs.map(proof => (
            <ProofCard key={proof.id} proof={proof} currentUser={currentUser} onVote={vote} busy={busy} />
          ))}
        </div>
      ) : !error ? (
        <p className="mt-8 rounded-xl border border-dashed border-zinc-700 p-12 text-center text-zinc-500">
          The court is clear. No pending receipts.
        </p>
      ) : null}
    </main>
  )
}
