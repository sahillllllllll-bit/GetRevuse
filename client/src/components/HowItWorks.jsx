import { ArrowDown } from "lucide-react";

const steps = [
  {
    title: "Login & Access Dashboard",
    desc: "Sign in securely and access your Dashboard. From the sidebar, navigate between Campaigns, Feedbacks, Recharge Now, and Credits.",
    img: "https://res.cloudinary.com/dmhykhefr/image/upload/v1777831114/Screenshot_2026-05-03_232459_s5zujb.png", // Screenshot 1 - Campaigns dashboard
  },
  {
    title: "Create New Campaign — Basics",
    desc: "Click '+ New Campaign'. Enter your Business Name, choose a Review Platform (e.g. US Google Reviews), paste your Review Link, select a Messaging Channel (Email Only, SMS Only, or Email + SMS), and upload your customer data via CSV, Excel, or manually.",
    img: "https://res.cloudinary.com/dmhykhefr/image/upload/v1777831114/Screenshot_2026-05-03_232538_j7wftu.png", // Screenshot 2 - Step 1 of 4
  },
  {
    title: "Craft Your Message Templates",
    desc: "Choose a starting template — Friendly & Warm, Professional, or Casual & Fun. Preview how your email will look with live sample data filled in before continuing.",
    img: "https://res.cloudinary.com/dmhykhefr/image/upload/v1777831114/Screenshot_2026-05-03_232614_surybu.png", // Screenshot 3 - Step 2 of 4
  },
  {
    title: "Set Review Routing Threshold",
    desc: "Define the minimum star rating to send customers to your public review page. Customers rating below the threshold (e.g. below 4★) are redirected to a private feedback form instead.",
    img: "https://res.cloudinary.com/dmhykhefr/image/upload/v1777831114/Screenshot_2026-05-03_232619_xwhuga.png", // Screenshot 4 - Step 3 of 4
  },
  {
    title: "Launch Your Campaign",
    desc: "Set your Campaign Name, Sender Display Name, and Send Schedule — immediately, in 1 hour, 3 hours, tomorrow morning, or a custom date & time. Review the Campaign Summary, then click 'Launch Campaign'.",
    img: "https://res.cloudinary.com/dmhykhefr/image/upload/v1777831115/Screenshot_2026-05-03_232625_ojc8pk.png", // Screenshot 5 - Step 4 of 4
  },
  {
    title: "Track Feedback",
    desc: "View all customer feedback from your campaigns in one place. See Total Feedback, Unread counts, Average Rating, and Positive Routed stats. Filter by status, routing, rating, or campaign.",
    img: "https://res.cloudinary.com/dmhykhefr/image/upload/v1777831114/Screenshot_2026-05-03_232634_kpqhhn.png", // Screenshot 6 - Feedbacks page
  },
  {
    title: "Choose a Plan & Recharge Credits",
    desc: "Enter Your desired Amount and pay. Credits never expire and can be used for email or SMS campaigns.",
    img: "https://res.cloudinary.com/dmhykhefr/image/upload/v1777969967/Screenshot_2026-05-05_140044_tqonwa.png", // Screenshot 7 - Pricing/Recharge page
  },
];

export default function HowItWorks() {
  return (
    <div className="max-w-6xl mx-auto  px-6 py-4">
      <h2 className="text-3xl font-bold text-center text-blue-600 mb-16">
        How It Works
      </h2>

      {/* Desktop Layout */}
      <div className="hidden md:block space-y-20">
        {steps.map((step, index) => (
          <div key={index}>
            <div
              className={`flex items-center gap-10 ${
                index % 2 === 0 ? "flex-row" : "flex-row-reverse"
              }`}
            >
              {/* Image */}
              <div className="w-1/2">
                <img
                  src={step.img}
                  alt={step.title}
                  className="rounded-xl shadow-md"
                />
              </div>

              {/* Text */}
              <div className="w-1/2">
                <h3 className="text-xl font-semibold mb-2">
                  {index + 1}. {step.title}
                </h3>
                <p className="text-gray-600">{step.desc}</p>
              </div>
            </div>

            {/* Arrow */}
            {index !== steps.length - 1 && (
              <div className="flex justify-center mt-10">
                <ArrowDown className="text-blue-500 animate-bounce" size={32} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile / Tablet Layout */}
      <div className="md:hidden space-y-8">
        {steps.map((step, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow p-4 border"
          >
            <div className="bg-gray-50 rounded-lg overflow-hidden mb-3">
              <img src={step.img} alt={step.title} />
            </div>

            <h3 className="font-semibold mb-1">
              {index + 1}. {step.title}
            </h3>
            <p className="text-sm text-gray-600">{step.desc}</p>

            {index !== steps.length - 1 && (
              <div className="flex justify-center mt-4">
                <ArrowDown className="text-blue-500" size={24} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}