const avatarColors = ['#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899']
const categories = ['Coding', 'Fitness', 'Study', 'Habit', 'Other']
const durations = [3, 7, 14, 30]
const imageTypes = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
const imageLimit = 5 * 1024 * 1024
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function getSupabase() {
  const { hasSupabaseConfig, supabase } = await import('../lib/supabaseClient.js')
  if (!hasSupabaseConfig) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and a VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY.')
  }
  return supabase
}

function throwIfError(error) {
  if (error) throw new Error(error.message)
}

function createInviteCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return [...bytes].map(value => alphabet[value % alphabet.length]).join('')
}

function validateImage(file) {
  if (!file || !imageTypes[file.type]) {
    throw new Error('Choose a JPG, PNG, or WEBP image.')
  }
  if (file.size > imageLimit) {
    throw new Error('Image must be 5MB or smaller.')
  }
}

export async function getProfile(id) {
  const supabase = await getSupabase()
  const { data, error } = await supabase.from('ps_profiles').select('*').eq('id', id).maybeSingle()
  throwIfError(error)
  return data
}

export async function getOrCreateProfile(rawUsername) {
  const supabase = await getSupabase()
  const username = rawUsername.trim().replace(/\s+/g, ' ')
  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
    throw new Error('Username must be 3–24 characters using letters, numbers, or underscores.')
  }

  const normalizedUsername = username.toLowerCase()
  const { data: existing, error: lookupError } = await supabase
    .from('ps_profiles')
    .select('*')
    .ilike('username', normalizedUsername.replace(/[\\%_]/g, '\\$&'))
    .maybeSingle()
  throwIfError(lookupError)
  if (existing) return existing

  const { data, error } = await supabase
    .from('ps_profiles')
    .insert({
      username: normalizedUsername,
      avatar_color: avatarColors[Math.floor(Math.random() * avatarColors.length)],
      stakes_balance: 500,
    })
    .select('*')
    .single()
  throwIfError(error)
  return data
}

export async function getChallenges({ category = 'All', mode = 'All', search = '' } = {}) {
  const supabase = await getSupabase()
  let query = supabase
    .from('ps_challenges')
    .select('*')
    .order('pot_total', { ascending: false })
    .order('created_at', { ascending: false })

  if (category !== 'All') query = query.eq('category', category)
  if (mode !== 'All') query = query.eq('mode', mode === 'Group Pot' ? 'group' : 'duel')

  const { data: challenges, error } = await query
  throwIfError(error)

  const searchTerm = search.trim().toLocaleLowerCase()
  const filtered = searchTerm
    ? challenges.filter(challenge =>
      `${challenge.title} ${challenge.description}`.toLocaleLowerCase().includes(searchTerm))
    : challenges
  const ids = filtered.map(challenge => challenge.id)
  const creatorIds = [...new Set(filtered.map(challenge => challenge.creator_id))]
  const [participantsResult, creatorsResult] = await Promise.all([
    ids.length
      ? supabase.from('ps_participants').select('challenge_id').in('challenge_id', ids)
      : { data: [], error: null },
    creatorIds.length
      ? supabase.from('ps_profiles').select('id,username').in('id', creatorIds)
      : { data: [], error: null },
  ])
  throwIfError(participantsResult.error)
  throwIfError(creatorsResult.error)

  const counts = {}
  for (const participant of participantsResult.data) {
    counts[participant.challenge_id] = (counts[participant.challenge_id] || 0) + 1
  }
  const creators = Object.fromEntries(creatorsResult.data.map(profile => [profile.id, profile.username]))
  return filtered.map(challenge => ({
    ...challenge,
    participant_count: counts[challenge.id] || 0,
    creator_username: creators[challenge.creator_id] || 'Arena player',
  }))
}

