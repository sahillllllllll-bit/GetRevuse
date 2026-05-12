import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";
import HowItWorks from "../components/HowItWorks";
import Login from "../pages/Login"; // make sure path is correct
import CTASection from "../components/CTASection";
import ReviewMarquee from "../components/ReviewMarquee";
import VideoPlayer from "../components/VideoPlayer";

export const Home = () => {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u); // no redirect
    });

    return () => unsubscribe();
  }, []);

  // Loading state
  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <p className="text-blue-600 text-lg animate-pulse">
          Loading...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-blue-50  ">
   <CTASection user={user}/>
   <ReviewMarquee/>
        {/* {!user && (
          <div className="mb-10">
            <Login />
          </div>
        )}
        {user && 
          <div className="mb-10">
      
          </div>
        )} */}
       
        <VideoPlayer/>
        <HowItWorks />
      {/* <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-lg p-6 sm:p-10">

        🔐 If NOT logged in → show login

        📌 Always show HowItWorks

      </div> */}
    </div>
  );
};