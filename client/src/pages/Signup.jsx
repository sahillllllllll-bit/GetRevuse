import { useState } from "react";
import { auth } from "../firebase/config";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import GoogleButton from "../components/GoogleButton";

export default function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Password strength
  const getPasswordStrength = (password) => {
    if (password.length < 6) return { text: "Weak", color: "text-red-500" };
    if (password.match(/^(?=.*[A-Z])(?=.*\d).{6,}$/))
      return { text: "Strong", color: "text-green-600" };
    return { text: "Medium", color: "text-yellow-500" };
  };

  const strength = getPasswordStrength(form.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    if (form.password.length < 6) {
      return setMsg("Password must be at least 6 characters");
    }

    try {
      setLoading(true);

      await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      setMsg("Account created successfully 🎉");

      setTimeout(() => {
        navigate("/");
      }, 1200);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-50 px-4">
      
      <form
        onSubmit={handleSubmit}
        className="bg-white w-full max-w-md p-6 sm:p-8 rounded-2xl shadow-lg"
      >
        {/* Heading */}
        <h2 className="text-2xl sm:text-3xl text-blue-600 font-bold mb-2">
          Create Account
        </h2>
        <p className="text-gray-500 mb-6 text-sm">
          Sign up to continue
        </p>

        {/* Email */}
        <input
          type="email"
          placeholder="Email"
          required
          className="w-full mb-4 p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-sm sm:text-base"
          onChange={(e) =>
            setForm({ ...form, email: e.target.value })
          }
        />

        {/* Password */}
        <input
          type="password"
          placeholder="Password"
          required
          className="w-full mb-2 p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-sm sm:text-base"
          onChange={(e) =>
            setForm({ ...form, password: e.target.value })
          }
        />

        {/* Password strength */}
        {form.password && (
          <p className={`text-xs mb-3 ${strength.color}`}>
            Strength: {strength.text}
          </p>
        )}

        {/* Submit button */}
        <button
          disabled={loading}
          className={`w-full flex items-center justify-center gap-2 p-3 rounded-lg text-white font-semibold transition
          ${
            loading
              ? "bg-blue-300 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading && (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          )}
          {loading ? "Creating..." : "Sign Up"}
        </button>

        {/* Divider */}
        <div className="flex items-center my-5">
          <div className="flex-grow h-px bg-gray-200" />
          <span className="px-2 text-gray-400 text-sm">OR</span>
          <div className="flex-grow h-px bg-gray-200" />
        </div>

        {/* Google */}
        <GoogleButton />

        {/* Message */}
        {msg && (
          <p
            className={`mt-4 text-sm text-center ${
              msg.includes("success")
                ? "text-green-600"
                : "text-red-500"
            }`}
          >
            {msg}
          </p>
        )}

        {/* Already account */}
        <p className="text-center text-sm text-gray-600 mt-6">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-blue-600 font-semibold hover:underline"
          >
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}