export async function getArenaStats() {
  const supabase = await getSupabase()
  const { data: challenges, error } = await supabase
    .from('ps_challenges')
    .select('id,pot_total')
    .eq('status', 'active')
  throwIfError(error)

  const activeIds = challenges.map(challenge => challenge.id)
  const [participantsResult, proofsResult] = await Promise.all([
    activeIds.length
      ? supabase.from('ps_participants').select('id').in('challenge_id', activeIds).eq('status', 'active')
      : { data: [], error: null },
    supabase.from('ps_proofs').select('id', { count: 'exact', head: true }).eq('status', 'verified'),
  ])
  throwIfError(participantsResult.error)
  throwIfError(proofsResult.error)

  return {
    activePot: challenges.reduce((sum, challenge) => sum + Number(challenge.pot_total), 0),
    activeChallengers: participantsResult.data.length,
    verifiedReceipts: proofsResult.count || 0,
  }
}

export async function createChallenge(payload, profile) {
  const supabase = await getSupabase()
  const title = payload.title?.trim()
  const description = payload.description?.trim()
  const entryStake = Number(payload.entry_stake)
  const durationDays = Number(payload.duration_days)

  if (!title || !description) throw new Error('Title and description are required.')
  if (!categories.includes(payload.category)) throw new Error('Choose a valid category.')
  if (!['group', 'duel'].includes(payload.mode)) throw new Error('Choose a valid arena mode.')
  if (!durations.includes(durationDays)) throw new Error('Choose a valid challenge duration.')
  if (!Number.isSafeInteger(entryStake) || entryStake < 1) throw new Error('Enter a whole-number stake greater than zero.')
  if (Number(profile.stakes_balance) < entryStake) throw new Error('Not enough Stakes to lock this pot.')

  const { data: updatedProfile, error: balanceError } = await supabase
    .from('ps_profiles')
    .update({ stakes_balance: Number(profile.stakes_balance) - entryStake })
    .eq('id', profile.id)
    .gte('stakes_balance', entryStake)
    .select('id')
    .maybeSingle()
  if (balanceError || !updatedProfile) {
    throw new Error(balanceError?.message || 'Not enough Stakes to lock this pot. Refresh your balance and try again.')
  }

  const { data: challenge, error: createError } = await supabase
    .from('ps_challenges')
    .insert({
      title,
      description,
      category: payload.category,
      mode: payload.mode,
      duration_days: durationDays,
      entry_stake: entryStake,
      pot_total: entryStake,
      creator_id: profile.id,
      invite_code: createInviteCode(),
      status: 'active',
    })
    .select('*')
    .single()
  if (createError) {
    const { error: refundError } = await supabase.from('ps_profiles')
      .update({ stakes_balance: Number(profile.stakes_balance) })
      .eq('id', profile.id)
    throw new Error([createError.message, refundError?.message].filter(Boolean).join(' '))
  }

  const { error: participantError } = await supabase.from('ps_participants').insert({
    challenge_id: challenge.id,
    profile_id: profile.id,
    current_streak: 0,
    status: 'active',
  })
  if (participantError) {
    const { error: refundError } = await supabase
      .from('ps_profiles')
      .update({ stakes_balance: Number(profile.stakes_balance) })
      .eq('id', profile.id)
    const { error: closeError } = await supabase.from('ps_challenges')
      .update({ status: 'completed' })
      .eq('id', challenge.id)
    throw new Error([participantError.message, refundError?.message, closeError?.message].filter(Boolean).join(' '))
  }
  return challenge
}

