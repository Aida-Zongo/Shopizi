import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  // Login and Register pages now handle their own full-screen layout.
  return <Outlet />
}
