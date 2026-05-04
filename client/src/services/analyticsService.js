import { getAuth } from "firebase/auth";

export const fetchAnalytics = async () => {
  const user = getAuth().currentUser;
  const token = await user.getIdToken();

  const res = await fetch("http://localhost:5000/api/analytics", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.json();
};