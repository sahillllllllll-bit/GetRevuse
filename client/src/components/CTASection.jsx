import { useNavigate } from "react-router-dom";

export default function CTASection({ user }) {
  const navigate = useNavigate();

  const handlePrimaryClick = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/login");
    }
  };

  return (
    <section className="w-full py-16">
      <div className="max-w-6xl mx-auto text-center">

        {/* Badge */}
        <div className="inline-block mb-4 px-4 py-1 text-sm rounded-full bg-blue-100 text-blue-700">
          ⚡ Simple Review Automation for Small Businesses
        </div>

        {/* Heading */}
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
          Get More 5-Star Reviews <br />
          <span className="text-blue-600">
            Automatically
          </span>
        </h1>

        {/* Subtext */}
        <p className="mt-5 text-lg text-gray-600 max-w-2xl mx-auto">
  Upload your customer list, send personalized messages via email or SMS,
  and turn happy customers into real reviews on platforms like Google, Yelp, Facebook, and more — without manual follow-ups.
</p>

        {/* Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">

          {/* Primary CTA */}
          <button
            onClick={handlePrimaryClick}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl text-lg font-medium shadow-md transition"
          >
            {user ? "Launch Campaign" : "Start Getting Reviews"}
          </button>

          {/* Secondary CTA */}
          <button
            onClick={() => navigate("/pricing")}
            className="border border-gray-300 hover:border-blue-500 px-8 py-3 rounded-xl text-lg font-medium text-gray-700 hover:text-blue-600 transition"
          >
            See Pricing
          </button>
        </div>

        {/* Trust line */}
        <p className="mt-6 text-sm text-gray-500">
          No credit card required • Setup in under 2 minutes
        </p>

      </div>
    </section>
  );
}