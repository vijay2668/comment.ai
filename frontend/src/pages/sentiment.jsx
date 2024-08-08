import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { BiDotsHorizontalRounded } from "react-icons/bi";
import { FaLayerGroup } from "react-icons/fa";
import { IoIosArrowBack } from "react-icons/io";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CommentsComp } from "../components/comments";
import { Loader } from "../components/loader/loader";
import { MenuComp } from "../components/menu";
import { RenderAccordion } from "../components/render-accordion";
import {
  arraysAreEqual,
  backend_url,
  deleteComments,
  fetchComments,
  getCookie,
  getCurrentUser,
  getGroupification,
  getOriginalComments,
  getSentiment,
  getVideoSession,
  handleGroups,
  handleSimplified,
  hideUserFromChannel,
  updateGroupificationData,
  updateSentimentData,
} from "../helpers";
import { cn, sentimentKeys } from "../utils";

export const Sentiment = () => {
  const navigate = useNavigate();
  const refresh_token = getCookie("refresh_token");
  const { sentimentKey, videoId } = useParams();
  const [searchParams] = useSearchParams();
  const sort = searchParams.get("sort");
  const max = searchParams.get("max");

  // Queries and Mutations

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
    refetchOnWindowFocus: false,
    enabled: !!refresh_token,
  });

  const { data: videoSession } = useQuery({
    queryKey: ["videoSession"],
    queryFn: () => getVideoSession(videoId, sort, max),
    refetchOnWindowFocus: false,
    enabled: !!videoId,
  });

  const [comments, setComments] = useState([]);

  // Queries and Mutations
  const { isFetching } = useQuery({
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

  const { data: recentSentiment, isFetching: isFetchingSentiment } = useQuery({
    queryKey: ["recentSentiment"],
    queryFn: () => getSentiment(videoSession.id),
    refetchOnWindowFocus: false,
    enabled: !!videoSession,
  });

  const { data: recentGroupification, isFetching: isFetchingGroupification } =
    useQuery({
      queryKey: [`recentGroupification-${sentimentKey}`],
      queryFn: () => getGroupification(recentSentiment.id, sentimentKey),
      refetchOnWindowFocus: false,
      enabled: !!recentSentiment,
    });

  const [sentiment, setSentiment] = useState(null);
  const [sentimentValue, setSentimentValue] = useState([]);

  useEffect(() => {
    if (!recentSentiment) return;
    setSentiment(recentSentiment.sentiment_data);
    if (sentiment && sentiment[sentimentKey])
      setSentimentValue(() =>
        getOriginalComments(comments, sentiment[sentimentKey]),
      );
  }, [comments, recentSentiment, sentiment, sentimentKey]);

  const [groupification, setGroupification] = useState(null);
  const [groupificationSortBy, setGroupificationSortBy] =
    useState("most-comments");

  useEffect(() => {
    if (!recentGroupification) return;
    const groupificationFormatter = async () => {
      const updatedGroupificationData = await Promise.all(
        recentGroupification.groupification_data.map(async (group) => ({
          ...group,
          group_of_comments: await getOriginalComments(
            comments,
            group?.group_of_comments,
          ),
        })),
      );

      setGroupification({
        ...recentGroupification,
        groupification_data: updatedGroupificationData,
      });
    };

    groupificationFormatter();
  }, [comments, recentGroupification]);

  // Queries and Mutations
  const { isPending, mutateAsync: generateGroups } = useMutation({
    mutationFn: async (sentimentValue) => {
      const simplified_comments = await handleSimplified(sentimentValue);
      return await handleGroups({ simplified_comments, sentimentValue });
    },
    onSuccess: async (data) => {
      const latestGroupification = data.map((group) => ({
        ...group,
        group_of_comments: group.group_of_comments.map(({ cid }) => cid),
      }));

      const generatedGroupification = await axios
        .post(
          `${backend_url}/api/groupification/${recentSentiment.id}/${sentimentKey}`, //getLastRecentSentiment.id as sentimentId as db.sentiment.id & // sentimentKey as (positives, negatives, questions, neutrals, comments)
          {
            videoId: videoSession.id, // videoId as db.video.id
            channelId: currentUser.id, //currentUser's channel id
            groupification_data: latestGroupification, //groupification data
          },
        )
        .then((res) => res.data);

      const updatedGroupificationData = await Promise.all(
        generatedGroupification.groupification_data.map(async (group) => ({
          ...group,
          group_of_comments: await getOriginalComments(
            comments,
            group?.group_of_comments,
          ),
        })),
      );

      setGroupification({
        ...generatedGroupification,
        groupification_data: updatedGroupificationData,
      });
      // console.log(latestGroupification);

      toast.custom(
        (t) => (
          <div
            onClick={() => {
              setTab(1);
              toast.dismiss(t.id);
            }}
            className={`${
              t.visible ? "animate-enter" : "animate-leave"
            } pointer-events-auto flex w-full max-w-md cursor-pointer flex-col overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5`}
          >
            <div className="flex w-full">
              <div className="w-0 flex-1 p-4">
                <div className="flex items-start">
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">Done 👍</p>
                    <p className="mt-1 text-sm text-gray-500">
                      Click here to check
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="animate-scale h-1 bg-red-500"></div>
          </div>
        ),
        {
          position: "bottom-right",
          duration: 10000,
        },
      );
    },
  });

  const [_dataCopy, set_dataCopy] = useState([]);

  const [tab, setTab] = useState(0);

  // operations states start
  const [isDeleting, setIsDeleting] = useState(false);
  const [isHiding, setIsHiding] = useState(false);

  const [showCheckboxes, setShowCheckboxes] = useState(false);
  const [selected, setSelected] = useState([]);
  // operations states end

  const handleHideUser = async (e) => {
    const { value } = e;

    if (
      value.some((comment) => comment.channel === currentUser.youtubeChannelId)
    ) {
      toast.error("You can't Ban yourself, Please unSelect your Comments");
      return;
    }

    const res = await hideUserFromChannel(value, setIsHiding);
    if (res[0].status !== 204) return;

    set_dataCopy(
      _dataCopy.filter(
        (com) => !value.some((comment) => comment.channel === com.channel),
      ),
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
    setSelected([]);
  };

  const handleRemove = async (e) => {
    const { value } = e;

    const res = await deleteComments(value, setIsDeleting);
    if (res[0].status !== 204) return;

    set_dataCopy(
      _dataCopy.filter(
        (com) => !value.some((comment) => comment.cid === com.cid),
      ),
    );

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
    setSelected([]);
  };

  // menu operations start
  const commonMenuOperations = [
    {
      label: "Hide user from channel",
      onClick: handleHideUser,
    },
    {
      label: "Delete",
      onClick: handleRemove,
    },
  ];

  // menu operations end

  // console.log(currentUser)
  // console.log(videoSession)
  if (isFetchingSentiment || isFetchingGroupification || isFetching)
    return (
      <div className="flex h-full w-full flex-col items-center justify-center">
        <Loader />
      </div>
    );

  if (!currentUser)
    return (
      <div className="flex h-full w-full flex-col items-center justify-center">
        User not Found
      </div>
    );

  if (!videoSession)
    return (
      <div className="flex h-full w-full flex-col items-center justify-center">
        VideoSession not Found
      </div>
    );

  return (
    <div className="flex h-full w-full flex-col space-y-2 overflow-hidden">
      <div className="flex min-h-10 w-full items-center justify-between px-4">
        {/* <div className="h-fit w-fit text-xl font-bold capitalize">
          {showCheckboxes
            ? `Selected - ${selected?.length}`
            : tab === 0
              ? `${sentimentKey?.slice(0, -1)} - ${sentimentValue?.length}`
              : `Categorize - ${groupification?.groupification_data?.length}`}
        </div> */}

        <button
          onClick={() => navigate(-1)}
          className="group flex h-fit w-fit items-center space-x-1"
        >
          <div
            className={cn(
              "border group-hover:bg-[#1D242E]",
              "flex min-h-10 min-w-10 items-center justify-center rounded-l-lg border-[#252C36] bg-[#0E1420] transition-colors",
            )}
          >
            <IoIosArrowBack className="h-5 w-5" />
          </div>
          <div
            className={cn(
              "border group-hover:bg-[#1D242E]",
              "flex h-10 w-fit items-center justify-center whitespace-nowrap rounded-r-lg border-[#252C36] bg-[#0E1420] px-6 transition-colors",
            )}
          >
            {showCheckboxes
              ? `Selected - ${selected?.length}`
              : tab === 0
                ? `${sentimentKey?.slice(0, -1)} - ${sentimentValue?.length}`
                : `Categorize - ${groupification?.groupification_data?.length}`}
          </div>
        </button>

        {groupification?.groupification_data?.length !== 0 && tab !== 0 && (
          <select
            onChange={(e) => setGroupificationSortBy(e.target.value)}
            className="select select-info select-sm w-fit focus:outline-none"
            value={groupificationSortBy}
          >
            <option
              value="most-comments"
              disabled={groupificationSortBy === "most-comments"}
            >
              Most Comments
            </option>
            <option
              value="most-likes"
              disabled={groupificationSortBy === "most-likes"}
            >
              Most Likes
            </option>
            <option
              value="most-replies"
              disabled={groupificationSortBy === "most-replies"}
            >
              Most Replies
            </option>
            <option value="time" disabled={groupificationSortBy === "time"}>
              Time
            </option>
          </select>
        )}
        {tab === 0 &&
          videoSession?.youtubeChannelId === currentUser?.youtubeChannelId &&
          _dataCopy.length > 1 && (
            <div className="flex h-fit w-fit items-center space-x-2">
              {showCheckboxes ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCheckboxes(false);
                      setSelected([]);
                    }}
                    className="h-fit rounded-full px-4 py-2 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:text-white/50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected((prev) =>
                        arraysAreEqual(prev, _dataCopy) ? [] : _dataCopy,
                      );
                    }}
                    className="h-fit rounded-full bg-blue-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-blue-600/50 disabled:text-white/50"
                  >
                    {arraysAreEqual(selected, _dataCopy)
                      ? "Unselect All"
                      : "Select All"}
                  </button>
                  {selected.length > 0 && (
                    <div className="flex h-fit w-fit items-center justify-start space-x-2">
                      <MenuComp
                        options={commonMenuOperations}
                        data={selected}
                        isPending={isDeleting || isHiding}
                      >
                        <BiDotsHorizontalRounded className="text-2xl" />
                      </MenuComp>
                    </div>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCheckboxes(true)}
                  className="h-fit rounded-full bg-blue-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-blue-600/50 disabled:text-white/50"
                >
                  Select
                </button>
              )}
            </div>
          )}
        {!groupification ||
        groupification?.groupification_data?.length === 0 ||
        tab === 1 ? (
          <button
            disabled={isPending}
            onClick={() => generateGroups(sentimentValue)}
            className="group flex h-fit w-fit items-center space-x-1"
          >
            <div
              className={cn(
                isPending
                  ? "border-0 text-zinc-500"
                  : "border group-hover:bg-[#1D242E]",
                "flex min-h-10 min-w-10 items-center justify-center rounded-l-lg border-[#252C36] bg-[#0E1420] transition-colors",
              )}
            >
              <FaLayerGroup className="h-4 w-4" />
            </div>
            <div
              className={cn(
                isPending
                  ? "border-0 text-zinc-500"
                  : "border group-hover:bg-[#1D242E]",
                "flex h-10 w-fit items-center justify-center whitespace-nowrap rounded-r-lg border-[#252C36] bg-[#0E1420] px-6 transition-colors",
              )}
            >
              {isPending ? (
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-zinc-400 border-t-blue-400/50" />
              ) : (
                <p>
                  {!groupification ||
                  groupification?.groupification_data?.length === 0
                    ? "Group to Reply"
                    : "ReRun"}
                </p>
              )}
            </div>
          </button>
        ) : null}
      </div>
      {groupification?.groupification_data?.length > 0 && (
        <div className="flex w-1/2 items-center rounded-lg border border-[#252C36] bg-[#0E1420] p-2">
          <button
            type="button"
            onClick={() => setTab(0)}
            className={cn(
              tab === 0 && "bg-[#1D242E]",
              "w-full rounded-lg px-4 py-2 hover:bg-[#1D242E] hover:bg-opacity-50",
            )}
          >
            Comments
          </button>
          <button
            type="button"
            onClick={() => setTab(1)}
            className={cn(
              tab === 1 && "bg-[#1D242E]",
              "w-full rounded-lg px-4 py-2 hover:bg-[#1D242E] hover:bg-opacity-50",
            )}
          >
            Groupification
          </button>
        </div>
      )}
      {tab === 0 ? (
        <CommentsComp
          currentUser={currentUser}
          videoSession={videoSession}
          list={sentimentValue}
          list_about={sentimentKey}
          showCheckboxes={showCheckboxes}
          selected={selected}
          setSelected={setSelected}
          _dataCopy={_dataCopy}
          set_dataCopy={set_dataCopy}
        />
      ) : (
        <RenderAccordion
          groupification={groupification}
          setGroupification={setGroupification}
          groupificationSortBy={groupificationSortBy}
          sentiment={sentiment}
          sentimentKey={sentimentKey}
          currentUser={currentUser}
          videoSession={videoSession}
        />
      )}
    </div>
  );
};
