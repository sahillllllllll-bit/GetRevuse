import { useEffect, useState } from "react";
import { Menu, ArrowLeft, Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import Pricing from "./Pricing";
import NegativeReviews from "../components/AutoReply/NegativeReviews";
import FeedbackCard from "../components/Feedback/FeedbackCard";
import FeedbackDashboard from "./dashboard/FeedbackDashboard";
import CampaignsList from "./dashboard/CampaignsList";
import CreateCampaign from "../components/CreateCampaign/CreateCampaign";
import CreditsPage from "./dashboard/CreditsPage";
import AnalyticsDashboard from "./dashboard/AnalyticsDashboard";


// 🔽 import your future components
// import Analytics from "../components/Analytics";
// import Project from "../components/Project";

export const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);

  // ✅ NEW: tab state
  const [activeTab, setActiveTab] = useState("campaign");
  const [tabLoading, setTabLoading] = useState(false);

  useEffect(() => {
    const root = document.documentElement;

    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    return () => {
      root.classList.remove("dark");
    };
  }, [darkMode]);

  // 🔒 Auth guard
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <p className="text-blue-600 animate-pulse">Loading dashboard...</p>
      </div>
    );
  }

  if (!user) {
    navigate("/");
    return null;
  }

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  // ✅ NEW: handle tab change with loading
  const handleTabChange = (tab) => {
    setTabLoading(true);

    setTimeout(() => {
      setActiveTab(tab);
      setTabLoading(false);
      setSidebarOpen(false); // mobile close
    }, 400);
  };

  return (
    <div className={`${darkMode ? "dark" : ""}`}>
      {/* ✅ FIX: h-screen + overflow-hidden on outermost wrapper to contain layout */}
      <div className="h-screen w-screen flex overflow-hidden bg-gray-100 dark:bg-gray-900">

        {/* Sidebar — ✅ FIX: uses h-screen + overflow-y-auto so IT scrolls independently */}
        <div
          className={`fixed md:static top-0 left-0 h-screen w-64 bg-white dark:bg-gray-800 shadow-lg transform 
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} 
          md:translate-x-0 transition-transform duration-300 z-50 flex flex-col overflow-y-auto`}
        >
          <div className="p-5 flex flex-col h-full justify-between">

            {/* Top */}
            <div>
              <h2 className="text-xl font-bold text-blue-600 mb-6">
                Dashboard
              </h2>

              {/* Sidebar Menu */}
              <div className="space-y-3 text-gray-700 dark:text-gray-200">

                    <button
                        onClick={() => handleTabChange("campaign")}
                        className={`block w-full text-left p-2 rounded transition
                        ${
                            activeTab === "campaign"
                            ? "bg-gray-100 dark:bg-gray-700"
                            : "hover:bg-gray-100 dark:hover:bg-gray-700"
                        }
                        `}
                    >
                        Campaigns
                    </button>

                    <button
                        onClick={() => handleTabChange("analytics")}
                        className={`block w-full text-left p-2 rounded transition
                        ${
                            activeTab === "analytics"
                            ? "bg-gray-100 dark:bg-gray-700"
                            : "hover:bg-gray-100 dark:hover:bg-gray-700"
                        }
                        `}
                    >
                        Analytics
                    </button>

                    <button
                        onClick={() => handleTabChange("feedback")}
                        className={`block w-full text-left p-2 rounded transition
                        ${
                            activeTab === "feedback"
                            ? "bg-gray-100 dark:bg-gray-700"
                            : "hover:bg-gray-100 dark:hover:bg-gray-700"
                        }
                        `}
                    >
                        Feedbacks
                    </button>

                    <button
                        onClick={() => handleTabChange("plan")}
                        className={`block w-full text-left p-2 rounded transition
                        ${
                            activeTab === "plan"
                            ? "bg-gray-100 dark:bg-gray-700"
                            : "hover:bg-gray-100 dark:hover:bg-gray-700"
                        }
                        `}
                    >
                        Recharge Now
                    </button>

                    <button
                        onClick={() => handleTabChange("credit")}
                        className={`block w-full text-left p-2 rounded transition
                        ${
                            activeTab === "credit"
                            ? "bg-gray-100 dark:bg-gray-700"
                            : "hover:bg-gray-100 dark:hover:bg-gray-700"
                        }
                        `}
                    >
                        Credits
                    </button>


                    </div>
            </div>

            {/* Bottom actions */}
            <div className="space-y-3 flex flex-col justify-end">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-center gap-2 border py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                {darkMode ? "Light Mode" : "Dark Mode"}
              </button>

              <button
                onClick={handleLogout}
                className="w-full text-red-500 border border-red-400 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 md:hidden z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ✅ FIX: Main content column — flex-col + min-h-0 so it stays within h-screen */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

          {/* Top bar — shrink-0 so it never scrolls away */}
          <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 shadow shrink-0">
            <div className="flex items-center gap-3">

              <button
                className="md:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu />
              </button>

              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-1 text-blue-600 hover:underline"
              >
                <ArrowLeft size={18} />
                Back To Home
              </button>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-300">
              {user?.email}
            </div>
          </div>

          {/* ✅ FIX: Content Area — flex-1 + overflow-y-auto so ONLY this scrolls */}
          <div className="flex-1 overflow-y-auto p-2">

            {tabLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                {/* ✅ Dynamic rendering */}

                {activeTab === "campaign" && !isCreatingCampaign && (
                    <CampaignsList onCreateNew={() => setIsCreatingCampaign(true)}/>
                )}

                {activeTab === "campaign" && isCreatingCampaign && (
                    <CreateCampaign
                      onBack={() => setIsCreatingCampaign(false)}
                      onSuccess={() => setIsCreatingCampaign(false)}
                    />
                )}

                {activeTab === "feedback" && (
                  <FeedbackDashboard/>
                )}

                {activeTab === "analytics" && (
                  <AnalyticsDashboard/>
                )}

                {activeTab === "plan" && (
                  <Pricing/>
                )}

                {activeTab === "credit" && (
                  <CreditsPage/>
                )}

              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};