export async function joinChallenge(challengeId, profile) {
  const supabase = await getSupabase()
  const { data: challenge, error } = await supabase.from('ps_challenges').select('*').eq('id', challengeId).single()
  throwIfError(error)
  if (challenge.status !== 'active') throw new Error('This challenge is no longer open.')

  const { data: existing, error: participantLookupError } = await supabase
    .from('ps_participants')
    .select('id')
    .eq('challenge_id', challengeId)
    .eq('profile_id', profile.id)
    .maybeSingle()
  throwIfError(participantLookupError)
  if (existing) throw new Error("You're already in this challenge.")

  const { data: participants, error: participantsError } = await supabase
    .from('ps_participants')
    .select('id')
    .eq('challenge_id', challengeId)
  throwIfError(participantsError)
  if (challenge.mode === 'duel' && participants.length >= 2) {
    throw new Error('This duel already has two players.')
  }

  const stake = Number(challenge.entry_stake)
  if (Number(profile.stakes_balance) < stake) throw new Error('Not enough Stakes to join.')
  const { data: updatedProfile, error: balanceError } = await supabase
    .from('ps_profiles')
    .update({ stakes_balance: Number(profile.stakes_balance) - stake })
    .eq('id', profile.id)
    .gte('stakes_balance', stake)
    .select('id')
    .maybeSingle()
  throwIfError(balanceError)
  if (!updatedProfile) throw new Error('Not enough Stakes to join. Refresh your balance and try again.')

  const { error: participantError } = await supabase.from('ps_participants').insert({
    challenge_id: challengeId,
    profile_id: profile.id,
    current_streak: 0,
    status: 'active',
  })
  if (participantError) {
    const { error: refundError } = await supabase
      .from('ps_profiles')
      .update({ stakes_balance: Number(profile.stakes_balance) })
      .eq('id', profile.id)
    throw new Error([participantError.message, refundError?.message].filter(Boolean).join(' '))
  }

  const { data: updatedChallenge, error: potError } = await supabase
    .from('ps_challenges')
    .update({ pot_total: Number(challenge.pot_total) + stake })
    .eq('id', challengeId)
    .eq('status', 'active')
    .select('id')
    .maybeSingle()
  if (potError || !updatedChallenge) {
    const { error: participantRollbackError } = await supabase.from('ps_participants')
      .update({ status: 'eliminated' })
      .eq('challenge_id', challengeId)
      .eq('profile_id', profile.id)
    const { error: refundError } = await supabase
      .from('ps_profiles')
      .update({ stakes_balance: Number(profile.stakes_balance) })
      .eq('id', profile.id)
    throw new Error([
      potError?.message || 'This challenge is no longer open.',
      participantRollbackError?.message,
      refundError?.message,
    ].filter(Boolean).join(' '))
  }
  return challenge
}

export async function joinByInviteCode(rawCode, profile) {
  const supabase = await getSupabase()
  const code = rawCode.trim().toUpperCase()
  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) throw new Error('Enter a valid 6-character invite code.')

  const { data: challenge, error } = await supabase
    .from('ps_challenges')
    .select('*')
    .eq('invite_code', code)
    .maybeSingle()
  throwIfError(error)
  if (!challenge) throw new Error('No arena found for that code.')

  const { data: participant, error: participantError } = await supabase
    .from('ps_participants')
    .select('id')
    .eq('challenge_id', challenge.id)
    .eq('profile_id', profile.id)
    .maybeSingle()
  throwIfError(participantError)
  if (!participant) await joinChallenge(challenge.id, profile)
  return challenge
}

export async function getChallengeDetails(id) {
  const supabase = await getSupabase()
  if (!uuidPattern.test(id || '')) return null

  const { data: challenge, error } = await supabase.from('ps_challenges').select('*').eq('id', id).maybeSingle()
  throwIfError(error)
  if (!challenge) return null

  const [participantsResult, proofsResult] = await Promise.all([
    supabase.from('ps_participants').select('*').eq('challenge_id', id),
    supabase.from('ps_proofs').select('*').eq('challenge_id', id).order('created_at', { ascending: false }),
  ])
  throwIfError(participantsResult.error)
  throwIfError(proofsResult.error)
  const participants = participantsResult.data
  const proofs = proofsResult.data
  const profileIds = [...new Set([
    ...participants.map(participant => participant.profile_id),
    ...proofs.map(proof => proof.profile_id),
    challenge.creator_id,
  ])]
  const { data: profiles, error: profilesError } = profileIds.length
    ? await supabase.from('ps_profiles').select('*').in('id', profileIds)
    : { data: [], error: null }
  throwIfError(profilesError)
  const profileMap = Object.fromEntries(profiles.map(profile => [profile.id, profile]))

  return {
    challenge,
    participants: participants.map(participant => ({ ...participant, profile: profileMap[participant.profile_id] })),
    proofs: proofs.map(proof => ({ ...proof, profile: profileMap[proof.profile_id] })),
  }
}

async function uploadImage(file, supabase) {
  validateImage(file)
  const path = `${crypto.randomUUID()}.${imageTypes[file.type]}`
  const { error } = await supabase.storage.from('ps-proof-images').upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  throwIfError(error)
  const { data } = supabase.storage.from('ps-proof-images').getPublicUrl(path)
  return data.publicUrl
}

