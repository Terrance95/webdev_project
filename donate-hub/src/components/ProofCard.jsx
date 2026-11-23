import { Check, Flag } from 'lucide-react'
import { useUser } from '../context/UserContext'

export default function ProofCard({ proof, currentUser, onVote, busy }) {
  const { setArenaPromptOpen } = useUser()
  const isOwnProof = currentUser?.id === proof.profile_id
  const statusClass = proof.status === 'verified'
    ? 'pill-green'
    : proof.status === 'rejected'
      ? 'pill-red'
      : 'pill-amber'

  return (
    <article className="overflow-hidden rounded-xl border border-zinc-800 bg-[#0d0f14]">
      <img
        src={proof.image_url}
        alt={proof.caption || 'Submitted proof'}
        loading="lazy"
        className="aspect-[16/10] w-full bg-zinc-900 object-cover"
      />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-bold">{proof.profile?.username || 'Arena player'}</p>
            <p className="text-xs text-zinc-500">
              {proof.challenge_title && <>{proof.challenge_title} · </>}
              Day {proof.day_number}
            </p>
          </div>
          <span className={`pill shrink-0 ${statusClass}`}>{proof.status}</span>
        </div>

        <p className="mt-2 break-words text-sm text-zinc-400">{proof.caption}</p>
        <p className="mt-3 text-xs text-zinc-500">
          {proof.approvals_count || 0} approvals · {proof.flags_count || 0} flags
          {proof.created_at && <> · {new Date(proof.created_at).toLocaleString()}</>}
        </p>

        {proof.status === 'pending' && (
          <div className="mt-3 flex flex-wrap gap-2">
            {isOwnProof ? (
              <p className="text-xs text-zinc-500" role="note">You can’t verify your own receipt.</p>
            ) : currentUser ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onVote(proof, 'approve')}
                  className="button-secondary flex-1 text-emerald-300"
                >
                  <Check className="mr-1 inline size-4" />
                  {busy ? 'Saving…' : 'Approve'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onVote(proof, 'flag')}
                  className="button-secondary flex-1 text-red-300"
                >
                  <Flag className="mr-1 inline size-4" />
                  {busy ? 'Saving…' : 'Flag +25'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setArenaPromptOpen(true)}
                className="button-secondary w-full"
              >
                Enter the Arena to verify
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
