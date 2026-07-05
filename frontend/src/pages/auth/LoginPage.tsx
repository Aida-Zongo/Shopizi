import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import { useAuthStore } from '../../store/authStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    console.log('[Login] Submitting login form...', form.email)

    try {
      const res = await api.post('/auth/login', form)
      console.log('[Login] API response status:', res.status)
      console.log('[Login] API response data:', res.data)

      if (res.data?.success && res.data.data) {
        const { accessToken, refreshToken, user } = res.data.data
        setAuth(user, accessToken, refreshToken)
        const destination = user.role === 'admin' ? '/admin' : '/'
        console.log('[Login] Auth set, navigating to', destination)
        navigate(destination, { replace: true })
      } else {
        console.error('[Login] Unexpected response shape:', res.data)
        setError('Réponse inattendue du serveur. Consultez la console (F12).')
      }
    } catch (err: any) {
      console.error('[Login] API error:', err)
      if (err.response) {
        setError(err.response.data?.error?.message || 'Erreur de connexion au serveur')
      } else if (err.request) {
        setError('Le serveur ne répond pas. Assurez-vous que le backend est démarré sur le port 3000.')
      } else {
        setError('Erreur lors de la connexion')
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

      {/* Right Side: Login Form */}
      <main className="w-full lg:w-1/2 min-h-screen flex flex-col justify-center bg-bg relative p-6 md:p-xl lg:p-24">
        <div className="w-full max-w-md mx-auto">
          <header className="mb-lg">
            <h2 className="font-display text-3xl font-semibold text-text-primary mb-xs">Se connecter</h2>
            <p className="text-body-md font-body-md text-text-secondary">Renseignez vos identifiants pour accéder à votre espace.</p>
          </header>

          {error && (
            <div className="p-3 mb-md bg-error-container border border-error/20 rounded-2xl text-error text-sm">
              {error}
            </div>
          )}

          <form className="space-y-md" onSubmit={handleSubmit}>
            {/* Email */}
            <div className="space-y-2">
              <label className="block text-label-lg font-label-lg text-text-primary" htmlFor="email">Email</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">mail</span>
                <input
                  className="w-full pl-12 pr-4 py-3 bg-white border border-text-secondary/20 rounded-2xl text-body-md font-body-md focus:outline-none focus:ring-2 focus:ring-accent-forest/25 focus:border-accent-forest transition-all"
                  id="email" name="email" type="email"
                  placeholder="votre@email.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-label-lg font-label-lg text-text-primary" htmlFor="password">Mot de passe</label>
                <a href="#" className="text-label-sm font-label-sm text-accent-emerald hover:underline">Mot de passe oublié ?</a>
              </div>
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
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center gap-3 py-2">
              <input
                className="w-4 h-4 rounded accent-accent-mint"
                id="remember" name="remember" type="checkbox"
              />
              <label className="text-label-sm font-label-sm text-text-secondary cursor-pointer" htmlFor="remember">
                Se souvenir de moi
              </label>
            </div>

            {/* Submit Button */}
            <button className="w-full bg-accent-emerald hover:bg-accent-emerald/90 text-white py-4 px-6 rounded-2xl font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all duration-200 disabled:opacity-50" type="submit" disabled={isLoading}>
              {isLoading ? 'Connexion en cours...' : 'Se connecter'}
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </form>

          <div className="mt-lg flex flex-col items-center gap-md">
            <p className="text-body-md font-body-md text-text-secondary mt-md">
              Pas encore inscrit ?{' '}
              <Link className="text-accent-emerald font-bold hover:underline" to="/register">S'inscrire</Link>
            </p>
          </div>
        </div>
        {/* Footer Decoration (Mobile only) */}
        <div className="md:hidden mt-xl opacity-40 kente-lattice h-12 w-full"></div>
      </main>
    </div>
  )
}
