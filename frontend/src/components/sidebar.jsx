import { googleLogout, useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { useState } from "react";
import toast from "react-hot-toast";
import {
  BiSolidDashboard,
  BiSolidHome,
  BiStats,
  BiTable,
} from "react-icons/bi";
import { TbLogout } from "react-icons/tb";
import {
  Link,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { backend_url } from "../helpers";
import { cn } from "../utils";

export const Sidebar = ({ children, isLoggedIn, setIsLoggedIn }) => {
  const location = useLocation();
  const { videoId } = useParams();
  const [searchParams] = useSearchParams();
  const sort = searchParams.get("sort");
  const max = searchParams.get("max");

  // for logoutting the user
  const handleLogout = () => {
    setIsLoggedIn(false);
    googleLogout();
    document.cookie =
      "access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie =
      "refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    toast.success("Logged out successfully");
  };

  //this is a google login execute function
  const handleLogin = useGoogleLogin({
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/youtube.force-ssl",
    ].join(" "),
    onSuccess: async ({ code }) => {
      try {
        const tokens = await axios
          .post(`${backend_url}/api/auth`, {
            code,
          })
          .then((res) => res.data);
        // console.log("tokens", tokens);

        // Save access token with expiry date and refresh token into cookies
        const { access_token, refresh_token, expiry_date } = tokens;

        document.cookie = `access_token=${access_token}; expires=${new Date(expiry_date).toUTCString()}; path=/`;
        document.cookie = `refresh_token=${refresh_token}; path=/`;

        setIsLoggedIn(true);
        toast.success("Logged in successfully");
      } catch (err) {
        toast.error(err.message);
      }
    },
    flow: "auth-code",
    onError: (err) => {
      console.log(err);
      toast.error(err);
    },
  });

  const [collapsed, setCollapsed] = useState(true);
  // const [settingsOpen, setSettingsOpen] = useState(false);

  const links = [
    {
      path: "dashboard",
      label: "Dashboard",
      icon: BiSolidDashboard,
      props: `?sort=${sort}&max=${max}`,
    },
    {
      path: "comments",
      label: "All Comments",
      icon: BiTable,
      props: `?sort=${sort}&max=${max}`,
    },
    {
      path: "live-stats",
      label: "Live Stats",
      icon: BiStats,
      props: `?sort=${sort}&max=${max}`,
    },
  ];

  // console.log(location)
  return (
    <div className="flex h-full w-full space-x-2 overflow-hidden p-5">
      <div className="flex flex-col space-y-2">
        <div className="relative h-full w-fit">
          <div
            onMouseEnter={() => setCollapsed(false)}
            onMouseLeave={() => setCollapsed(true)}
            className={cn(
              collapsed ? "w-[5rem]" : "w-[18rem]",
              "flex h-full flex-col justify-between rounded-2xl border border-[#252C36] bg-[#0E1420] p-4 pt-8 text-white transition-all duration-[0.2s] ease-in-out",
            )}
          >
            <div className="flex flex-col space-y-1">
              <Link
                to="/"
                className="flex h-10 cursor-pointer items-center space-x-4 overflow-hidden whitespace-nowrap rounded-lg px-3.5 py-2 transition-colors hover:bg-[#1D242E] hover:bg-opacity-50"
              >
                <BiSolidHome className="min-h-5 min-w-5" />
                <span>Home</span>
              </Link>
              {links.map(({ path, label, icon: Icon, props }) => (
                <Link
                  key={path}
                  to={`/${path}/${videoId}${props ? props : ""}`} // Append query parameters if they exist
                  className={cn(
                    "flex h-10 cursor-pointer items-center space-x-4 overflow-hidden whitespace-nowrap rounded-lg px-3.5 py-2 transition-colors hover:bg-[#1D242E] hover:bg-opacity-50",
                    location.pathname.includes(path) && "bg-[#1D242E]",
                  )}
                >
                  <Icon className="min-h-5 min-w-5" />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
            <button
              onClick={isLoggedIn ? handleLogout : handleLogin}
              className="flex h-10 flex-col items-center justify-center overflow-hidden rounded-full bg-blue-600 px-4 py-2 text-white"
            >
              <div className={cn("flex w-full items-center space-x-4")}>
                <TbLogout className="min-h-5 min-w-5" />
                <span>Logout</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-full w-full flex-col space-y-2 overflow-hidden">
        {children}
      </div>
    </div>
  );
};
