import { useAuthStore } from '../store/authStore'
import { DashboardLayout } from './DashboardLayout'
import { DriverLayout } from './DriverLayout'

export function RoleBasedLayout() {
  const { user, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-burkina-green-deep border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (user?.role === 'driver') {
    return <DriverLayout />
  }

  return <DashboardLayout />
}
