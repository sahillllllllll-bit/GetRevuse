import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-gradient-to-br from-blue-50 via-white to-blue-100 border-t border-blue-100">
      <div className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-4 gap-10">
        
        {/* Brand */}
        <div>
          <Link to="/">
            <div className="flex items-center gap-3">
              
              <img
                src="https://res.cloudinary.com/dmhykhefr/image/upload/v1776604024/Gemini_Generated_Image_jybr5pjybr5pjybr-removebg-preview_rlowjf.png"
                alt="GetRevuse logo"
                className="h-16 w-16 sm:h-16 sm:w-16 object-cover"
              />

              <div className="hidden sm:block pacifico-regular text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-700 to-blue-400 bg-clip-text text-transparent tracking-tight">
                GetRevuse
              </div>
            </div>
          </Link>

          <p className="text-gray-600 text-sm leading-relaxed mt-3">
            Automate customer feedback and turn it into real reviews on Google, Yelp, and more.
            Start growing your reputation with{" "}
            <Link to="/signup" className="text-blue-600 hover:underline">
              GetRevuse →
            </Link>
          </p>
        </div>

        {/* Product */}
        <div>
          <h3 className="font-semibold text-gray-800 mb-4">Product</h3>
          <ul className="space-y-2 text-gray-600">
            <li><Link to="/features" className="hover:text-blue-600">Features</Link></li>
            <li><Link to="/pricing" className="hover:text-blue-600">Pricing</Link></li>
            <li><Link to="/services" className="hover:text-blue-600">Use Cases</Link></li>
          </ul>
        </div>

        {/* Company */}
        <div>
          <h3 className="font-semibold text-gray-800 mb-4">Company</h3>
          <ul className="space-y-2 text-gray-600">
            <li><Link to="/about" className="hover:text-blue-600">About</Link></li>
            <li><Link to="/contact" className="hover:text-blue-600">Contact</Link></li>
            <li><Link to="/support" className="hover:text-blue-600">Support</Link></li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h3 className="font-semibold text-gray-800 mb-4">Legal</h3>
          <ul className="space-y-2 text-gray-600">
            <li><Link to="/terms" className="hover:text-blue-600">Terms & Conditions</Link></li>
            <li><Link to="/privacy" className="hover:text-blue-600">Privacy Policy</Link></li>
            <li><Link to="/refund" className="hover:text-blue-600">Refund Policy</Link></li>
            <li><Link to="/cookie" className="hover:text-blue-600">Cookies Policy</Link></li>
          </ul>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-blue-100 py-6 text-center text-gray-600 text-sm">
        © {new Date().getFullYear()} <Link to="/">GetRevuse</Link>. All rights reserved.
      </div>
    </footer>
  );
}