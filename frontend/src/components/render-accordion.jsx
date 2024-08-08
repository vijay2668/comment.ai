import {
  AccordionItem,
  ControlledAccordion,
  useAccordionProvider,
} from "@szhsin/react-accordion";
import axios from "axios";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { BiDotsHorizontalRounded } from "react-icons/bi";
import { FaRegUser } from "react-icons/fa";
import { FiThumbsUp } from "react-icons/fi";
import { IoIosArrowDown } from "react-icons/io";
import { MdSubdirectoryArrowRight } from "react-icons/md";
import {
  arraysAreEqual,
  backend_url,
  deleteComments,
  getGroupification,
  getSentiment,
  groupificationSortByHelper,
  hideUserFromChannel,
  linkRegex,
  replacer,
  replies,
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

export const RenderAccordion = ({
  groupification,
  setGroupification,
  groupificationSortBy,
  sentiment,
  sentimentKey,
  currentUser,
  videoSession,
}) => {
  const [currentIndex, setCurrentIndex] = useState(null);
  const [hoverIndex, setHoverIndex] = useState(null);
  const [subHoverIndex, setSubHoverIndex] = useState(null);
  const [selectedComments, setSelectedComments] = useState([]);
  const [isPending, setIsPending] = useState(false);
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

  useEffect(() => {
    setGroupification((prev) => ({
      groupification_data: groupificationSortByHelper(
        groupification?.groupification_data,
        groupificationSortBy,
      ),
      ...prev,
    }));
  }, [
    groupification?.groupification_data,
    groupificationSortBy,
    setGroupification,
  ]);

  const [repliesList, setRepliesList] = useState([]);
  const [nextPageTokenParentIds, setNextPageTokenParentIds] = useState([]);

  const providerValue = useAccordionProvider();

  const handleSelect = (selected) => {
    // console.log(selected);
    setSelectedComments((prev) => {
      if (JSON.stringify(prev).includes(JSON.stringify(selected))) {
        return prev.filter(
          (item) => JSON.stringify(item) !== JSON.stringify(selected),
        );
      } else {
        return [...prev, selected];
      }
    });
  };

  const menuReply = async (e, group) => {
    e.preventDefault();
    const { value } = e.target[0];

    if (!value.trim()) {
      toast.error("Your reply is empty!");
      return;
    }

    if (!group?.length) {
      toast.error("Please choose at least one comment to reply!");
      return;
    }

    const currentGroup = groupification?.groupification_data[currentIndex];
    if (!currentGroup) {
      toast.error("Current group not found!");
      return;
    }

    try {
      const res = await replies(group, setIsPending, value);

      const updatedGroupOfComments = [...currentGroup.group_of_comments];
      const newRepliesList = res
        .map((reply) => {
          const formattedReply = replyFormatter(reply);

          if (formattedReply) {
            const index = updatedGroupOfComments.findIndex(
              ({ cid }) => cid === formattedReply.parentId,
            );
            if (index !== -1) {
              updatedGroupOfComments[index] = {
                ...updatedGroupOfComments[index],
                replies: updatedGroupOfComments[index].replies + 1,
              };
            }
          }

          return formattedReply;
        })
        .filter(Boolean);

      const updatedGroupificationData = groupification.groupification_data.map(
        (group, i) =>
          i === currentIndex
            ? { ...group, group_of_comments: updatedGroupOfComments }
            : group,
      );

      setGroupification((prev) => ({
        ...prev,
        groupification_data: updatedGroupificationData,
      }));

      setRepliesList((prev) => [...prev, ...newRepliesList]);
      setSelectedComments([]);
      e.target[0].value = "";
    } catch (error) {
      console.error("Error while processing replies:", error);
      toast.error("An error occurred while processing your reply.");
    }
  };

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
        setSelectedComments([]);
        e.target[0].value = "";
      } else {
        const currentGroup = groupification?.groupification_data[currentIndex];

        const index = currentGroup?.group_of_comments?.findIndex(
          ({ cid }) => cid === comment.cid,
        );

        const updatedComment = await updateComment(
          comment,
          setUpdate,
          value,
        ).then((res) => res.snippet.textDisplay);

        if (!updatedComment) return;

        const updated_groupificationData =
          groupification.groupification_data.map((group, i) =>
            i === currentIndex
              ? {
                  ...group,
                  group_of_comments: group.group_of_comments.map(
                    (group_of_comment, j) =>
                      j === index
                        ? {
                            ...group_of_comment,
                            text: updatedComment,
                          }
                        : group_of_comment,
                  ),
                }
              : group,
          );

        setGroupification((prev) => ({
          ...prev,
          groupification_data: updated_groupificationData,
        }));
        setSelectedComments([]);
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
      const currentGroup = groupification?.groupification_data[currentIndex];

      const res = await reply(comment, setRespond, value);

      const formattedReply = replyFormatter(res);

      if (!formattedReply) return;

      const index = currentGroup?.group_of_comments.findIndex(
        ({ cid }) => cid === formattedReply.parentId,
      );

      const updated_groupificationData = groupification.groupification_data.map(
        (group, i) =>
          i === currentIndex
            ? {
                ...group,
                group_of_comments: group.group_of_comments.map(
                  (group_of_comment, j) =>
                    j === index
                      ? {
                          ...group_of_comment,
                          replies: group_of_comment.replies + 1,
                        }
                      : group_of_comment,
                ),
              }
            : group,
      );

      setRepliesList((prev) => [...prev, formattedReply]);
      setGroupification((prev) => ({
        ...prev,
        groupification_data: updated_groupificationData,
      }));
      setSelectedComments([]);
      e.target[0].value = "";
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
    setSelectedComments([]);
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
    setSelectedComments([]);
  };

  const handleRemove = async (e) => {
    const { value } = e;
    setUpdate({
      isUpdating: false,
      showTextarea: false,
      comment: null,
    });
    setRespond({
      isResponding: false,
      showTextarea: false,
      comment: null,
    });

    const res = await deleteComments(value, setIsDeleting);

    if (res[0].status !== 204) return;

    // console.log("delete", value);
    const currentGroup = groupification?.groupification_data[currentIndex];

    if (value?.length === 1 && value[0]?.parentId) {
      const index = currentGroup?.group_of_comments?.findIndex(
        ({ cid }) => cid === value[0]?.parentId,
      );

      const updated_groupificationData = groupification.groupification_data.map(
        (group, i) =>
          i === currentIndex
            ? {
                ...group,
                group_of_comments: group.group_of_comments.map(
                  (group_of_comment, j) =>
                    j === index
                      ? {
                          ...group_of_comment,
                          replies: group_of_comment.replies - 1,
                        }
                      : group_of_comment,
                ),
              }
            : group,
      );

      setRepliesList(
        repliesList?.filter((reply) => reply.cid !== value[0].cid),
      );
      setGroupification((prev) => ({
        ...prev,
        groupification_data: updated_groupificationData,
      }));
      setSelectedComments([]);
    } else {
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

      const updated_groupificationData = groupification.groupification_data.map(
        (group, i) =>
          currentIndex === i
            ? {
                ...group,
                group_of_comments: currentGroup?.group_of_comments?.filter(
                  ({ cid }) => cid !== value[0].cid,
                ),
              }
            : group,
      );

      setGroupification((prev) => ({
        ...prev,
        groupification_data: updated_groupificationData,
      }));
      setSelectedComments([]);
    }
  };

  const handleHideUser = async (e) => {
    const { value } = e;

    const res = await hideUserFromChannel(value, setIsHiding);
    if (res[0].status !== 204) return;

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

    const updated_groupificationData = groupification.groupification_data.map(
      (group) => ({
        ...group,
        group_of_comments: group.group_of_comments.filter(
          (group_of_comment) => group_of_comment.channel !== value[0].channel,
        ),
      }),
    );

    setRepliesList(
      repliesList.filter((com) => com.channel !== value[0].channel),
    );
    setGroupification((prev) => ({
      ...prev,
      groupification_data: updated_groupificationData,
    }));
    setSelectedComments([]);
  };

  // menu operations start
  const menuOperations = [
    {
      label: "Reply",
      onClick: handleReply,
    },
    {
      label: "Hide user from channel",
      onClick: handleHideUser,
    },
    {
      label: "Remove",
      // need to check
      onClick: handleRemove,
    },
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
        `https://www.googleapis.com/youtube/v3/comments?part=snippet&pageToken=${nextPageToken}&parentId=${cid}&textFormat=plainText&e=${process.env.REACT_APP_API_KEY}`,
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

  // console.log(_dataCopy);
  const regex = /@@(\w+)/;

  if (groupification?.groupification_data?.length === 0)
    return (
      <div className="flex h-full w-full items-center justify-center text-white">
        No Groupification Available
      </div>
    );

  return (
    <div className="flex h-full w-full flex-col space-y-2 overflow-hidden">
      <ControlledAccordion
        // Forward the `providerValue` directly to `ControlledAccordion`
        providerValue={providerValue}
        className="flex h-full w-full flex-col divide-y divide-[#252C36] overflow-auto overflow-x-hidden rounded-2xl border border-[#252C36] bg-[#0E1420]"
      >
        {groupification?.groupification_data?.map((group, index) => {
          if (group.group_of_comments.length === 0) return null;
          return (
            <AccordionItem
              key={index}
              itemKey={`item-${index}`}
              header={
                <div
                  onClick={() => {
                    setCurrentIndex((prev) => (prev === index ? null : index));
                    if (group?.group_of_comments?.length === 1) {
                      setSelectedComments([group?.group_of_comments[0]]);
                    } else {
                      setSelectedComments([]);
                    }
                  }}
                  className="flex w-full items-center space-x-2 overflow-hidden px-4 py-3"
                >
                  <div className="flex w-full items-center justify-start overflow-hidden">
                    <div className="flex w-fit items-center p-2">
                      <label className="relative flex cursor-pointer items-center rounded-md">
                        <input
                          className="peer relative h-4 w-4 cursor-pointer appearance-none rounded-full border border-gray-900 bg-gray-900/25 transition-all checked:border-blue-500 checked:bg-blue-500 dark:border-gray-100 dark:bg-gray-100/25"
                          // checked={group?.group_of_comments.lengthJSON.stringify(selectedComments))}
                          checked={arraysAreEqual(
                            selectedComments,
                            group?.group_of_comments,
                          )}
                          onClick={(e) => {
                            if (e && e.stopPropagation) {
                              e.stopPropagation();
                            }
                          }}
                          onChange={() =>
                            setSelectedComments((prev) =>
                              arraysAreEqual(prev, group?.group_of_comments)
                                ? []
                                : group.group_of_comments,
                            )
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

                    <span className="truncate">{`${group.group_about}  (${group?.group_of_comments?.length}) :`}</span>
                  </div>
                  <div>
                    <IoIosArrowDown
                      className={cn(
                        currentIndex === index && "-rotate-180",
                        "text-xl text-white transition-transform duration-[0.2s] ease-in-out",
                      )}
                    />
                  </div>
                </div>
              }
              className={cn(
                currentIndex === index && "min-h-full",
                "flex flex-col",
              )}
            >
              <div className="flex h-full w-full flex-col divide-y divide-[#252C36] overflow-auto overflow-x-hidden rounded-2xl border border-[#252C36] bg-[#0E1420]">
                {group?.group_of_comments?.map((group_of_comment, i) => (
                  <div
                    key={i}
                    onClick={() => handleSelect(group_of_comment)}
                    className="flex h-fit w-full cursor-pointer flex-col items-start space-y-4 px-4 py-2"
                  >
                    <div className="flex h-fit w-full cursor-pointer items-start space-x-4">
                      <div className="flex w-full items-start space-x-2 overflow-hidden">
                        {group?.group_of_comments?.length > 1 && (
                          <label className="relative mt-1.5 flex cursor-pointer items-center rounded-md">
                            <input
                              readOnly
                              className="peer relative h-4 w-4 cursor-pointer appearance-none rounded-full border border-gray-900 bg-gray-900/25 transition-all checked:border-blue-500 checked:bg-blue-500 dark:border-gray-100 dark:bg-gray-100/25"
                              checked={JSON.stringify(
                                selectedComments,
                              ).includes(JSON.stringify(group_of_comment))}
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
                            <span className="truncate">
                              {group_of_comment?.author}
                            </span>
                            <span className="whitespace-nowrap text-[#7D828F]">
                              {group_of_comment?.time}
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
                            {/* {group_of_comment?.text} */}
                            {group_of_comment?.text?.replace(
                              linkRegex,
                              replacer,
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2.5 flex h-fit min-w-fit items-center justify-start space-x-2">
                        <Tooltip content="Like Count">
                          <div className="flex min-w-fit items-center justify-start space-x-2 text-sm">
                            <span>{group_of_comment?.votes}</span>
                            <div>
                              <FiThumbsUp className="text-green-500" />
                            </div>
                          </div>
                        </Tooltip>
                      </div>

                      <div className="flex h-fit w-fit items-center justify-start space-x-2">
                        {currentUser?.youtubeChannelId ===
                        group_of_comment?.channel ? (
                          <MenuComp
                            options={ownerMenuOperations.filter(
                              (item) => item.label !== "Reply",
                            )}
                            data={[group_of_comment]}
                            isPending={
                              isDeleting ||
                              update.isUpdating ||
                              respond.isResponding ||
                              isPending
                            }
                          >
                            <BiDotsHorizontalRounded className="text-2xl" />
                          </MenuComp>
                        ) : currentUser?.youtubeChannelId ===
                          videoSession?.youtubeChannelId ? (
                          <MenuComp
                            options={menuOperations.filter(
                              (item) => item.label !== "Reply",
                            )}
                            data={[group_of_comment]}
                            isPending={
                              isDeleting ||
                              update.isUpdating ||
                              respond.isResponding ||
                              isPending
                            }
                          >
                            <BiDotsHorizontalRounded className="text-2xl" />
                          </MenuComp>
                        ) : null}
                      </div>
                    </div>

                    {group_of_comment?.replies > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const hasReplies =
                              repliesList.filter(
                                (reply) =>
                                  reply.parentId === group_of_comment.cid,
                              ).length > 0;

                            const filteredReplies = repliesList.filter(
                              (reply) =>
                                reply.parentId !== group_of_comment.cid,
                            );

                            hasReplies
                              ? setRepliesList(filteredReplies) &&
                                setNextPageTokenParentIds((prev) =>
                                  prev.filter(
                                    (prv) =>
                                      prv?.parentId !== group_of_comment?.cid,
                                  ),
                                )
                              : fetchReplies(group_of_comment.cid);
                          }}
                          className="ml-6 flex h-fit items-center space-x-2 rounded-full px-4 py-2 text-blue-400 hover:bg-blue-400/20 disabled:cursor-not-allowed disabled:text-blue-400/50"
                        >
                          <div>
                            <IoIosArrowDown
                              className={cn(
                                repliesList.filter(
                                  (reply) =>
                                    reply.parentId === group_of_comment.cid,
                                ).length > 0 && "-rotate-180",
                                "transition-all",
                              )}
                            />
                          </div>
                          <span>{group_of_comment.replies} replies</span>
                        </button>
                        {repliesList
                          .filter(
                            (reply) =>
                              reply?.parentId === group_of_comment?.cid,
                          )
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
                              {currentUser?.youtubeChannelId ===
                              reply?.channel ? (
                                <div className="flex h-fit w-fit items-center justify-start space-x-2">
                                  <MenuComp
                                    options={ownerMenuOperations}
                                    data={[reply]}
                                    isPending={
                                      isDeleting ||
                                      update.isUpdating ||
                                      respond.isResponding ||
                                      isPending
                                    }
                                  >
                                    <BiDotsHorizontalRounded className="text-2xl" />
                                  </MenuComp>
                                </div>
                              ) : (
                                <div className="flex h-fit w-fit items-center justify-start space-x-2">
                                  <MenuComp
                                    options={
                                      currentUser?.youtubeChannelId ===
                                      videoSession?.youtubeChannelId
                                        ? menuOperations
                                        : menuOperations.filter(
                                            (item) => item.label === "Reply",
                                          )
                                    }
                                    data={[reply]}
                                    isPending={
                                      isDeleting ||
                                      update.isUpdating ||
                                      respond.isResponding ||
                                      isPending
                                    }
                                  >
                                    <BiDotsHorizontalRounded className="text-2xl" />
                                  </MenuComp>
                                </div>
                              )}
                            </div>
                          ))}

                        {repliesList.filter(
                          (reply) => reply?.parentId === group_of_comment?.cid,
                        ).length > 0 &&
                          nextPageTokenParentIds.find(
                            (nextPageTokenParentId) =>
                              nextPageTokenParentId?.parentId ===
                              group_of_comment?.cid,
                          )?.nextPageToken && (
                            <button
                              type="button"
                              onClick={() =>
                                fetchReplies(
                                  group_of_comment.cid,
                                  nextPageTokenParentIds.find(
                                    (nextPageTokenParentId) =>
                                      nextPageTokenParentId?.parentId ===
                                      group_of_comment?.cid,
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
                    {update?.comment?.cid === group_of_comment?.cid ||
                    update?.comment?.parentId === group_of_comment?.cid ? (
                      <form
                        className="h-fit w-full pl-8"
                        onSubmit={(e) => menuUpdate(e, update.comment)}
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
                                setUpdate({
                                  isUpdating: false,
                                  showTextarea: false,
                                  comment: null,
                                })
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
                    {respond?.comment?.cid === group_of_comment?.cid ||
                    respond?.comment?.parentId === group_of_comment?.cid ? (
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

              <form onSubmit={(e) => menuReply(e, selectedComments)}>
                <div className="flex w-full overflow-hidden rounded-xl border border-[#252C36] bg-[#1D242E]">
                  <textarea className="h-20 w-full resize-none bg-[#1D242E] p-2 focus:outline-none" />
                  <button
                    type="submit"
                    disabled={isPending}
                    className="mr-2 mt-2 h-fit rounded-full bg-blue-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-blue-600/50 disabled:text-white/50"
                  >
                    {isPending ? (
                      <div className="h-6 w-6 animate-spin rounded-full border-4 border-zinc-400 border-t-blue-400/50" />
                    ) : (
                      "Send"
                    )}
                  </button>
                </div>
              </form>
            </AccordionItem>
          );
        })}
      </ControlledAccordion>
    </div>
  );
};
