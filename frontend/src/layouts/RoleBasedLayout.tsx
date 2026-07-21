import { useAuthStore } from '../store/authStore'
import { DashboardLayout } from './DashboardLayout'
import { DriverLayout } from './DriverLayout'
import ShopiziLoader from '../components/ShopiziLoader';

export function RoleBasedLayout() {
  const { user, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ShopiziLoader />
      </div>
    )
  }

  if (user?.role === 'driver') {
    return <DriverLayout />
  }

  return <DashboardLayout />
}
