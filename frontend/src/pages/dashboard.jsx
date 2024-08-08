import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArcElement,
  Chart as ChartJS,
  Legend,
  Tooltip as ToolT,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { useEffect, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import {
  CircularProgressbarWithChildren,
  buildStyles,
} from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { FaRegUser } from "react-icons/fa";
import { FiThumbsUp } from "react-icons/fi";
import { IoClose } from "react-icons/io5";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Loader } from "../components/loader/loader";

import axios from "axios";
import toast from "react-hot-toast";
import { BiDotsHorizontalRounded } from "react-icons/bi";
import { IoIosArrowDown } from "react-icons/io";
import { MdSubdirectoryArrowRight } from "react-icons/md";
import { Loader2 } from "../components/loader2/loader2";
import { MenuComp } from "../components/menu";
import { SentimentAnalysisBtn } from "../components/sentiment-analysis-btn/sentiment-analysis-btn";
import { Tooltip } from "../components/tooltip";
import {
  backend_url,
  deleteComments,
  fetchComments,
  getCookie,
  getCurrentUser,
  getGroupification,
  getSentiment,
  getVideoSession,
  handleCategorize,
  hideUserFromChannel,
  reply,
  replyFormatter,
  transformTextWithLink,
  updateComment,
  updateGroupificationData,
  updateSentimentData
} from "../helpers";
import { cn, data, progressbarData, sentimentKeys, textCenter } from "../utils";

ChartJS.register(ArcElement, ToolT, Legend, ChartDataLabels);
ChartJS.defaults.plugins.legend.position = "right";

