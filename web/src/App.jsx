import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Groups from "./pages/Groups";
import Upload from "./pages/Upload";
import ProtectedRoute from "./routes/ProtectedRoute";
import GroupWorkflow from "./pages/Workspace";
import CiteWiseApp from "./citewise/App";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />

        {/* Protected routes */}
        <Route
          path="/groups"
          element={
            <ProtectedRoute>
              <Groups />
            </ProtectedRoute>
          }
        />

        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <Upload />
            </ProtectedRoute>
          }
        />

        <Route
          path="/workspace/:groupName"
          element={
            <ProtectedRoute>
              <GroupWorkflow />
            </ProtectedRoute>
          }
        />

        {/* CiteWise flow — protected so direct URL access redirects to login */}
        <Route
          path="/citewise/:groupId"
          element={
            <ProtectedRoute>
              <CiteWiseApp />
            </ProtectedRoute>
          }
        />

        {/* Without this, a mistyped or stale link rendered a blank document. */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

