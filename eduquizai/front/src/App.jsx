import { Fragment, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import PageConnexion from './pages/PageConnexion'
import PageDashboard from './pages/PageDashboard'
import PageCreationCours from './pages/PageCreationCours'
import PageDetailCours from './pages/PageDetailCours'
import { sessionValide, surveillerSession } from './auth/session'

function RouteProtegee({ enfant }) {
  const [jeton, setJeton] = useState(() => sessionValide() ? localStorage.getItem('jeton') : null)
  useEffect(() => surveillerSession(setJeton), [])
  // Un changement de compte dans un autre onglet recharge les données affichées.
  return jeton ? <Fragment key={jeton}>{enfant}</Fragment> : <Navigate to="/" replace state={{ sessionExpiree: true }} />
}
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PageConnexion />} />
        <Route path="/dashboard" element={<RouteProtegee enfant={<PageDashboard />} />} />
        <Route path="/cours/nouveau" element={<RouteProtegee enfant={<PageCreationCours />} />} />
        <Route path="/cours/:id" element={<RouteProtegee enfant={<PageDetailCours />} />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
export default App
