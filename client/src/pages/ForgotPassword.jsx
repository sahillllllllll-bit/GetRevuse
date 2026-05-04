import { useState } from "react";
import { auth } from "../firebase/config";
import { sendPasswordResetEmail } from "firebase/auth";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();
    try {
      await sendPasswordResetEmail(auth, email);
      setMsg("Reset email sent ✅");
    } catch (err) {
      setMsg(err.message);
    }
  };

  return (
    <div className="h-screen flex justify-center items-center bg-blue-50">
      <form onSubmit={handleReset} className="bg-white p-6 rounded-xl shadow w-96">
        <h2 className="text-xl text-blue-600 font-bold mb-3">
          Reset Password
        </h2>

        <input
          type="email"
          placeholder="Enter email"
          className="w-full p-2 border rounded mb-3"
          onChange={(e) => setEmail(e.target.value)}
        />

        <button className="w-full bg-blue-600 text-white p-2 rounded">
          Send Reset Link
        </button>

        {msg && <p className="mt-3 text-sm">{msg}</p>}
      </form>
    </div>
  );
}