import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { UserProvider } from "./context/UserContext"
import { getToken } from "./services/authService"
import NavBar from "./components/NavBar"
import SplashScreen from "./pages/SplashScreen"
import HomePage from "./pages/HomePage"
import LoginPage from "./pages/LoginPage"
import PlanPage from "./pages/PlanPage"
import WorkoutPlannerPage from "./pages/WorkoutPlannerPage"
import BuilderPage from "./pages/BuilderPage"
import ExercisePickerPage from "./pages/ExercisePickerPage"
import WorkoutOrderPage from "./pages/WorkoutOrderPage"
import ProfilePage from "./pages/ProfilePage"
import UploadScanPage from "./pages/UploadScanPage"
import LoadingPage from "./pages/LoadingPage"
import ResultsPage from "./pages/ResultsPage"
import ComparisonPage from "./pages/ComparisonPage"
import SubscriptionPage from "./pages/SubscriptionPage"
import WorkoutLoggerPage from "./pages/WorkoutLoggerPage"
import WorkoutCommitPage from "./pages/WorkoutCommitPage"
import ActiveWorkoutPage from "./pages/ActiveWorkoutPage"
import ExercisePage from "./pages/ExercisePage"

function Layout({ children }) {
  return (
    <div className="min-h-screen" style={{ background: "#F0EFFE" }}>
      <div className="mx-auto pb-24" style={{ maxWidth: 430 }}>
        <NavBar />
        <main className="min-h-screen" style={{ background: "white" }}>
          {children}
        </main>
      </div>
    </div>
  )
}

// App screens need a login (Google, or a demo guest login). Without one, back to the splash screen.
function ProtectedLayout({ children }) {
  return getToken() ? <Layout>{children}</Layout> : <Navigate to="/" replace />
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
          <Route path="/home" element={<ProtectedLayout><HomePage /></ProtectedLayout>} />
          <Route path="/plan" element={<ProtectedLayout><PlanPage /></ProtectedLayout>} />
          <Route path="/plan/custom" element={<ProtectedLayout><BuilderPage /></ProtectedLayout>} />
          <Route path="/plan/workout/:presetId" element={<ProtectedLayout><WorkoutPlannerPage /></ProtectedLayout>} />
          <Route path="/plan/exercises" element={<ProtectedLayout><ExercisePickerPage /></ProtectedLayout>} />
          <Route path="/plan/order" element={<ProtectedLayout><WorkoutOrderPage /></ProtectedLayout>} />
          <Route path="/timeline" element={<ProtectedLayout><WorkoutLoggerPage /></ProtectedLayout>} />
          <Route path="/profile" element={<ProtectedLayout><ProfilePage /></ProtectedLayout>} />
          <Route path="/upload" element={<ProtectedLayout><UploadScanPage /></ProtectedLayout>} />
          <Route path="/upload/loading" element={<ProtectedLayout><LoadingPage /></ProtectedLayout>} />
          <Route path="/upload/results" element={<ProtectedLayout><ResultsPage /></ProtectedLayout>} />
          <Route path="/upload/comparison" element={<ProtectedLayout><ComparisonPage /></ProtectedLayout>} />
          <Route path="/profile/subscription" element={<ProtectedLayout><SubscriptionPage /></ProtectedLayout>} />
          <Route path="/exercise/:id" element={<ProtectedLayout><ExercisePage /></ProtectedLayout>} />
          <Route path="/workout/commit" element={<ProtectedLayout><WorkoutCommitPage /></ProtectedLayout>} />
          <Route path="/workout/active" element={<ProtectedLayout><ActiveWorkoutPage /></ProtectedLayout>} />
          <Route path="/workout-logger" element={<ProtectedLayout><WorkoutLoggerPage /></ProtectedLayout>} />
        </Routes>
      </BrowserRouter>
    </UserProvider>
  )
}

export default App
