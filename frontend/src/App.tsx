import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import AboutPage from './pages/AboutPage'
import DebriefPage from './pages/DebriefPage'
import DojoPage from './pages/DojoPage'
import ProgressPage from './pages/ProgressPage'
import SetupPage from './pages/SetupPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<SetupPage />} />
        <Route path="dojo" element={<DojoPage />} />
        <Route path="debrief/:sessionId" element={<DebriefPage />} />
        <Route path="progress" element={<ProgressPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}