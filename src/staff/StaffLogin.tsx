import { Navigate, useLocation } from "react-router-dom";

/** Legacy URL — unified sign-in lives at `/login`. */
export function StaffLogin() {
  const location = useLocation();
  return (
    <Navigate to="/login?as=staff" replace state={location.state} />
  );
}
