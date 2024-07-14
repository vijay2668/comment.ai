import "./App.css";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./pages/home";
import Dashboard from "./pages/dashboard";
import LiveStats from "./pages/live-stats";
import { useState } from "react";
import { getCookie } from "./helpers";
import { Header } from "./components/header";
import { Sidebar } from "./components/sidebar";
import { commentHeaders } from "./utils";
import Comments from "./pages/comments";
import { Sentiment } from "./pages/sentiment";

const App = () => {
  const refreshTokenCookie = getCookie("refresh_token");
  const [isLoggedIn, setIsLoggedIn] = useState(
    refreshTokenCookie ? true : false,
  ); // check if the user is logged in or not

  const [options, setOptions] = useState({
    replies: false,
    sort: "relevance",
    max: "50",
    file_type: "csv",
    file_name: "document",
  });

  const [sentimentsGroups, setSentimentsGroups] = useState({
    positives: [],
    negatives: [],
    questions: [],
    neutrals: [],
    isPending: false,
  });

  // const [comments, setComments] = useState([]);
  const [selected, setSelected] = useState(
    commentHeaders.map((key) => ({
      label: key,
      value: key,
    })) || [],
  );

  return (
    <div className="flex h-screen w-full flex-col bg-zinc-900 text-white">
      <Router>
        <Routes>
          <Route
            exact
            path="/"
            element={
              <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn}>
                <Home
                  isLoggedIn={isLoggedIn}
                  options={options}
                  setOptions={setOptions}
                  selected={selected}
                  setSelected={setSelected}
                />
              </Header>
            }
          />
          <Route
            path="dashboard/:videoId"
            element={
              <Sidebar
                isLoggedIn={isLoggedIn}
                setIsLoggedIn={setIsLoggedIn}
                setSentimentsGroups={setSentimentsGroups}
              >
                <Dashboard />
              </Sidebar>
            }
          />
          <Route
            path=":sentiment/:videoId"
            element={
              <Sidebar
                isLoggedIn={isLoggedIn}
                setIsLoggedIn={setIsLoggedIn}
                setSentimentsGroups={setSentimentsGroups}
              >
                <Sentiment sentimentsGroups={sentimentsGroups} />
              </Sidebar>
            }
          />
          <Route
            path="comments/:videoId"
            element={
              <Sidebar
                isLoggedIn={isLoggedIn}
                setIsLoggedIn={setIsLoggedIn}
                setSentimentsGroups={setSentimentsGroups}
              >
                <Comments />
              </Sidebar>
            }
          />
          <Route
            path="/live-stats/:videoId"
            element={
              <Sidebar isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} setSentimentsGroups={setSentimentsGroups}>
                <LiveStats />
              </Sidebar>
            }
          />
          {/* {/* <Route path="/about" element={<About />} /> */}
        </Routes>
      </Router>
    </div>
  );
};

export default App;
