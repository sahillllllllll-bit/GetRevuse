import { BrowserRouter as Router, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AppRoutes from "./routes/Approutes";
import ScrollToTop from "./ScrollToTop";
import AuthProvider from "./context/AuthContext";

// 🔥 Layout wrapper
function Layout() {
  const location = useLocation();

  // Hide navbar/footer on dashboard routes
  const isDashboard = location.pathname.startsWith("/dashboard");

  return (
    <>
      {!isDashboard && <Navbar />}

      <div className={`${!isDashboard ? "pt-20" : ""} min-h-screen bg-blue-50`}>
        <AppRoutes />
      </div>

      {!isDashboard && <Footer />}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Layout />
      </Router>
    </AuthProvider>
  );
}

export default App;