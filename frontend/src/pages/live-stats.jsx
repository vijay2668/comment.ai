import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState, useEffect } from "react";
import { Loader } from "../components/loader/loader";
import { useParams } from "react-router-dom";
import { formatNumber, timeSince } from "../helpers";
import Odometer from "react-odometerjs";
import { cn } from "../utils";
import "odometer/themes/odometer-theme-default.css"; // Change 'default' to any other available theme name

const LiveStats = () => {
  const { videoId } = useParams();
  const [isViewsUpdated, setIsViewsUpdated] = useState(false);
  const [isSubsUpdated, setIsSubsUpdated] = useState(false);
  const [showLive, setShowLive] = useState(false);

  const getChannelId = async () => {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${process.env.REACT_APP_API_KEY}`;
    const response = await axios.get(url);
    const id = response.data.items[0].snippet.channelId;
    return id;
  };

  const getChannel = async () => {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics,contentOwnerDetails,id,localizations,status,topicDetails&id=${channelId}&key=${process.env.REACT_APP_API_KEY}`;
    const response = await axios.get(url);
    return response.data.items[0];
  };

  const getChannelBanner = async () => {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=brandingSettings&id=${channelId}&key=${process.env.REACT_APP_API_KEY}`;
    const response = await axios.get(url);
    // console.log(response.data);
    return response.data.items[0].brandingSettings.image.bannerExternalUrl;
  };

  // Queries and Mutations
  const { data: channelId, isFetched: channelIdIsFetched } = useQuery({
    queryKey: ["channelId"],
    queryFn: getChannelId,
  });

  const { data: channelBannerUrl, isFetched: channelBannerIsFetched } =
    useQuery({
      queryKey: ["channelBannerUrl"],
      queryFn: getChannelBanner,
      enabled: !!channelId, // Ensure it only runs if channelId is fetched
    });

  const { data: channel, isFetched: channelIsFetched } = useQuery({
    queryKey: ["channel"],
    queryFn: getChannel,
    enabled: !!channelId, // Ensure it only runs if channelId is fetched
  });

  const { data: stats, isFetched: statsIsFetched } = useQuery({
    queryKey: ["youtube_channel_stats"],
    queryFn: async () => {
      const response = await axios
        .get(
          `https://api.socialcounts.org/youtube-live-subscriber-count/${channelId}`,
        )
        .then((res) => ({
          subscribers: res.data.est_sub,
          channel_views: res.data.table[0].count,
        }));

      return response;
    },
    refetchInterval: 5000,
    enabled: !!channelId, // Ensure it only runs if channelId is fetched
    // onSuccess: () => ,
  });

  const { subscribers, channel_views } = stats || {};

  useEffect(() => {
    if (channel_views) {
      setIsViewsUpdated(true);
      setTimeout(() => setIsViewsUpdated(false), 1500);
    }
  }, [channel_views]);

  useEffect(() => {
    if (subscribers) {
      setIsSubsUpdated(true);
      setTimeout(() => setIsSubsUpdated(false), 1500);
    }
  }, [subscribers]);

  // Render loading state
  if (
    !channelIdIsFetched ||
    !channelBannerIsFetched ||
    !channelIsFetched ||
    !statsIsFetched
  )
    return (
      <div className="flex h-full w-full flex-col items-center justify-center">
        <Loader />
      </div>
    );

  // console.log(channel);
  // console.log(isViewsUpdated);

  return (
    <div className="flex h-full w-full flex-col space-y-6 overflow-scroll overflow-x-hidden">
      {/* row one */}
      <div className="flex min-h-[22rem] w-full flex-col space-y-8 rounded-2xl border border-[#252C36] bg-[#0E1420] p-4">
        <div className="flex flex-col">
          <div className="relative h-fit w-full">
            <img
              className="h-[200px] w-full rounded-2xl object-cover"
              alt="channel banner"
              src={channelBannerUrl}
            />
            <div className="absolute left-20 top-3/4 flex h-fit w-fit flex-col">
              <span className="relative flex h-fit w-fit shrink-0 overflow-hidden rounded-full">
                <img
                  className="aspect-square h-full w-full"
                  style={{
                    width: `${channel?.snippet?.thumbnails?.default?.width + 30}px`,
                    height: `${channel?.snippet?.thumbnails?.default?.height + 30}px`,
                  }}
                  alt={channel?.snippet?.customUrl}
                  src={channel?.snippet?.thumbnails?.default?.url}
                />
              </span>
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-bold">
                    {channel?.snippet?.title}
                  </h1>
                  <span className="font-mono text-sm">
                    {channel?.snippet?.country
                      ? channel?.snippet?.country
                      : "NA"}
                  </span>
                </div>
                <div className="text-[#7D828F]">
                  {channel?.snippet?.customUrl}{" "}
                  <span>{channel?.statistics?.videoCount} videos</span>
                </div>
              </div>
            </div>
          </div>
          <div className="ml-auto flex h-40 w-3/6 items-center justify-end space-x-4">
            <div
              onMouseEnter={() => setShowLive(true)}
              onMouseLeave={() => setShowLive(false)}
              className="flex h-full w-full flex-col items-center space-y-2 rounded-2xl p-4"
            >
              <h4 className="mt-2 font-semibold text-white">Subscribers</h4>
              <h3
                className={cn(
                  showLive && isSubsUpdated && "text-green-500",
                  "text-3xl font-bold transition-colors duration-500 ease-in-out",
                )}
              >
                {showLive ? (
                  <Odometer value={subscribers} format="(,ddd),dd" />
                ) : (
                  formatNumber(channel?.statistics?.subscriberCount)
                )}
              </h3>
            </div>
            <div
              onMouseEnter={() => setShowLive(true)}
              onMouseLeave={() => setShowLive(false)}
              className="flex h-full w-full flex-col items-center space-y-2 p-4"
            >
              <h4 className="mt-2 font-semibold text-white">Views</h4>
              <h3
                className={cn(
                  showLive && isViewsUpdated && "text-green-500",
                  "text-3xl font-bold transition-colors duration-500 ease-in-out",
                )}
              >
                {showLive ? (
                  <Odometer value={channel_views} format="(,ddd),dd" />
                ) : (
                  formatNumber(channel?.statistics?.viewCount)
                )}
              </h3>
            </div>
          </div>
        </div>
      </div>
      {/* row two */}

      {/* row third */}
      <div className="flex h-full w-full flex-col divide-y divide-[#252C36] rounded-2xl border border-[#252C36] bg-[#0E1420]">
        <div className="flex h-fit w-full items-center justify-between px-4 py-2">
          <div className="flex w-full flex-1 flex-col items-center justify-center space-y-2">
            <img
              src={`https://flagsapi.com/${channel?.snippet?.country}/flat/64.png`}
              alt={channel?.snippet?.country}
            />
          </div>
          <div className="flex w-full flex-1 flex-col items-center justify-center space-y-2">
            <p className="text-[#7D828F]">Category</p>
            <p>
              {channel?.topicDetails?.topicCategories?.[1]?.split("/")?.pop()}
            </p>
          </div>
          <div className="flex w-full flex-1 flex-col items-center justify-center space-y-2">
            <p className="text-[#7D828F]">Channel Age</p>
            <p>{timeSince(channel?.snippet?.publishedAt)}</p>
          </div>
        </div>
        <div className="h-full w-full whitespace-pre-line p-4 overflow-y-scroll">
          <span className="text-2xl">About</span>
          <br />
          <br />
          <p className="text-white/80">{channel?.snippet?.description}</p>
        </div>
      </div>
    </div>
  );
};

export default LiveStats;
