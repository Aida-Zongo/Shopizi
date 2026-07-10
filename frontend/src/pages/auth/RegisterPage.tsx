import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import { useAuthStore } from '../../store/authStore'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    password: '',
    confirmPassword: '',
    role: 'customer' as 'merchant' | 'driver' | 'customer',
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    setIsLoading(true)
    try {
      // Clean phone: strip spaces and dashes, then add +226 prefix if missing
      let cleanPhone = form.phone_number.replace(/\s/g, '').replace(/-/g, '')
      if (!cleanPhone.startsWith('+')) {
        cleanPhone = '+226' + cleanPhone
      }

      const res = await api.post('/auth/register', {
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone_number: cleanPhone,
        password: form.password,
        role: form.role,
      })
      if (res.data?.success && res.data.data) {
        const { accessToken, refreshToken, user } = res.data.data
        setAuth(user, accessToken, refreshToken)
        navigate('/', { replace: true })
      } else {
        setError('Réponse inattendue du serveur.')
      }
    } catch (err: any) {
      // Handle Zod validation errors (422) with detailed field messages
      const errData = err.response?.data?.error
      if (Array.isArray(errData)) {
        setError(errData.map((e: any) => e.message).join(' • '))
      } else {
        setError(errData?.message || errData || "Erreur lors de l'inscription")
      }
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-bg font-body-md text-text-primary overflow-x-hidden">
      {/* Left Side: Immersive Visual & Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 h-auto min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #0A504A 0%, #00A86B 60%, #A2E4B8 100%)' }}>
        {/* Motif géométrique — losanges plats façon bogolan */}
        <div className="absolute inset-0 kente-lattice" />

        {/* Logo */}
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="bg-white rounded-2xl px-6 py-4 mb-6 shadow-sm">
            <img
              src="/logo-shopizi.png"
              alt="Shopizi"
              className="h-16 object-contain"
            />
          </div>

          <p className="text-accent-mint font-semibold text-lg mb-2">
            shopizi.bf
          </p>
          <p className="text-bg/70 text-base mb-12 max-w-xs">
            Le commerce digital du Burkina Faso
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 w-full max-w-sm">
            <div className="text-center">
              <p className="font-display text-2xl font-semibold text-accent-mint">2.5K+</p>
              <p className="text-bg/60 text-xs mt-1">Marchands</p>
            </div>
            <div className="text-center border-x border-bg/15">
              <p className="font-display text-2xl font-semibold text-accent-mint">10K+</p>
              <p className="text-bg/60 text-xs mt-1">Produits</p>
            </div>
            <div className="text-center">
              <p className="font-display text-2xl font-semibold text-accent-mint">21M+</p>
              <p className="text-bg/60 text-xs mt-1">Burkinabè</p>
            </div>
          </div>

          {/* Témoignage */}
          <div className="mt-12 p-5 bg-bg/8 border-l-4 border-accent-mint rounded-3xl max-w-xs text-left">
            <p className="text-bg/85 text-sm italic">
              "Shopizi a transformé mon commerce. Je reçois des commandes de tout Ouagadougou !"
            </p>
            <p className="text-accent-mint text-xs font-bold mt-2">
              — Kadi O., Marchande de mode
            </p>
          </div>
        </div>
      </div>

      {/* Right Side: Registration Form */}
      <main className="w-full lg:w-1/2 min-h-screen flex flex-col justify-center bg-bg relative p-6 md:p-xl lg:p-24">
        <div className="w-full max-w-md mx-auto">
          <header className="mb-lg">
            <h2 className="font-display text-3xl font-semibold text-text-primary mb-xs">Créer votre compte</h2>
            <p className="text-body-md font-body-md text-text-secondary">Commencez votre voyage entrepreneurial dès aujourd'hui.</p>
          </header>

          {error && (
            <div className="p-3 mb-md bg-error-container border border-error/20 rounded-2xl text-error text-sm">
              {error}
            </div>
          )}

          <form className="space-y-md" onSubmit={handleSubmit}>
            {/* Role selector */}
            <div>
              <label className="block text-label-lg font-label-lg text-text-primary mb-2">Je suis un...</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, role: 'customer' })}
                  className={`px-2 sm:px-4 py-3 rounded-2xl border-2 text-xs sm:text-sm font-medium transition-all ${
                    form.role === 'customer'
                      ? 'border-accent-forest bg-accent-forest/8 text-accent-forest'
                      : 'border-text-secondary/20 bg-white text-text-secondary hover:border-text-secondary/40'
                  }`}
                >
                  <span className="material-symbols-outlined text-[24px] mb-1">shopping_cart</span>
                  Client
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, role: 'merchant' })}
                  className={`px-2 sm:px-4 py-3 rounded-2xl border-2 text-xs sm:text-sm font-medium transition-all ${
                    form.role === 'merchant'
                      ? 'border-accent-forest bg-accent-forest/8 text-accent-forest'
                      : 'border-text-secondary/20 bg-white text-text-secondary hover:border-text-secondary/40'
                  }`}
                >
                  <span className="material-symbols-outlined text-[24px] mb-1">storefront</span>
                  Commerçant
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, role: 'driver' })}
                  className={`px-2 sm:px-4 py-3 rounded-2xl border-2 text-xs sm:text-sm font-medium transition-all ${
                    form.role === 'driver'
                      ? 'border-accent-forest bg-accent-forest/8 text-accent-forest'
                      : 'border-text-secondary/20 bg-white text-text-secondary hover:border-text-secondary/40'
                  }`}
                >
                  <span className="material-symbols-outlined text-[24px] mb-1">local_shipping</span>
                  Livreur
                </button>
              </div>
            </div>

            {/* Nom Complet */}
            <div className="space-y-2">
              <label className="block text-label-lg font-label-lg text-text-primary" htmlFor="full_name">Nom Complet</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">person</span>
                <input
                  className="w-full pl-12 pr-4 py-3 bg-white border border-text-secondary/20 rounded-2xl text-body-md font-body-md focus:outline-none focus:ring-2 focus:ring-accent-forest/25 focus:border-accent-forest transition-all"
                  id="full_name" name="full_name" type="text"
                  placeholder="Ex: Moussa Traoré"
                  value={form.full_name}
                  onChange={e => setForm({ ...form, full_name: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="block text-label-lg font-label-lg text-text-primary" htmlFor="email">Email Professionnel</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">mail</span>
                <input
                  className="w-full pl-12 pr-4 py-3 bg-white border border-text-secondary/20 rounded-2xl text-body-md font-body-md focus:outline-none focus:ring-2 focus:ring-accent-forest/25 focus:border-accent-forest transition-all"
                  id="email" name="email" type="email"
                  placeholder="moussa@boutique.bf"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Téléphone */}
            <div className="space-y-2">
              <label className="block text-label-lg font-label-lg text-text-primary" htmlFor="phone">Numéro de Téléphone</label>
              <div className="relative flex">
                <div className="flex items-center px-4 bg-bg-dark/5 border border-text-secondary/20 rounded-l-2xl border-r-0 text-label-lg font-label-lg text-text-primary whitespace-nowrap">
                  🇧🇫 +226
                </div>
                <input
                  className="w-full px-4 py-3 bg-white border border-text-secondary/20 rounded-r-2xl text-body-md font-body-md focus:outline-none focus:ring-2 focus:ring-accent-forest/25 focus:border-accent-forest transition-all"
                  id="phone" name="phone" type="tel"
                  placeholder="Ex: 70123456"
                  value={form.phone_number}
                  onChange={e => setForm({ ...form, phone_number: e.target.value.replace(/[^0-9]/g, '') })}
                  maxLength={8}
                  required
                />
              </div>
              <p className="text-xs text-text-secondary pl-1">Entrez vos 8 chiffres sans l'indicatif +226</p>
            </div>

            {/* Mot de passe */}
            <div className="space-y-2">
              <label className="block text-label-lg font-label-lg text-text-primary" htmlFor="password">Mot de passe</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">lock</span>
                <input
                  className="w-full pl-12 pr-12 py-3 bg-white border border-text-secondary/20 rounded-2xl text-body-md font-body-md focus:outline-none focus:ring-2 focus:ring-accent-forest/25 focus:border-accent-forest transition-all"
                  id="password" name="password" type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-accent-forest transition-colors"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              <p className="text-[11px] text-text-secondary mt-1 px-1">Le mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre.</p>
            </div>

            {/* Confirmer mot de passe */}
            <div className="space-y-2">
              <label className="block text-label-lg font-label-lg text-text-primary" htmlFor="confirmPassword">Confirmer le mot de passe</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">lock</span>
                <input
                  className="w-full pl-12 pr-4 py-3 bg-white border border-text-secondary/20 rounded-2xl text-body-md font-body-md focus:outline-none focus:ring-2 focus:ring-accent-forest/25 focus:border-accent-forest transition-all"
                  id="confirmPassword" name="confirmPassword" type="password"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start gap-3 py-2">
              <div className="flex items-center h-5">
                <input className="w-4 h-4 rounded accent-accent-mint" id="terms" name="terms" type="checkbox" required />
              </div>
              <label className="text-label-sm font-label-sm text-text-secondary leading-relaxed" htmlFor="terms">
                J'accepte les <a className="text-accent-emerald font-bold underline hover:no-underline" href="#">conditions d'utilisation</a> et la <a className="text-accent-emerald font-bold underline hover:no-underline" href="#">politique de confidentialité</a> de Shopizi.
              </label>
            </div>

            {/* Submit Button */}
            <button className="w-full bg-accent-gold hover:bg-accent-gold/90 text-white py-4 px-6 rounded-2xl font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all duration-200 disabled:opacity-50" type="submit" disabled={isLoading}>
              {isLoading ? 'Création en cours...' : 'Créer mon compte'}
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </form>

          <div className="mt-lg flex flex-col items-center gap-md">
            <p className="text-body-md font-body-md text-text-secondary mt-md">
              Déjà inscrit ?{' '}
              <Link className="text-accent-emerald font-bold hover:underline" to="/login">Se connecter</Link>
            </p>
          </div>
        </div>
        {/* Footer Decoration (Mobile only) */}
        <div className="md:hidden mt-xl opacity-40 kente-lattice h-12 w-full"></div>
      </main>
    </div>
  )
}
