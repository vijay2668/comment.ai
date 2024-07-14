import { useState } from "react";
import { cn } from "../utils";
import { googleLogout, useGoogleLogin } from "@react-oauth/google";
import toast from "react-hot-toast";
import axios from "axios";
import { IoIosArrowForward } from "react-icons/io";
import { TbLogout } from "react-icons/tb";
import { BiSolidDashboard, BiStats, BiTable } from "react-icons/bi";
import { useParams, Link, useLocation } from "react-router-dom";
import { getSessionStorage } from "../helpers";
import { ComponentsHeader } from "./components-header";

export const Sidebar = ({
  children,
  isLoggedIn,
  setIsLoggedIn,
  setSentimentsGroups,
}) => {
  const location = useLocation();
  const { videoId } = useParams();
  const { sort, max } = getSessionStorage("options") || {};

  const commentsAndSentiments =
    getSessionStorage("comments_and_sentiments") || {};

  const { comments } = commentsAndSentiments;

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
          .post("http://localhost:5000/api/auth", {
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
    ...(comments
      ? [
          {
            path: "comments",
            label: "All Comments",
            icon: BiTable,
            props: `?sort=${sort}&max=${max}`,
          },
        ]
      : []),
    { path: "live-stats", label: "Live Stats", icon: BiStats },
  ];

  // console.log(location)
  return (
    <div className="flex h-full w-full space-x-6 overflow-hidden p-5">
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
            {links.map(({ path, label, icon: Icon, props }) => (
              <Link
                key={path}
                to={`/${path}/${videoId}${props ? props : ""}`} // Append query parameters if they exist
                className={cn(
                  "flex h-10 cursor-pointer items-center space-x-4 overflow-hidden whitespace-nowrap rounded-lg px-3.5 py-2 transition-colors hover:bg-[#1D242E] hover:bg-opacity-50",
                  location.pathname === `/${path}/${videoId}` && "bg-[#1D242E]",
                )}
              >
                <Icon className="min-h-5 min-w-5" />
                <span>{label}</span>
              </Link>
            ))}
            {/* <div className="flex flex-col space-y-4">
              <button
                onClick={() => {
                  setSettingsOpen(!settingsOpen);
                  if (collapsed) setCollapsed(false);
                }}
                className={cn(
                  "flex h-10 cursor-pointer items-center justify-between overflow-hidden whitespace-nowrap rounded-lg bg-[#1D242E] px-4 py-2 transition-colors hover:bg-[#1D242E] hover:bg-opacity-50",
                )}
              >
                <div className="flex items-center space-x-4">
                  <IoMdSettings className="min-h-5 min-w-5" />
                  <span>Settings</span>
                </div>
                {settingsOpen ? (
                  <IoIosArrowUp className="min-h-5 min-w-5" />
                ) : (
                  <IoIosArrowDown className="min-h-5 min-w-5" />
                )}
              </button>
              
            </div> */}
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
      <div className="flex h-full w-full flex-col space-y-6 overflow-hidden">
        <ComponentsHeader setSentimentsGroups={setSentimentsGroups} />
        {children}
      </div>
    </div>
  );
};