const Dashboard = () => {
  const navigate = useNavigate();
  const { videoId } = useParams();
  const [searchParams] = useSearchParams();
  const sort = searchParams.get("sort");
  const max = searchParams.get("max");

  const { data: videoSession } = useQuery({
    queryKey: ["videoSession"],
    queryFn: () => getVideoSession(videoId, sort, max),
    refetchOnWindowFocus: false,
    enabled: !!videoId,
  });

  const { data: recentSentiment, isFetching: isFetchingSentiment } = useQuery({
    queryKey: ["recentSentiment"],
    queryFn: () => getSentiment(videoSession.id),
    refetchOnWindowFocus: false,
    enabled: !!videoSession,
  });

  const [hoverIndex, setHoverIndex] = useState(null);
  const [subHoverIndex, setSubHoverIndex] = useState(null);

  const [sentiment, setSentiment] = useState(null);

  useEffect(() => {
    if (!recentSentiment || !recentSentiment?.sentiment_data?.positives) return;
    setSentiment(recentSentiment.sentiment_data);
  }, [recentSentiment]);

  const [comments, setComments] = useState([]);
  const [repliesList, setRepliesList] = useState([]);
  const [nextPageTokenParentIds, setNextPageTokenParentIds] = useState([]);

  const refresh_token = getCookie("refresh_token");
  // Queries and Mutations
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
    refetchOnWindowFocus: false,
    enabled: !!refresh_token,
  });

  // Queries and Mutations
  const { isFetched, isFetching, isError } = useQuery({
    queryKey: ["comments"],
    queryFn: async () => {
      const latestComments = await fetchComments({
        videoId,
        options: { max, sort },
      });

      setComments(latestComments);
      return latestComments;
    },
    refetchOnWindowFocus: false,
    enabled: !!refresh_token,
  });

  const { isPending, mutateAsync: generateSentiment } = useMutation({
    mutationKey: ["sentiment"],
    mutationFn: async () => {
      const latestSentiment = await handleCategorize(comments);
      return latestSentiment;
    },
    onSuccess: async (latestSentiment) => {
      // console.log("Sentiment generated successfully:", latestSentiment);
      setSentiment(latestSentiment);

      await axios.post(`${backend_url}/api/sentiment/${videoSession.id}`, {
        channelId: currentUser.id, //currentUser's channel id
        sentiment_data: {
          comments: comments.map(({ cid }) => cid),
          ...latestSentiment,
        },
        sentimentId: recentSentiment?.id, //this is here to make sure that if recentSentiment exists then update it otherwise create it.
      });
    },
  });

  // operations states start
  const [isDeleting, setIsDeleting] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  const [update, setUpdate] = useState({
    isUpdating: false,
    showTextarea: false,
    comment: null,
  });

  const [respond, setRespond] = useState({
    isResponding: false,
    showTextarea: false,
    comment: null,
  });

  // operations states end

  // Render loading state
  if ((!isFetched && !comments) || isFetching || isFetchingSentiment)
    return (
      <div className="flex h-full w-full flex-col items-center justify-center">
        <Loader />
      </div>
    );

  if (isError)
    return (
      <div className="flex h-full w-full items-center justify-center text-white">
        Error loading comments
      </div>
    );

  const menuUpdate = async (e, comment) => {
    e.preventDefault();
    const { value } = e.target[0];
    if (!value || value.trim() === "") {
      toast.error("Your Comment is empty!");
    } else {
      if (comment?.parentId) {
        const index = repliesList?.findIndex((com) => com.cid === comment.cid);

        const updatedComment = await updateComment(
          comment,
          setUpdate,
          value,
          repliesList.find((reply) => value?.includes(reply.author)),
        ).then((res) => res.snippet.textDisplay);

        if (!updatedComment) return;

        const updated_repliesList = repliesList.map((com, i) =>
          i === index ? { ...com, text: updatedComment } : com,
        );

        setRepliesList(updated_repliesList);
        e.target[0].value = "";
      } else {
        const index = comments?.findIndex((com) => com.cid === comment.cid);

        const updatedComment = await updateComment(
          comment,
          setUpdate,
          value,
        ).then((res) => res.snippet.textDisplay);

        if (!updatedComment) return;

        const updatedComments = comments.map((com, i) =>
          i === index ? { ...com, text: updatedComment } : com,
        );

        setComments(updatedComments);
        e.target[0].value = "";
      }
    }
  };

  const handleRespond = async (e, comment) => {
    e.preventDefault();
    const { value } = e.target[0];
    if (!value || value.trim() === "") {
      toast.error("Your reply is empty!");
    } else {
      const res = await reply(comment, setRespond, value);

      const formattedReply = replyFormatter(res);

      if (!formattedReply) return;

      const index = comments?.findIndex(
        (com) => com.cid === formattedReply.parentId,
      );

      const updated_data_copy = comments.map((com, i) =>
        i === index ? { ...com, replies: com.replies + 1 } : com,
      );

      setRepliesList((prev) => [...prev, formattedReply]);
      setComments(updated_data_copy);
      e.target[0].value = "";
    }
  };

  const handleHideUser = async (e) => {
    const { value } = e;

    const res = await hideUserFromChannel(value, setIsHiding);
    if (res[0].status !== 204) return;

    setComments(comments.filter((com) => com.channel !== value[0].channel));
    setRepliesList(
      repliesList.filter((com) => com.channel !== value[0].channel),
    );

    const fetchedSentiment = await getSentiment(videoSession.id);

    const sentiment = fetchedSentiment?.sentiment_data;
    const sentimentId = fetchedSentiment?.id;

    if (!sentiment || !sentimentId) return;

    await updateSentimentData(sentiment, "channel", value, sentimentId);

    const groupifications = await Promise.all(
      sentimentKeys.map((key) => getGroupification(sentimentId, key)),
    ).then((res) => res.filter(Boolean));

    if (!groupifications || groupifications.length === 0) return;

    await updateGroupificationData(groupifications, "channel", value);
  };

  const handleRemove = async (e) => {
    const { value } = e;
    const res = await deleteComments(value, setIsDeleting);

    if (res[0].status !== 204) return;

    if (value?.length === 1 && value[0]?.parentId) {
      const filteredRepliesList = repliesList?.filter(
        (reply) => reply.cid !== value[0].cid,
      );

      const index = comments?.findIndex(
        (com) => com.cid === value[0]?.parentId,
      );

      const updated_data_copy = comments.map((com, i) =>
        i === index ? { ...com, replies: com.replies - 1 } : com,
      );

      setRepliesList(filteredRepliesList);
      setComments(updated_data_copy);
    } else {
      setComments(comments?.filter((com) => com.cid !== value[0].cid));

      const fetchedSentiment = await getSentiment(videoSession.id);

      const sentiment = fetchedSentiment?.sentiment_data;
      const sentimentId = fetchedSentiment?.id;

      if (!sentiment || !sentimentId) return;

      await updateSentimentData(sentiment, "cid", value, sentimentId);

      const groupifications = await Promise.all(
        sentimentKeys.map((key) => getGroupification(sentimentId, key)),
      ).then((res) => res.filter(Boolean));

      if (!groupifications || groupifications.length === 0) return;

      await updateGroupificationData(groupifications, "cid", value);
    }
  };

  const handleReply = (e) => {
    const { value } = e;
    // console.log("reply", e);
    setRespond((prev) => ({
      ...prev,
      showTextarea: true,
      comment: value[0],
    }));
    setUpdate((prev) => ({
      ...prev,
      showTextarea: false,
      comment: null,
    }));
  };

  const handleUpdate = (e) => {
    const { value } = e;
    setUpdate((prev) => ({
      ...prev,
      showTextarea: true,
      comment: value[0],
    }));
    setRespond((prev) => ({
      ...prev,
      showTextarea: false,
      comment: null,
    }));
  };

  // menu operations start
  const menuOperations = [
    {
      label: "Reply",
      onClick: handleReply,
    },
    ...(videoSession?.youtubeChannelId === currentUser?.youtubeChannelId
      ? [
          {
            label: "Hide user from channel",
            onClick: handleHideUser,
          },
          {
            label: "Remove",
            onClick: handleRemove,
          },
        ]
      : []),
  ];

  const ownerMenuOperations = [
    {
      label: "Update",
      onClick: handleUpdate,
    },
    {
      label: "Reply",
      onClick: handleReply,
    },
    {
      label: "Delete",
      onClick: handleRemove,
    },
  ];
  // menu operations end

  const fetchReplies = async (cid, nextPageToken) => {
    let response;
    if (nextPageToken) {
      response = await axios.get(
        `https://www.googleapis.com/youtube/v3/comments?part=snippet&pageToken=${nextPageToken}&parentId=${cid}&textFormat=plainText&key=${process.env.REACT_APP_API_KEY}`,
      );
    } else {
      response = await axios.get(
        `https://www.googleapis.com/youtube/v3/comments?part=snippet&parentId=${cid}&textFormat=plainText&key=${process.env.REACT_APP_API_KEY}`,
      );
    }

    // console.log(response.data);

    const latestReplies = response.data.items.map((item) =>
      replyFormatter(item),
    );

    setNextPageTokenParentIds((prev) => [
      ...prev.filter((prv) => prv.parentId !== cid),
      { parentId: cid, nextPageToken: response.data.nextPageToken },
    ]);
    setRepliesList((prev) => [...prev, ...latestReplies]);
  };

  const regex = /@@(\w+)/;

  return (
    <div className="flex h-full w-full flex-1 flex-col space-y-2 overflow-hidden text-white">
      <div className="flex h-2/5 w-full flex-col space-y-2 overflow-hidden">
        <div className="h-fit w-full text-center text-xl font-bold capitalize">
          Comment Sentiment
        </div>
        <div className="relative flex h-full w-full items-center justify-evenly space-x-4 overflow-hidden rounded-2xl border border-[#252C36] bg-[#0E1420] p-4">
          {isPending ? (
            <Loader2 />
          ) : !sentiment ? (
            <SentimentAnalysisBtn onClick={generateSentiment} />
          ) : (
            progressbarData({
              comments,
              sentiment,
            }).map((item) => (
              <Link
                to={`/dashboard/${item.label.toLowerCase()}s/${videoId}?sort=${sort}&max=${max}`}
                key={item.label}
              >
                <CircularProgressbarWithChildren
                  className="h-[10rem] w-[10rem]"
                  value={item.percentage}
                  styles={buildStyles({
                    textColor: "white",
                    pathColor: item.color,
                    trailColor: "#27272a",
                  })}
                >
                  <div className="flex h-fit w-fit flex-col space-y-1 text-center text-xl tracking-wider">
                    <div>{item.label}</div>
                    <div className="flex items-center justify-center space-x-2">
                      <item.icon style={{ color: item.color }} />
                      <strong>{item.percentage}%</strong>
                    </div>
                    <p className="text-xs tracking-tighter text-[#7D828F]">
                      Comments: {item.count}
                    </p>
                  </div>
                </CircularProgressbarWithChildren>
              </Link>
            ))
          )}
          {sentiment && (
            <button
              type="button"
              onClick={() => setSentiment(null)}
              className="btn-square btn-outline btn-xs absolute right-4 top-4 flex items-center justify-center rounded-lg border border-red-500 text-red-500 transition-all hover:border-red-500 hover:bg-red-500"
            >
              <IoClose className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex h-3/5 w-full items-center space-x-2 overflow-hidden">
        <div className="flex h-full w-1/2 flex-1 flex-col space-y-2 overflow-hidden">
          <div className="h-fit w-full text-center text-xl font-bold capitalize">
            Comment Categories
          </div>
          <div className="flex h-full w-full flex-col items-center justify-center divide-y divide-[#252C36] overflow-hidden rounded-2xl border border-[#252C36] bg-[#0E1420]">
            {sentiment ? (
              <Doughnut
                // className="doughnut"
                data={data([
                  sentiment?.positives?.length || 0,
                  sentiment?.negatives?.length || 0,
                  sentiment?.questions?.length || 0,
                  sentiment?.neutrals?.length || 0,
                ])}
                plugins={[textCenter(comments)]}
                options={{
                  plugins: {
                    datalabels: {
                      formatter: function (value) {
                        let val = Math.round(value);
                        return new Intl.NumberFormat("tr-TR").format(val);
                      },
                      color: "white",
                      font: {
                        size: 16,
                      },
                    },
                    responsive: true,
                  },
                  onClick: (evt, item) => {
                    if (item[0]?.index === undefined || null) return;
                    const { index } = item[0];
                    if (index === 0) {
                      navigate(
                        `/dashboard/positives/${videoId}?sort=${sort}&max=${max}`,
                      );
                    } else if (index === 1) {
                      navigate(
                        `/dashboard/negatives/${videoId}?sort=${sort}&max=${max}`,
                      );
                    } else if (index === 2) {
                      navigate(
                        `/dashboard/questions/${videoId}?sort=${sort}&max=${max}`,
                      );
                    } else {
                      navigate(
                        `/dashboard/neutrals/${videoId}?sort=${sort}&max=${max}`,
                      );
                    }
                  },
                }}
              />
            ) : (
              "Sentiment data not available"
            )}
          </div>
        </div>
        <div className="flex h-full w-1/2 flex-1 flex-col space-y-2 overflow-hidden">
          <div className="h-fit w-full text-center text-xl font-bold capitalize">
            Top 10 Comments
          </div>
          <div className="flex h-full w-full flex-col divide-y divide-[#252C36] overflow-auto overflow-x-hidden rounded-2xl border border-[#252C36] bg-[#0E1420]">
            {comments
              .sort((a, b) => b.votes - a.votes)
              .slice(0, 10)
              .map((comment, i) => (
                <div
                  key={i}
                  className="flex h-fit w-full cursor-pointer flex-col items-start space-y-4 px-4 py-2"
                >
                  <div className="flex h-fit w-full items-start space-x-4">
                    <div className="flex w-full items-start space-x-2 overflow-hidden">
                      <div className="mt-0.5 flex min-h-6 min-w-6 items-center justify-center rounded-full border border-[#252C36] text-[#7D828F]">
                        <FaRegUser className="text-xs" />
                      </div>
                      <div className="flex flex-col space-y-1 overflow-hidden">
                        <div className="flex w-full items-center space-x-2 overflow-hidden text-xs">
                          <span className="truncate">{comment?.author}</span>
                          <span className="whitespace-nowrap text-[#7D828F]">
                            {comment?.time}
                          </span>
                        </div>
                        <div
                          onMouseEnter={() => setHoverIndex(i)}
                          onMouseLeave={() => setHoverIndex(null)}
                          className={cn(
                            hoverIndex !== i && "truncate",
                            "w-full cursor-pointer text-sm",
                          )}
                        >
                          {comment?.text}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2.5 flex h-fit min-w-fit items-center justify-start space-x-2">
                      <Tooltip content="Like Count">
                        <div className="flex min-w-fit items-center justify-start space-x-2 text-sm">
                          <span>{comment?.votes}</span>
                          <div>
                            <FiThumbsUp className="text-green-500" />
                          </div>
                        </div>
                      </Tooltip>
                    </div>
                    <div className="flex h-fit w-fit items-center justify-start space-x-2">
                      <MenuComp
                        options={
                          currentUser?.youtubeChannelId === comment?.channel
                            ? ownerMenuOperations
                            : menuOperations
                        }
                        data={[comment]}
                        isPending={
                          isDeleting ||
                          isHiding ||
                          update.isUpdating ||
                          respond.isResponding
                        }
                      >
                        <BiDotsHorizontalRounded className="text-2xl" />
                      </MenuComp>
                    </div>
                  </div>
                  {comment.replies > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const hasReplies =
                            repliesList.filter(
                              (reply) => reply.parentId === comment.cid,
                            ).length > 0;

                          const filteredReplies = repliesList.filter(
                            (reply) => reply.parentId !== comment.cid,
                          );

                          hasReplies
                            ? setRepliesList(filteredReplies) &&
                              setNextPageTokenParentIds((prev) =>
                                prev.filter(
                                  (prv) => prv?.parentId !== comment?.cid,
                                ),
                              )
                            : fetchReplies(comment.cid);
                        }}
                        className="ml-6 flex h-fit items-center space-x-2 rounded-full px-4 py-2 text-blue-400 hover:bg-blue-400/20 disabled:cursor-not-allowed disabled:text-blue-400/50"
                      >
                        <div>
                          <IoIosArrowDown
                            className={cn(
                              repliesList.filter(
                                (reply) => reply.parentId === comment.cid,
                              ).length > 0 && "-rotate-180",
                              "transition-all",
                            )}
                          />
                        </div>
                        <span>{comment.replies} replies</span>
                      </button>
                      {repliesList
                        .filter((reply) => reply?.parentId === comment?.cid)
                        .map((reply, index) => (
                          <div
                            key={index}
                            className="flex h-fit w-full items-start space-x-4 pl-6"
                          >
                            <div className="flex w-full items-start space-x-2 overflow-hidden">
                              <div className="mt-0.5 flex min-h-6 min-w-6 items-center justify-center rounded-full border border-[#252C36] text-[#7D828F]">
                                <FaRegUser className="text-xs" />
                              </div>
                              <div className="flex flex-col space-y-1 overflow-hidden">
                                <div className="flex w-full items-center space-x-2 overflow-hidden text-xs">
                                  <span className="truncate">
                                    {reply?.author}
                                  </span>
                                  <span className="whitespace-nowrap text-[#7D828F]">
                                    {reply?.time}
                                  </span>
                                </div>
                                <div
                                  onMouseEnter={() => setSubHoverIndex(index)}
                                  onMouseLeave={() => setSubHoverIndex(null)}
                                  className={cn(
                                    subHoverIndex !== index && "truncate",
                                    "w-full cursor-pointer text-sm",
                                  )}
                                >
                                  {transformTextWithLink(reply?.text)}
                                </div>
                              </div>
                            </div>
                            <div className="mt-2.5 flex h-fit min-w-fit items-center justify-start space-x-2">
                              <Tooltip content="Like Count">
                                <div className="flex min-w-fit items-center justify-start space-x-2 text-sm">
                                  <span>{reply?.votes}</span>
                                  <div>
                                    <FiThumbsUp className="text-green-500" />
                                  </div>
                                </div>
                              </Tooltip>
                            </div>

                            <div className="flex h-fit w-fit items-center justify-start space-x-2">
                              <MenuComp
                                options={
                                  currentUser.youtubeChannelId ===
                                  reply?.channel
                                    ? ownerMenuOperations
                                    : menuOperations
                                }
                                data={[reply]}
                                isPending={
                                  isDeleting ||
                                  isHiding ||
                                  update.isUpdating ||
                                  respond.isResponding
                                }
                              >
                                <BiDotsHorizontalRounded className="text-2xl" />
                              </MenuComp>
                            </div>
                          </div>
                        ))}

                      {repliesList.filter(
                        (reply) => reply?.parentId === comment?.cid,
                      ).length > 0 &&
                        nextPageTokenParentIds.find(
                          (nextPageTokenParentId) =>
                            nextPageTokenParentId?.parentId === comment?.cid,
                        )?.nextPageToken && (
                          <button
                            type="button"
                            onClick={() =>
                              fetchReplies(
                                comment.cid,
                                nextPageTokenParentIds.find(
                                  (nextPageTokenParentId) =>
                                    nextPageTokenParentId?.parentId ===
                                    comment?.cid,
                                )?.nextPageToken,
                              )
                            }
                            className="ml-6 flex h-fit items-center space-x-2 rounded-full px-4 py-2 text-blue-400 hover:bg-blue-400/20 disabled:cursor-not-allowed disabled:text-blue-400/50"
                          >
                            <div>
                              <MdSubdirectoryArrowRight />
                            </div>
                            <span>Show more replies</span>
                          </button>
                        )}
                    </>
                  )}
                  {update?.comment?.cid === comment?.cid ||
                  update?.comment?.parentId === comment?.cid ? (
                    <form
                      className="h-fit w-full pl-8"
                      onSubmit={(e) => menuUpdate(e, update?.comment)}
                    >
                      <div className="flex h-fit w-full flex-col space-y-2 overflow-hidden">
                        <textarea
                          defaultValue={
                            regex.test(update?.comment?.text)
                              ? `${update?.comment?.text.slice(1, update?.comment?.text?.length)} `
                              : ""
                          }
                          className="scrollbar-hide h-20 w-full resize-none rounded-xl border-[#252C36] bg-[#1D242E] p-2 focus:outline-none"
                        />
                        <div className="ml-auto flex h-fit w-fit items-center space-x-2">
                          <button
                            type="button"
                            onClick={() =>
                              setUpdate((prev) => ({
                                ...prev,
                                showTextarea: false,
                                comment: null,
                              }))
                            }
                            disabled={update.isUpdating}
                            className="h-fit rounded-full px-4 py-2 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:text-white/50"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={update.isUpdating}
                            className="h-fit rounded-full bg-blue-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-blue-600/50 disabled:text-white/50"
                          >
                            {update.isUpdating ? (
                              <div className="h-6 w-6 animate-spin rounded-full border-4 border-zinc-400 border-t-blue-400/50" />
                            ) : (
                              "Update"
                            )}
                          </button>
                        </div>
                      </div>
                    </form>
                  ) : null}
                  {respond?.comment?.cid === comment?.cid ||
                  respond?.comment?.parentId === comment?.cid ? (
                    <form
                      className="h-fit w-full pl-8"
                      onSubmit={(e) => handleRespond(e, respond?.comment)}
                    >
                      <div className="flex h-fit w-full flex-col space-y-2 overflow-hidden">
                        <textarea
                          autoFocus
                          defaultValue={
                            respond?.comment?.parentId
                              ? `${respond?.comment?.author} `
                              : ""
                          }
                          className="scrollbar-hide h-20 w-full resize-none rounded-xl border-[#252C36] bg-[#1D242E] p-2 focus:outline-none"
                        />
                        <div className="ml-auto flex h-fit w-fit items-center space-x-2">
                          <button
                            type="button"
                            onClick={() =>
                              setRespond((prev) => ({
                                ...prev,
                                showTextarea: false,
                                comment: null,
                              }))
                            }
                            disabled={respond.isResponding}
                            className="h-fit rounded-full px-4 py-2 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:text-white/50"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={respond.isResponding}
                            className="h-fit rounded-full bg-blue-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-blue-600/50 disabled:text-white/50"
                          >
                            {respond.isResponding ? (
                              <div className="h-6 w-6 animate-spin rounded-full border-4 border-zinc-400 border-t-blue-400/50" />
                            ) : (
                              "Reply"
                            )}
                          </button>
                        </div>
                      </div>
                    </form>
                  ) : null}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