export async function uploadProofImage(file) {
  const supabase = await getSupabase()
  return uploadImage(file, supabase)
}

export async function submitProof({ challengeId, profileId, dayNumber, caption, file }) {
  const supabase = await getSupabase()
  const day = Number(dayNumber)
  if (!Number.isSafeInteger(day) || day < 1) throw new Error('Choose a valid challenge day.')
  if (!caption?.trim()) throw new Error('Add a caption to your receipt.')
  validateImage(file)

  const { data: challenge, error: challengeError } = await supabase
    .from('ps_challenges')
    .select('duration_days,status')
    .eq('id', challengeId)
    .single()
  throwIfError(challengeError)
  if (challenge.status !== 'active') throw new Error('This challenge is no longer active.')
  if (day > Number(challenge.duration_days)) throw new Error('The proof day cannot exceed the challenge duration.')

  const { data: participant, error: participantError } = await supabase
    .from('ps_participants')
    .select('id,current_streak,status')
    .eq('challenge_id', challengeId)
    .eq('profile_id', profileId)
    .maybeSingle()
  throwIfError(participantError)
  if (!participant || participant.status !== 'active') throw new Error('Only active participants can submit proof.')

  const { data: existingProof, error: proofLookupError } = await supabase
    .from('ps_proofs')
    .select('id')
    .eq('challenge_id', challengeId)
    .eq('profile_id', profileId)
    .eq('day_number', day)
    .maybeSingle()
  throwIfError(proofLookupError)
  if (existingProof) throw new Error('You already submitted proof for this challenge day.')

  const imageUrl = await uploadImage(file, supabase)
  const { data: proof, error } = await supabase.from('ps_proofs').insert({
    challenge_id: challengeId,
    profile_id: profileId,
    day_number: day,
    caption: caption.trim(),
    image_url: imageUrl,
    approvals_count: 0,
    flags_count: 0,
    status: 'pending',
  }).select('*').single()
  if (error) {
    throw new Error(`${error.message} The uploaded image could not be attached to a receipt.`)
  }

  const { error: streakError } = await supabase
    .from('ps_participants')
    .update({ current_streak: Number(participant.current_streak) + 1 })
    .eq('id', participant.id)
    .eq('status', 'active')
  if (streakError) {
    throw new Error(`Receipt saved, but the streak could not be updated: ${streakError.message}`)
  }
  return proof
}

export async function verifyProof({ proofId, verifierId, verdict, reason = '' }) {
  const supabase = await getSupabase()
  if (!['approve', 'flag'].includes(verdict)) throw new Error('Choose approve or flag.')

  const { data: proof, error } = await supabase.from('ps_proofs').select('*').eq('id', proofId).single()
  throwIfError(error)
  if (proof.profile_id === verifierId) throw new Error("You can't verify your own receipt.")
  if (proof.status !== 'pending') throw new Error('This receipt has already been decided.')
  if (verdict === 'flag' && !reason.trim()) throw new Error('Give a short reason for the flag.')
  if (verdict === 'flag' && reason.trim().length > 240) throw new Error('Flag reasons must be 240 characters or fewer.')

  const { data: existingVote, error: voteLookupError } = await supabase
    .from('ps_verifications')
    .select('id')
    .eq('proof_id', proofId)
    .eq('verifier_id', verifierId)
    .maybeSingle()
  throwIfError(voteLookupError)
  if (existingVote) throw new Error('You already voted on this receipt.')

  const { error: voteError } = await supabase
    .from('ps_verifications')
    .insert({ proof_id: proofId, verifier_id: verifierId, verdict, reason: reason.trim() })
  throwIfError(voteError)

  const counter = verdict === 'approve' ? 'approvals_count' : 'flags_count'
  const count = Number(proof[counter]) + 1
  const update = { [counter]: count }
  if (verdict === 'approve' && count >= 2) update.status = 'verified'
  if (verdict === 'flag' && count >= 2) update.status = 'rejected'

  const { error: updateError } = await supabase
    .from('ps_proofs')
    .update(update)
    .eq('id', proofId)
    .eq('status', 'pending')
  if (updateError) {
    throwIfError(updateError)
  }

  if (verdict === 'flag' && count >= 2) {
    const { error: eliminationError } = await supabase
      .from('ps_participants')
      .update({ status: 'eliminated' })
      .eq('challenge_id', proof.challenge_id)
      .eq('profile_id', proof.profile_id)
      .eq('status', 'active')
    throwIfError(eliminationError)

    const verifier = await getProfile(verifierId)
    const { error: bountyError } = await supabase.from('ps_profiles')
      .update({
        stakes_balance: Number(verifier.stakes_balance) + 25,
        bounties_earned: Number(verifier.bounties_earned) + 1,
      })
      .eq('id', verifierId)
    throwIfError(bountyError)
  }
}

