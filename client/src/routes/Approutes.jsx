import { Routes, Route, UNSAFE_RSCDefaultRootErrorBoundary } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import ProtectedRoute from "../components/ProtectedRoute";
import { Home } from "../pages/Home";
import { Dashboard } from "../pages/Dashboard";
import Contact from "../pages/Contact";
import Pricing from "../pages/Pricing";
import Services from "../pages/Services";
import Terms from "../pages/Terms";
import Cookies from "../pages/Cookies";
import Support from "../pages/Support";
import Privacy from "../pages/privacy";
import Features from "../pages/Features";
import Refund from "../pages/Refund";

import About from "../pages/About";
import HowItWorks from "../components/HowItWorks";
import Step1_Basics from "../components/CreateCampaign/Step1_Basics";
import CreateCampaign from "../components/CreateCampaign/CreateCampaign";
import Step2_Templates from "../components/CreateCampaign/Step2_Templates";
import Step3_Routing from "../components/CreateCampaign/Step3_Routing";
import Step4_Launch from "../components/CreateCampaign/Step4_Launch";
import RatingPage from "../pages/feedback/RatingPage";
import FeedbackDashboard from "../pages/dashboard/FeedbackDashboard";
import FeedbackFormPage from "../pages/feedback/FeedbackFormPage";
import { ThankYouPage } from "../pages/feedback/ThankYouPage";
import CampaignsList from "../pages/dashboard/CampaignsList";
import CreditsPage from "../pages/dashboard/CreditsPage";
import PaymentFailed from "../pages/PaymentFailed";
import PaymentHistory from "../pages/PaymentHistory";
import PaymentSuccess from "../pages/PaymentSuccess";






export default function AppRoutes() {
   const navigate = useNavigate();
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/" element={<Home />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/services" element={<Services />} />
      <Route path="/terms" element={<Terms/>} />
      <Route path="/refund" element={<Refund/>} />

      <Route path="/cookie" element={<Cookies/>} />
      <Route path="/about" element={<About/>} />
      <Route path="/features" element={<Features/>} />
      <Route path="/privacy" element={<Privacy/>} />
      <Route path="/support" element={<Support/>} />
      <Route path="/hiw" element={<HowItWorks/>} />
      <Route path="/step1" element={<Step1_Basics/>} />
      <Route path="/campaigns/new" element={<CreateCampaign/>} />
      <Route path="/step2" element={<Step2_Templates/>} />
      <Route path="/step3" element={<Step3_Routing/>} />
      <Route path="/step4" element={<Step4_Launch/>} />
      
      <Route path="/f/:slug"           element={<RatingPage />} />
      <Route path="/f/:slug/feedback"  element={<FeedbackFormPage />} />
      <Route path="/f/:slug/thankyou"  element={<ThankYouPage />} />

      // Dashboard routes (inside your sidebar layout)
      <Route path="/campaigns"  element={<CampaignsList onCreateNew={() => navigate('/campaigns/new')} />} />
      <Route path="/feedback"   element={<FeedbackDashboard />} />
      <Route path="/credits"    element={<CreditsPage />} />

       <Route path="/payment/success"  element={<PaymentSuccess />} />
       <Route path="/payment/failed"   element={<PaymentFailed />} />
       <Route path="/payment/history"  element={<PaymentHistory />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard/>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}