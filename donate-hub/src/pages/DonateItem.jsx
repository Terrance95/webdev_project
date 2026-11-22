import { ImagePlus, LoaderCircle, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createItem, uploadItemImage } from '../services/itemService'

const initial = { title: '', category: '', condition: '', location: '', description: '', donor_name: '', donor_contact: '' }
const required = [['title', 'Item title'], ['category', 'Category'], ['condition', 'Condition'], ['location', 'Location'], ['description', 'Description'], ['donor_name', 'Your name'], ['donor_contact', 'Phone, WhatsApp, or email']]

function Field({ name, label, error, children }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-700">{label}</span>{children}{error && <span className="mt-1 block text-xs font-medium text-rose-600">{error}</span>}</label>
}
const fieldClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'

export default function DonateItem() {
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  const choose = (event) => {
    const selected = event.target.files?.[0]
    if (!selected) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) { setErrors((current) => ({ ...current, image: 'Choose a JPG, PNG, or WEBP image.' })); return }
    if (selected.size > 5 * 1024 * 1024) { setErrors((current) => ({ ...current, image: 'Image must be 5 MB or smaller.' })); return }
    if (preview) URL.revokeObjectURL(preview)
    setFile(selected); setPreview(URL.createObjectURL(selected)); setErrors((current) => ({ ...current, image: undefined }))
  }
  const removeImage = () => { if (preview) URL.revokeObjectURL(preview); setPreview(''); setFile(null) }
  const submit = async (event) => {
    event.preventDefault()
    const next = {}
    required.forEach(([key, label]) => { if (!form[key].trim()) next[key] = `${label} is required.` })
    setErrors(next); if (Object.keys(next).length) return
    setSaving(true); setSubmitError('')
    try { const image_url = file ? await uploadItemImage(file) : null; const item = await createItem({ ...form, image_url, status: 'available' }); navigate(`/item/${item.id}`) } catch (error) { setSubmitError(error.message) } finally { setSaving(false) }
  }
  return <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6"><div className="mb-8"><p className="text-sm font-bold uppercase tracking-widest text-emerald-700">Share generously</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Post a donation</h1><p className="mt-2 text-slate-600">Give someone nearby a chance to make good use of your item.</p></div><form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"><div className="grid gap-5 sm:grid-cols-2"><Field name="title" label="Item title" error={errors.title}><input name="title" value={form.title} onChange={change} className={fieldClass} placeholder="e.g. Study desk"/></Field><Field name="category" label="Category" error={errors.category}><select name="category" value={form.category} onChange={change} className={fieldClass}><option value="">Select category</option>{['Clothes', 'Furniture', 'Textbooks', 'Laptops'].map((x) => <option key={x}>{x}</option>)}</select></Field><Field name="condition" label="Condition" error={errors.condition}><select name="condition" value={form.condition} onChange={change} className={fieldClass}><option value="">Select condition</option>{['New', 'Like New', 'Good', 'Fair'].map((x) => <option key={x}>{x}</option>)}</select></Field><Field name="location" label="Location" error={errors.location}><input name="location" value={form.location} onChange={change} className={fieldClass} placeholder="Neighborhood or city"/></Field></div><div className="mt-5"><Field name="description" label="Description" error={errors.description}><textarea name="description" rows="4" value={form.description} onChange={change} className={`${fieldClass} resize-y`} placeholder="Describe the item, its size, and anything helpful for the recipient."/></Field></div><div className="mt-5 grid gap-5 sm:grid-cols-2"><Field name="donor_name" label="Your name" error={errors.donor_name}><input name="donor_name" value={form.donor_name} onChange={change} className={fieldClass}/></Field><Field name="donor_contact" label="Phone, WhatsApp, or email" error={errors.donor_contact}><input name="donor_contact" value={form.donor_contact} onChange={change} className={fieldClass}/></Field></div><div className="mt-6"><span className="mb-1.5 block text-sm font-bold text-slate-700">Photo <em className="font-normal text-slate-500">(optional)</em></span>{preview ? <div className="relative w-fit"><img src={preview} alt="Selected item preview" className="h-40 w-56 rounded-xl object-cover"/><button type="button" onClick={removeImage} className="absolute -right-2 -top-2 rounded-full bg-slate-800 p-1 text-white" aria-label="Remove image"><X size={16}/></button></div> : <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-8 text-sm font-semibold text-slate-600 hover:border-emerald-400 hover:bg-emerald-50"><ImagePlus size={22}/><span>Upload JPG, PNG, or WEBP (max 5 MB)</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={choose} className="sr-only"/></label>}{errors.image && <span className="mt-1 block text-xs font-medium text-rose-600">{errors.image}</span>}</div>{submitError && <p className="mt-5 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{submitError}</p>}<button disabled={saving} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-3 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">{saving && <LoaderCircle className="animate-spin" size={19}/>} {saving ? 'Posting donation…' : 'Post donation'}</button></form></main>
}
