import { BrowserRouter, Routes, Route } from "react-router-dom"
import NavBar from "./components/NavBar"
import HomePage from "./pages/HomePage"
import PlanPage from "./pages/PlanPage"
import TimelinePage from "./pages/TimelinePage"
import ProfilePage from "./pages/ProfilePage"
import UploadScanPage from "./pages/UploadScanPage"
import LoadingPage from "./pages/LoadingPage"
import ResultsPage from "./pages/ResultsPage"
import ComparisonPage from "./pages/ComparisonPage"
import SubscriptionPage from "./pages/SubscriptionPage"

function Layout({ children }) {
  return (
    <div className="flex">
      <NavBar />
      <main className="w-full md:ml-52 pb-20 md:pb-0 min-h-screen">
        {children}
      </main>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout><HomePage /></Layout>} />
        <Route path="/plan" element={<Layout><PlanPage /></Layout>} />
        <Route path="/timeline" element={<Layout><TimelinePage /></Layout>} />
        <Route path="/profile" element={<Layout><ProfilePage /></Layout>} />
        <Route path="/upload" element={<Layout><UploadScanPage /></Layout>} />
        <Route path="/upload/loading" element={<Layout><LoadingPage /></Layout>} />
        <Route path="/upload/results" element={<Layout><ResultsPage /></Layout>} />
        <Route path="/upload/comparison" element={<Layout><ComparisonPage /></Layout>} />
        <Route path="/profile/subscription" element={<Layout><SubscriptionPage /></Layout>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App