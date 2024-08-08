import { useIntersection } from "@mantine/hooks";
import { useInfiniteQuery } from "@tanstack/react-query";
import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { BiDotsHorizontalRounded } from "react-icons/bi";
import { FaRegUser } from "react-icons/fa";
import { FiThumbsUp } from "react-icons/fi";
import { IoIosArrowDown } from "react-icons/io";
import { MdSubdirectoryArrowRight } from "react-icons/md";
import {
  backend_url,
  deleteComments,
  fetchCommentsDetails,
  getGroupification,
  getSentiment,
  hideUserFromChannel,
  linkRegex,
  replacer,
  reply,
  replyFormatter,
  transformTextWithLink,
  updateComment,
  updateGroupificationData,
  updateSentimentData,
} from "../helpers";
import { cn, sentimentKeys } from "../utils";
import { MenuComp } from "./menu";
import { Tooltip } from "./tooltip";

export const CommentsComp = ({
  currentUser,
  videoSession,
  list,
  list_about,
  showCheckboxes,
  selected,
  setSelected,
  _dataCopy,
  set_dataCopy,
}) => {
  const [hoverIndex, setHoverIndex] = useState(null);
  const [subHoverIndex, setSubHoverIndex] = useState(null);

  const [repliesList, setRepliesList] = useState([]);
  const [nextPageTokenParentIds, setNextPageTokenParentIds] = useState([]);

  // useInfiniteQuery
  const dataCopy = list?.length > 0 ? [...list] : [];
  const fetchCopySentimentComments = (page) => {
    return dataCopy.slice((page - 1) * 10, page * 10);
  };

  const { data, fetchNextPage } = useInfiniteQuery({
    queryKey: [`infinite_${list_about}`],
    queryFn: async ({ pageParam = 1 }) => {
      const response = fetchCopySentimentComments(pageParam);
      return response;
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < 10) {
        return undefined; // No more pages to fetch
      }
      return pages.length + 1;
    },
    initialData: {
      pages: [dataCopy.slice(0, 10)],
      pageParams: [1],
    },
    enabled: list && list.length > 0,
  });

  const lastCommentRef = useRef(null);
  const { ref, entry } = useIntersection({
    root: lastCommentRef.current,
    threshold: 1,
  });

  useEffect(() => {
    if (entry && entry.isIntersecting) {
      fetchNextPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry]);

  useEffect(() => {
    if (data?.pages) {
      set_dataCopy(data?.pages?.flatMap((page) => page) || []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.pages]);

  // console.log(_dataCopy);
  // useInfiniteQuery

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
  if (list?.length === 0)
    return (
      <div className="flex h-full w-full items-center justify-center text-white">
        No {list_about} Comments
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
        const index = _dataCopy?.findIndex((com) => com.cid === comment.cid);

        const updatedComment = await updateComment(
          comment,
          setUpdate,
          value,
        ).then((res) => res.snippet.textDisplay);

        if (!updatedComment) return;

        const updated_data_copy = _dataCopy.map((com, i) =>
          i === index ? { ...com, text: updatedComment } : com,
        );

        set_dataCopy(updated_data_copy);
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

      const index = _dataCopy?.findIndex(
        (com) => com.cid === formattedReply.parentId,
      );

      const updated_data_copy = _dataCopy.map((com, i) =>
        i === index ? { ...com, replies: com.replies + 1 } : com,
      );

      setRepliesList((prev) => [...prev, formattedReply]);
      set_dataCopy(updated_data_copy);
      e.target[0].value = "";
    }
  };

  const handleHideUser = async (e) => {
    const { value } = e;

    const res = await hideUserFromChannel(value, setIsHiding);
    if (res[0].status !== 204) return;

    set_dataCopy(_dataCopy.filter((com) => com.channel !== value[0].channel));
    setRepliesList(
      repliesList.filter((com) => com.channel !== value[0].channel),
    );

    const fetchedSentiment = await getSentiment(videoSession?.id);

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

      const index = _dataCopy?.findIndex(
        (com) => com.cid === value[0]?.parentId,
      );

      const updated_data_copy = _dataCopy.map((com, i) =>
        i === index ? { ...com, replies: com.replies - 1 } : com,
      );

      setRepliesList(filteredRepliesList);
      set_dataCopy(updated_data_copy);
    } else {
      set_dataCopy(_dataCopy?.filter((com) => com.cid !== value[0].cid));

      const fetchedSentiment = await getSentiment(videoSession?.id);

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
    <div
      role="tabpanel"
      className="tab-content flex h-full w-full flex-col space-y-2 overflow-hidden"
    >
      <div className="flex h-full w-full flex-col divide-y divide-[#252C36] overflow-auto overflow-x-hidden rounded-2xl border border-[#252C36] bg-[#0E1420]">
        {_dataCopy?.map((comment, i) => {
          if (i === _dataCopy?.length - 1) {
            return (
              <div
                ref={ref}
                key={i}
                onClick={() => {
                  if (!showCheckboxes) return;
                  setSelected((prev) => {
                    if (
                      JSON.stringify(prev).includes(JSON.stringify(comment))
                    ) {
                      return prev.filter(
                        (item) =>
                          JSON.stringify(item) !== JSON.stringify(comment),
                      );
                    } else {
                      return [...prev, comment];
                    }
                  });
                }}
                className="flex h-fit w-full cursor-pointer flex-col items-start space-y-4 px-4 py-2"
              >
                <div className="flex h-fit w-full items-start space-x-4">
                  <div className="flex w-full items-start space-x-2 overflow-hidden">
                    {showCheckboxes && (
                      <label className="relative mt-1.5 flex cursor-pointer items-center rounded-md">
                        <input
                          readOnly
                          className="peer relative h-4 w-4 cursor-pointer appearance-none rounded-full border border-gray-900 bg-gray-900/25 transition-all checked:border-blue-500 checked:bg-blue-500 dark:border-gray-100 dark:bg-gray-100/25"
                          checked={JSON.stringify(selected).includes(
                            JSON.stringify(comment),
                          )}
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
                    )}
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
                        {comment?.text?.replace(linkRegex, replacer)}
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
                  {!showCheckboxes && (
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
                  )}
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
                          {!showCheckboxes && (
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
                          )}
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
            );
          }
          return (
            <div
              key={i}
              onClick={() => {
                if (!showCheckboxes) return;
                setSelected((prev) => {
                  if (JSON.stringify(prev).includes(JSON.stringify(comment))) {
                    return prev.filter(
                      (item) =>
                        JSON.stringify(item) !== JSON.stringify(comment),
                    );
                  } else {
                    return [...prev, comment];
                  }
                });
              }}
              className="flex h-fit w-full cursor-pointer flex-col items-start space-y-4 px-4 py-2"
            >
              <div className="flex h-fit w-full items-start space-x-4">
                <div className="flex w-full items-start space-x-2 overflow-hidden">
                  {showCheckboxes && (
                    <label className="relative mt-1.5 flex cursor-pointer items-center rounded-md">
                      <input
                        readOnly
                        className="peer relative h-4 w-4 cursor-pointer appearance-none rounded-full border border-gray-900 bg-gray-900/25 transition-all checked:border-blue-500 checked:bg-blue-500 dark:border-gray-100 dark:bg-gray-100/25"
                        checked={JSON.stringify(selected).includes(
                          JSON.stringify(comment),
                        )}
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
                  )}
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

                {!showCheckboxes && (
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
                )}
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
                              <span className="truncate">{reply?.author}</span>
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
                        {!showCheckboxes && (
                          <div className="flex h-fit w-fit items-center justify-start space-x-2">
                            <MenuComp
                              options={
                                currentUser?.youtubeChannelId === reply?.channel
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
                        )}
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
          );
        })}
      </div>
    </div>
  );
};
