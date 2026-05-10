import { AppProvider } from './contexts'
import { AppShell } from './AppShell'

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  )
}



