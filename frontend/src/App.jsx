import { BrowserRouter, Routes, Route } from "react-router-dom"
import { UserProvider } from "./context/UserContext"
import NavBar from "./components/NavBar"
import SplashScreen from "./pages/SplashScreen"
import HomePage from "./pages/HomePage"
import LoginPage from "./pages/LoginPage"
import PlanPage from "./pages/PlanPage"
import ExercisePickerPage from "./pages/ExercisePickerPage"
import WorkoutOrderPage from "./pages/WorkoutOrderPage"
import TimelinePage from "./pages/TimelinePage"
import ProfilePage from "./pages/ProfilePage"
import UploadScanPage from "./pages/UploadScanPage"
import LoadingPage from "./pages/LoadingPage"
import ResultsPage from "./pages/ResultsPage"
import ComparisonPage from "./pages/ComparisonPage"
import SubscriptionPage from "./pages/SubscriptionPage"
import WorkoutLoggerPage from "./pages/WorkoutLoggerPage"
import ActiveWorkoutPage from "./pages/ActiveWorkoutPage"

function Layout({ children }) {
  return (
    <div className="min-h-screen" style={{ background: "#f0eeff" }}>
      <div className="mx-auto pb-24" style={{ maxWidth: 430 }}>
        <NavBar />
        <main className="min-h-screen" style={{ background: "white" }}>
          {children}
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SplashScreen />} />
          <Route path="/profile-screen" element={<LoginPage />} />
          <Route path="/select-profile" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/home" element={<Layout><HomePage /></Layout>} />
          <Route path="/plan" element={<Layout><PlanPage /></Layout>} />
          <Route path="/plan/exercises" element={<Layout><ExercisePickerPage /></Layout>} />
          <Route path="/plan/order" element={<Layout><WorkoutOrderPage /></Layout>} />
          <Route path="/timeline" element={<Layout><TimelinePage /></Layout>} />
          <Route path="/profile" element={<Layout><ProfilePage /></Layout>} />
          <Route path="/upload" element={<Layout><UploadScanPage /></Layout>} />
          <Route path="/upload/loading" element={<Layout><LoadingPage /></Layout>} />
          <Route path="/upload/results" element={<Layout><ResultsPage /></Layout>} />
          <Route path="/upload/comparison" element={<Layout><ComparisonPage /></Layout>} />
          <Route path="/profile/subscription" element={<Layout><SubscriptionPage /></Layout>} />
          <Route path="/workout/active" element={<Layout><ActiveWorkoutPage /></Layout>} />
          <Route path="/workout-logger" element={<Layout><WorkoutLoggerPage /></Layout>} />
        </Routes>
      </BrowserRouter>
    </UserProvider>
  )
}

export default App