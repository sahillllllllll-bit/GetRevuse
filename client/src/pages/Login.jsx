import { useState } from "react";
import { auth } from "../firebase/config";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import GoogleButton from "../components/GoogleButton";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Clean error messages
  const getErrorMessage = (error) => {
    if (error.includes("auth/invalid-credential"))
      return "Invalid email or password";
    if (error.includes("auth/user-not-found"))
      return "User not found";
    return "Something went wrong. Try again.";
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMsg("");

    try {
      setLoading(true);

      await signInWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      setMsg("Login successful 🎉");

      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);
    } catch (err) {
      setMsg(getErrorMessage(err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full my-20 flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-50 px-4">
      
      <form
        onSubmit={handleLogin}
        className="bg-white w-full max-w-md p-6 sm:p-8 rounded-2xl shadow-lg"
      >
        {/* Heading */}
        <h2 className="text-2xl sm:text-3xl text-blue-600 font-bold mb-2">
          Welcome Back
        </h2>
        <p className="text-gray-500 mb-6 text-sm">
          Login to your account
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
          className="w-full mb-3 p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-sm sm:text-base"
          onChange={(e) =>
            setForm({ ...form, password: e.target.value })
          }
        />

        {/* Forgot password */}
        <p className="text-right text-sm mb-4">
          <span className="text-blue-600 hover:underline cursor-pointer">
            Forgot Password?
          </span>
        </p>

        {/* Button */}
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
          {loading ? "Logging in..." : "Login"}
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
              msg.includes("successful")
                ? "text-green-600"
                : "text-red-500"
            }`}
          >
            {msg}
          </p>
        )}

        {/* Signup redirect */}
        <p className="text-center text-sm text-gray-600 mt-6">
          New user?{" "}
          <Link
            to="/signup"
            className="text-blue-600 font-semibold hover:underline"
          >
            Create account
          </Link>
        </p>
      </form>
    </div>
  );
}