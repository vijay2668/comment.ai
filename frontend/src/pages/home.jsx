import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import toast from "react-hot-toast";
import { AiOutlineDownload } from "react-icons/ai";
import { IoClose } from "react-icons/io5";
import Modal from "react-modal";
import { MultiSelect } from "react-multi-select-component";
import { useNavigate, Link } from "react-router-dom";
import {
  backend_url,
  download,
  extractVideoId,
  fetchComments,
  getAllVideoSession,
  getCookie,
  getCurrentUser,
} from "../helpers";
import {
  cn,
  commentHeaders,
  customStyles,
  fileTypes,
  youtubeRegex,
} from "../utils.js";

const Home = ({ isLoggedIn, options, setOptions, selected, setSelected }) => {
  // Queries and Mutations

  const refresh_token = getCookie("refresh_token");

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
    refetchOnWindowFocus: false,
    enabled: !!refresh_token,
  });

  const { data: allVideoSession } = useQuery({
    queryKey: ["allVideoSession"],
    queryFn: () => getAllVideoSession(currentUser?.id),
    refetchOnWindowFocus: false,
    enabled: !!currentUser && !!currentUser.id && !!refresh_token,
  });

  const navigate = useNavigate();

  const [youtubeVideoLink, setYoutubeVideoLink] = useState(""); // youtube video link input
  const [isValidLink, setIsValidLink] = useState(false);

  const handleChange = (event) => {
    const value = event.target.value;
    setYoutubeVideoLink(value);
    setIsValidLink(youtubeRegex.test(value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // console.log("youtubeVideoLink", youtubeVideoLink);
    if (!isLoggedIn) {
      toast.error("Please Login first!");
      return;
    }

    //video owner's video id
    const videoId = extractVideoId(youtubeVideoLink);

    const videoIdOwnerChannelId = await axios
      .get(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${process.env.REACT_APP_API_KEY}`,
      )
      .then((res) => res.data.items[0].snippet.channelId);

    sessionStorage.clear();

    const createVideoSessionId = await axios.post(
      `${backend_url}/api/video/${videoId}?sort=${options?.sort}&max=${options?.max}`,
      {
        channelId: currentUser?.id, //currentUser's channel id
        youtubeChannelId: videoIdOwnerChannelId, //video owner's channel id
      },
    );

    if (createVideoSessionId.status === 200)
      navigate(
        `/comments/${videoId}?sort=${options?.sort}&max=${options?.max}`,
      );
  };

  const {
    isPending,
    mutateAsync: getComments, // using mutateAsync to handle async properly
  } = useMutation({
    mutationFn: (videoId) => fetchComments({ videoId, options }),
  });

  const handleDownload = async (e) => {
    e.preventDefault();
    if (options["file_name"] === "") {
      toast.error("Please enter your file name");
    } else if (selected?.length === 0) {
      toast.error("Please at least choose one field to download");
    } else {
      const videoId = extractVideoId(youtubeVideoLink);
      let fields = selected?.map((select) => select?.value);

      try {
        const comments = await getComments(videoId); // wait for the comments to be fetched

        if (!isPending) {
          download({
            data: comments,
            type: options["file_type"],
            fields,
            fileName: options["file_name"],
          });
        }
      } catch (err) {
        console.error(err.message);
        toast.error(err.message);
      }
    }
  };

  // console.log("isPending", isPending);

  // for modal:
  const [modalIsOpen, setIsOpen] = useState(false);
  const [modaltype, setModaltype] = useState("download");

  function openModal(type) {
    if (youtubeVideoLink && !isValidLink) {
      toast.error("This is not a valid YouTube link.");
    } else if (youtubeVideoLink === "") {
      toast.error("Youtube Video link not provided");
    } else {
      setIsOpen(true);
      setModaltype(type);
    }
  }

  function closeModal() {
    setIsOpen(false);
    setOptions({
      replies: false,
      sort: "relevance",
      max: "50",
      file_type: "csv",
      file_name: "document",
    });
    setSelected(
      commentHeaders.map((key) => ({
        label: key,
        value: key,
      })) || [],
    );
  }

  return (
    <div className="flex h-full w-full flex-1 flex-col">
      <div className="flex h-5/6 w-full flex-col items-center justify-center">
        <div className="flex h-fit w-2/4 flex-col items-center justify-center space-y-6 rounded-2xl border border-red-400 p-6 shadow-lg shadow-red-500">
          <h3 className="text-center text-3xl font-extrabold leading-snug text-white shadow-xl">
            Enter your Youtube Video Link
          </h3>
          <div className="flex w-full flex-col items-center justify-center space-y-1">
            <div className="flex w-full items-center space-x-2">
              <input
                value={youtubeVideoLink}
                onChange={handleChange}
                placeholder="Enter your Youtube Video Link"
                type="text"
                className="w-full rounded-full border border-zinc-400 bg-zinc-700 p-2 text-base text-white"
              />
              {isLoggedIn && allVideoSession?.length > 0 && (
                <details className="dropdown">
                  <summary className="btn m-1 rounded-full bg-zinc-800 text-white transition-shadow hover:bg-zinc-800 hover:shadow hover:shadow-zinc-500">
                    History
                  </summary>
                  <ul className="menu dropdown-content z-[1] w-fit rounded-box bg-base-100 p-2 shadow">
                    {allVideoSession.map((videoSession, i) => {
                      const { youtubeVideoId, sort, max } = videoSession;
                      return (
                        <li key={i}>
                          <Link
                            className="whitespace-nowrap"
                            to={`/comments/${youtubeVideoId}?sort=${sort}&max=${max}`}
                          >
                            {`/comments/${youtubeVideoId}?sort=${sort}&max=${max}`}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              )}
            </div>
            {youtubeVideoLink && !isValidLink && (
              <p className="text-red-500">This is not a valid YouTube link.</p>
            )}
          </div>
          <div className="flex w-5/6 items-center space-x-4">
            <button
              type="button"
              onClick={() => openModal("download")}
              className="flex flex-1 items-center justify-center space-x-2 rounded-full bg-zinc-800 px-4 py-2 text-white transition-shadow hover:shadow hover:shadow-zinc-500"
            >
              <AiOutlineDownload className="min-h-5 min-w-5" />
              <span>Download</span>
            </button>

            <button
              type="button"
              onClick={() => openModal("analyze")}
              className="flex-1 rounded-full bg-blue-600 px-4 py-2 text-white transition-shadow hover:shadow hover:shadow-blue-300"
            >
              Submit
            </button>
          </div>
        </div>
      </div>
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        style={customStyles}
        shouldCloseOnOverlayClick={false}
        overlayClassName="bg-zinc-800 fixed inset-0 bg-opacity-75 text-white"
        contentLabel="Download & Analyze Modal"
      >
        <form
          onSubmit={modaltype === "download" ? handleDownload : handleSubmit}
          className={cn(
            modaltype === "download" ? "h-[80vh]" : "h-[50vh]",
            "flex w-[60vw] flex-col space-y-4 overflow-hidden rounded-2xl border border-[#252C36] bg-[#0E1420] p-4",
          )}
        >
          <div className="flex h-full w-full flex-col space-y-4">
            {/* modal title with close modal btn */}
            <div className="relative flex w-full items-center">
              <h3 className="w-full text-center text-xl font-semibold tracking-wider">
                {modaltype === "download"
                  ? "Download Confirmation"
                  : "Analysis Confirmation"}
              </h3>

              <button
                type="button"
                onClick={closeModal}
                className="absolute right-0 top-0 transition-colors hover:text-red-500"
              >
                <IoClose className="min-h-6 min-w-6" />
              </button>
            </div>

            <div className="flex w-full flex-col space-y-4">
              {/* this is for to fetch newest or top comments */}
              <select
                name="sort"
                value={options["sort"]}
                onChange={(e) =>
                  setOptions((prev) => {
                    const newOptions = { ...prev };
                    newOptions["sort"] = e.target.value;
                    return newOptions;
                  })
                }
                className="h-[38px] w-full cursor-pointer rounded border border-[#252C36] bg-[#0E1420] p-1.5"
              >
                <option value="relevance">Top comments</option>
                <option value="time">Newest first</option>
              </select>

              {/* this is for to fetch the maximnum number of comments */}
              <select
                name="max"
                value={options["max"]}
                onChange={(e) =>
                  setOptions((prev) => {
                    const newOptions = { ...prev };
                    newOptions["max"] = e.target.value;
                    return newOptions;
                  })
                }
                className="h-[38px] w-full cursor-pointer rounded border border-[#252C36] bg-[#0E1420] p-1.5"
              >
                <option value="50">50 comments</option>
                <option value="100">100 comments</option>
                <option value="300">300 comments</option>
                <option value="1000">1000 comments</option>
                <option value="1800">All Comments (Max 1800)</option>
              </select>

              {/* this is for to download replies along with comments, on download part only */}
              {modaltype === "download" && (
                <div className="flex h-[38px] items-center space-x-2">
                  <span className="flex h-full w-full items-center rounded-l border border-[#252c36] px-2 py-1 text-sm text-zinc-300">
                    Replies
                  </span>
                  <div className="flex h-full items-center justify-center rounded-r border border-[#252c36] px-2 py-1">
                    <label className="relative flex cursor-pointer items-center rounded-md">
                      <input
                        className="peer relative h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-900 bg-gray-900/25 transition-all checked:border-blue-500 checked:bg-blue-500 dark:border-gray-100 dark:bg-gray-100/25"
                        checked={options["replies"]}
                        onChange={(e) =>
                          setOptions((prev) => {
                            const newOptions = { ...prev };
                            newOptions["replies"] = e.target.checked;
                            return newOptions;
                          })
                        }
                        type="checkbox"
                      />
                      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3.5 w-3.5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          stroke="currentColor"
                          strokeWidth="1"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          ></path>
                        </svg>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* this is for to define file type of downloadable comments */}
              {modaltype === "download" && (
                <select
                  name="file_type"
                  value={options["file_type"]}
                  onChange={(e) =>
                    setOptions((prev) => {
                      const newOptions = { ...prev };
                      newOptions["file_type"] = e.target.value;
                      return newOptions;
                    })
                  }
                  className="h-[38px] w-full cursor-pointer rounded border border-[#252C36] bg-[#0E1420] p-1.5"
                >
                  {fileTypes.map((fileType) => (
                    <option key={fileType} value={fileType}>
                      {fileType}
                    </option>
                  ))}
                </select>
              )}

              {/* this is for to download the choosen fields of every comments */}
              {modaltype === "download" && (
                <MultiSelect
                  options={
                    commentHeaders.map((key) => ({
                      label: key,
                      value: key,
                    })) || []
                  }
                  value={selected}
                  onChange={setSelected}
                  labelledBy="Select"
                />
              )}

              {/* this is for to define file name of downloadable comments */}
              {modaltype === "download" && (
                <input
                  type="text"
                  name="file_name"
                  value={options["file_name"]}
                  onChange={(e) =>
                    setOptions((prev) => {
                      const newOptions = { ...prev };
                      newOptions["file_name"] = e.target.value;
                      return newOptions;
                    })
                  }
                  placeholder="Enter the file name"
                  className="h-[38px] w-full cursor-pointer rounded border border-[#252C36] bg-[#0E1420] p-1.5"
                />
              )}
            </div>
          </div>

          <div className="mt-auto flex w-full flex-col">
            <button
              disabled={isPending}
              type="submit"
              className="flex h-10 flex-1 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-blue-600/50 disabled:text-white/50"
            >
              {isPending ? (
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-zinc-400 border-t-blue-400/50" />
              ) : modaltype === "download" ? (
                "Download"
              ) : (
                "Save & Analyze"
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Home;
