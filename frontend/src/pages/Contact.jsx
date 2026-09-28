import { useState } from 'react'
import { api } from '../lib/api.js'

const initialForm = { name: '', email: '', subject: '', message: '' }

export default function Contact() {
  const [form, setForm] = useState(initialForm)
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState('')

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg('')
    try {
      await api.sendContact(form)
      setStatus('sent')
      setForm(initialForm)
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.message)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl sm:text-4xl font-bold">Contact</h1>
      <p className="mt-4 text-gray-600">
        Une question sur les inscriptions, les entraînements ou le club ? Écrivez-nous.
      </p>

      {status === 'sent' ? (
        <div className="mt-8 rounded-lg border border-green-200 bg-green-50 text-green-700 px-4 py-6 text-center">
          Merci, votre message a bien été envoyé !
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-gray-700">
              Nom
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={form.name}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-club-red"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-club-red"
            />
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-semibold text-gray-700">
              Sujet
            </label>
            <input
              id="subject"
              name="subject"
              type="text"
              value={form.subject}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-club-red"
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-semibold text-gray-700">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              rows={5}
              required
              value={form.message}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-club-red"
            />
          </div>

          {status === 'error' && (
            <p className="text-sm text-red-600">{errorMsg || "Une erreur est survenue."}</p>
          )}

          <button
            type="submit"
            disabled={status === 'sending'}
            className="rounded-md bg-club-red px-6 py-3 font-semibold text-white hover:bg-club-red-dark transition-colors disabled:opacity-60"
          >
            {status === 'sending' ? 'Envoi…' : 'Envoyer'}
          </button>
        </form>
      )}
    </div>
  )
}