export async function settleChallenge(challengeId) {
  const supabase = await getSupabase()
  const details = await getChallengeDetails(challengeId)
  if (!details) throw new Error('This challenge could not be found.')
  if (details.challenge.status !== 'active') throw new Error('This pot is already settled.')

  const survivors = details.participants.filter(participant => participant.status === 'active')
  if (!survivors.length) throw new Error('No active survivors to pay out.')
  const total = Number(details.challenge.pot_total)
  const share = Math.floor(total / survivors.length)
  const remainder = total % survivors.length

  for (const [index, participant] of survivors.entries()) {
    const winnings = share + (index < remainder ? 1 : 0)
    const { error: profileError } = await supabase.from('ps_profiles')
      .update({
        stakes_balance: Number(participant.profile.stakes_balance) + winnings,
        wins_count: Number(participant.profile.wins_count) + 1,
      })
      .eq('id', participant.profile_id)
    throwIfError(profileError)

    const { error: participantError } = await supabase.from('ps_participants')
      .update({ status: 'won' })
      .eq('id', participant.id)
      .eq('status', 'active')
    throwIfError(participantError)
  }

  const { error } = await supabase.from('ps_challenges')
    .update({ status: 'completed' })
    .eq('id', challengeId)
    .eq('status', 'active')
  throwIfError(error)
}

export async function getLeaderboard() {
  const supabase = await getSupabase()
  const { data, error } = await supabase.from('ps_profiles')
    .select('*')
    .order('stakes_balance', { ascending: false })
    .order('wins_count', { ascending: false })
    .order('bounties_earned', { ascending: false })
  throwIfError(error)
  return data
}

export async function getUserReceipts(profileId) {
  const supabase = await getSupabase()
  const { data: proofs, error } = await supabase.from('ps_proofs')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
  throwIfError(error)
  const challengeIds = [...new Set(proofs.map(proof => proof.challenge_id))]
  const { data: challenges, error: challengesError } = challengeIds.length
    ? await supabase.from('ps_challenges').select('id,title').in('id', challengeIds)
    : { data: [], error: null }
  throwIfError(challengesError)
  const titles = Object.fromEntries(challenges.map(challenge => [challenge.id, challenge.title]))
  return proofs.map(proof => ({ ...proof, challenge_title: titles[proof.challenge_id] || 'Challenge' }))
}

export async function getPendingProofs() {
  const supabase = await getSupabase()
  const { data: proofs, error } = await supabase.from('ps_proofs')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  throwIfError(error)

  const profileIds = [...new Set(proofs.map(proof => proof.profile_id))]
  const challengeIds = [...new Set(proofs.map(proof => proof.challenge_id))]
  const [profilesResult, challengesResult] = await Promise.all([
    profileIds.length
      ? supabase.from('ps_profiles').select('id,username,avatar_color').in('id', profileIds)
      : { data: [], error: null },
    challengeIds.length
      ? supabase.from('ps_challenges').select('id,title').in('id', challengeIds)
      : { data: [], error: null },
  ])
  throwIfError(profilesResult.error)
  throwIfError(challengesResult.error)
  const profiles = Object.fromEntries(profilesResult.data.map(profile => [profile.id, profile]))
  const titles = Object.fromEntries(challengesResult.data.map(challenge => [challenge.id, challenge.title]))
  return proofs.map(proof => ({
    ...proof,
    profile: profiles[proof.profile_id],
    challenge_title: titles[proof.challenge_id] || 'Challenge',
  }))
}
