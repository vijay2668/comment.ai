import axios from "axios";
import exportFromJSON from "export-from-json";
import toast from "react-hot-toast";
import { FaRegUser } from "react-icons/fa";
import { FiThumbsUp } from "react-icons/fi";
import { Tooltip } from "./components/tooltip";

const backend_url = process.env.REACT_APP_BACKEND_URL;

function extractVideoId(url){
  // Regex pattern to match YouTube URLs
  // const regex =
  //   /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

  const regex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|user\/\S+|shorts\/|[^/]+\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

  // Extract video ID using regex
  const match = url.match(regex);

  if (match && match[1]) {
    return match[1]; // Return the video ID
  } else {
    return null; // Return null if no match is found
  }
};

function commentFormatter(comment){
  const formatedComment = {
    cid: comment.id,
    text: comment.snippet.topLevelComment.snippet.textDisplay,
    time: timeAgo(comment.snippet.topLevelComment.snippet.publishedAt),
    author: comment.snippet.topLevelComment.snippet.authorDisplayName,
    channel: comment.snippet.topLevelComment.snippet.authorChannelId.value,
    votes: comment.snippet.topLevelComment.snippet.likeCount,
    replies: comment.snippet.totalReplyCount,
    photo: comment.snippet.topLevelComment.snippet.authorProfileImageUrl,
    heart: comment.snippet.topLevelComment.snippet.canRate,
    reply: comment.snippet.canReply,
    publishedAt: formatDate(
      comment.snippet.topLevelComment.snippet.publishedAt
    )
  }

  return formatedComment
}

function replyFormatter(reply){
  const formatedReply = {
    cid: reply.id,
    parentId: reply.snippet.parentId,
    text: reply.snippet.textDisplay,
    time: timeAgo(reply.snippet.publishedAt),
    author: reply.snippet.authorDisplayName,
    channel: reply.snippet.authorChannelId.value,
    votes: reply.snippet.likeCount,
    replies: 0,
    photo: reply.snippet.authorProfileImageUrl,
    heart: reply.snippet.canRate,
    reply: true,
    publishedAt: formatDate(reply.snippet.publishedAt)
  }

  return formatedReply
}


async function fetchComments({ videoId, options }){
  try {
    const response = await axios.post(
      `${backend_url}/api/comments/${videoId}`,
      { options }
    ).then((res)=> res.data);

    const comments = [
      ...response.items.map((comment) => commentFormatter(comment)),
      ...(options?.replies
        ? response.items
            .filter((item) => Number(item.snippet.totalReplyCount) > 0)
            .flatMap((item) =>
              item.replies.comments.map((reply) => replyFormatter(reply))
            )
        : [])
    ]

    return comments
  } catch (err) {
    console.error("Error fetching comments:", err.message);
    toast.error(err.message)
  }
};

async function fetchRejectedComments({ videoId, options }){
  try {
    const response = await axios.post(
      `${backend_url}/api/rejected-comments/${videoId}`,
      { options }
    );

    const comments = [
      ...response.data.items.map((comment) => ({
        cid: comment.id,
        text: comment.snippet.topLevelComment.snippet.textDisplay,
        time: timeAgo(comment.snippet.topLevelComment.snippet.publishedAt),
        author: comment.snippet.topLevelComment.snippet.authorDisplayName,
        channel: comment.snippet.topLevelComment.snippet.authorChannelId.value,
        votes: comment.snippet.topLevelComment.snippet.likeCount,
        replies: comment.snippet.totalReplyCount,
        photo: comment.snippet.topLevelComment.snippet.authorProfileImageUrl,
        heart: comment.snippet.topLevelComment.snippet.canRate,
        reply: comment.snippet.canReply,
        publishedAt: formatDate(
          comment.snippet.topLevelComment.snippet.publishedAt
        )
      })),
      ...(options?.replies
        ? response.data.items
            .filter((item) => Number(item.snippet.totalReplyCount) > 0)
            .flatMap((item) =>
              item.replies.comments.map((reply) => ({
                cid: reply.id,
                text: reply.snippet.textDisplay,
                time: timeAgo(reply.snippet.publishedAt),
                author: reply.snippet.authorDisplayName,
                channel: reply.snippet.authorChannelId.value,
                votes: reply.snippet.likeCount,
                replies: 0,
                photo: reply.snippet.authorProfileImageUrl,
                heart: reply.snippet.canRate,
                reply: true,
                publishedAt: formatDate(reply.snippet.publishedAt)
              }))
            )
        : [])
    ]

    return comments
  } catch (err) {
    console.error("Error fetching rejected comments:", err.message);
    toast.error(err.message)
  }
};

// async function fetchComments({ input, setComments, options }){
//   try {
//     // Check if input exists and is not an empty string
//     if (
//       !input ||
//       typeof input !== "string" ||
//       input.trim() === "" ||
//       extractVideoId(input)?.length < 11 ||
//       extractVideoId(input) === null
//     ) {
//       setComments([]);
//       return;
//     }

//     const response = await axios.post(
//       `${backend_url}/api/comments/${extractVideoId(input)}`,
//       { options }
//     );

//     setComments([
//       ...response.data.items.map((comment) => ({
//         cid: comment.id,
//         text: comment.snippet.topLevelComment.snippet.textDisplay,
//         time: timeAgo(comment.snippet.topLevelComment.snippet.publishedAt),
//         author: comment.snippet.topLevelComment.snippet.authorDisplayName,
//         channel: comment.snippet.topLevelComment.snippet.authorChannelId.value,
//         votes: comment.snippet.topLevelComment.snippet.likeCount,
//         replies: comment.snippet.totalReplyCount,
//         photo: comment.snippet.topLevelComment.snippet.authorProfileImageUrl,
//         heart: comment.snippet.topLevelComment.snippet.canRate,
//         reply: comment.snippet.canReply,
//         publishedAt: formatDate(
//           comment.snippet.topLevelComment.snippet.publishedAt
//         )
//       })),
//       ...(options?.replies
//         ? response.data.items
//             .filter((item) => Number(item.snippet.totalReplyCount) > 0)
//             .flatMap((item) =>
//               item.replies.comments.map((reply) => ({
//                 cid: reply.id,
//                 text: reply.snippet.textDisplay,
//                 time: timeAgo(reply.snippet.publishedAt),
//                 author: reply.snippet.authorDisplayName,
//                 channel: reply.snippet.authorChannelId.value,
//                 votes: reply.snippet.likeCount,
//                 replies: 0,
//                 photo: reply.snippet.authorProfileImageUrl,
//                 heart: reply.snippet.canRate,
//                 reply: true,
//                 publishedAt: formatDate(reply.snippet.publishedAt)
//               }))
//             )
//         : [])
//     ]);
//   } catch (error) {
//     console.error("Error fetching comments:", error.message);
//     setComments([]);
//   }
// };

async function handleCategorize(comments){
  try {
    const sentiment = await axios.post(`${backend_url}/api/categorize`, {
      comments: JSON.stringify(comments)
    }).then((res)=> res.data);

    return sentiment
  } catch (error) {
    console.error("Error Categorization:", error.message);
  }
};

// async function handleCategorize({ comments, setCategorize }){
//   try {
//     const response = await axios.post("${backend_url}/api/categorize", {
//       comments
//     });

//     setCategorize(response.data);
//     console.log(response.data);
//   } catch (error) {
//     console.error("Error Categorization:", error.message);
//   }
// };

async function handleSimplified(sentimentValue){
  try {
    const response = await axios.post(`${backend_url}/api/simplified`, {
      sentiment: sentimentValue
    });

    // console.log(response.data);
    return response.data;
  } catch (error) {
    console.error("Error Simplified:", error.message);
    toast.error(error.message)
  }
};

// async function handleSimplified({ questions, setCategorize }){
//   try {
//     const response = await axios.post("${backend_url}/api/simplified", {
//       questions
//     });

//     console.log(response.data);

//     setCategorize((prev) => {
//       const updatedQuestions = prev.questions.map((question) => ({
//         cid: question.cid,
//         text: question.text,
//         simplified_comment:
//           response.data[
//             response.data.findIndex((item) => item.cid === question.cid)
//           ].simplified_comment
//       }));

//       return {
//         ...prev,
//         questions: updatedQuestions
//       };
//     });
//     // console.log(response.data.split("\n").filter((item)=> item.includes("- '")));
//   } catch (error) {
//     console.error("Error Simplified:", error.message);
//   }
// };

async function handleGroups({ simplified_comments, sentimentValue }){
  try {
    const response = await axios.post(`${backend_url}/api/groups`, {
      simplified_comments
    });

    // console.log(response.data);
    
    const data = 
      response.data
        .map((group) => {
          let newGroup = { ...group };
          newGroup.group_of_comments = newGroup?.group_of_comments?.filter(
            (comment) =>
              sentimentValue.some((item) => item?.cid === comment?.cid)
          );
          return newGroup.group_of_comments.length !== 0 ? newGroup : null;
        })
        .filter(Boolean)
    
    return data
  } catch (error) {
    console.error("Error during Groups:", error.message);
    toast.error(error.message)
  }
};

// async function handleGroups({ questions, setGroups, setTextarea }){
//   try {
//     const response = await axios.post("${backend_url}/api/groups", {
//       simplified_comments: questions.map((question) => ({
//         cid: question.cid,
//         simplified_comment: question.simplified_comment
//       }))
//     });

//     console.log(response.data);
//     setGroups(
//       response.data
//         .map((group) => {
//           let newGroup = { ...group };
//           newGroup.group_of_comments = newGroup?.group_of_comments?.filter(
//             (comment) =>
//               questions.some((question) => question?.cid === comment?.cid)
//           );
//           return newGroup.group_of_comments.length !== 0 ? newGroup : null;
//         })
//         .filter(Boolean)
//     );

//     setTextarea(response.data.map(() => ""));
//   } catch (error) {
//     console.error("Error Groups:", error.message);
//   }
// };

async function getAccessToken() {
  const refresh_token =  getCookie('refresh_token');
    let access_token =  getCookie('access_token');
    
    if(!access_token) {
      const response = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
        client_id: process.env.REACT_APP_CLIENT_ID,
        client_secret: process.env.REACT_APP_CLIENT_SECRET,
        refresh_token,
        grant_type: 'refresh_token',
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { access_token: newAccessToken, expires_in } = response.data;

      access_token = newAccessToken;
      
      const expiresAt = new Date(Date.now() + expires_in * 1000);
      document.cookie = `access_token=${access_token}; expires=${expiresAt.toUTCString()}; path=/`;
    }

    return access_token
}

async function replies(group, setIsPending, reply){
  try {
    setIsPending(true)
    const access_token = await getAccessToken()

    const promises = group?.map(async (comment) => {
      const response = await axios.post(`https://youtube.googleapis.com/youtube/v3/comments?part=snippet&key=${process.env.REACT_APP_API_KEY}`, {
        "snippet": {
          "parentId": comment?.cid,
          "textOriginal": reply
        }
      }, {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })

      
      return response.data
    });

    const results = await Promise.all(promises);
    // console.log(results);
    return results
  } catch (err) {
    console.error("Error inserting comments", err.message);
    toast.error(err.message)
    setIsPending(false)
  } finally {
    toast.success("Reply sent successfully to this group");
    setIsPending(false)
  }
};

const replaceUsernameToChannelId = (text, comment) => {
  const regex = /@(\w+)/;
  const match = text.match(regex);
  if (match && match[1]) {
    const username = match[1];
    return text.replace(`@${username}`, `@${comment?.channel}`);
  }
  return text
}


async function reply(comment, setRespond, reply){
  try {
    setRespond((prev) => ({ ...prev, isResponding: true }))
    const access_token = await getAccessToken()

    const response = await axios.post(`https://youtube.googleapis.com/youtube/v3/comments?part=snippet&key=${process.env.REACT_APP_API_KEY}`, {
      "snippet": {
        "parentId": comment?.parentId ? comment?.parentId : comment?.cid,
        "textOriginal": replaceUsernameToChannelId(reply, comment) 
      }
    }, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })

    
    return response.data
  } catch (err) {
    console.error("Error replying comment", err.message);
    toast.error(err.message)
    setRespond((prev) => ({ ...prev, isResponding: false }))
  } finally {
    toast.success("Reply sent successfully to this Comment");
    setRespond({ isResponding: false, showTextarea: false, comment: null });
  }
};

async function deleteComments(group, setIsDeleting){
  try {
    setIsDeleting(true)
    const access_token = await getAccessToken()
    const currentUser = await getCurrentUser()

    const promises = group?.map(async (comment) => {
      const { cid, channel } = comment;
      if (currentUser.youtubeChannelId === channel) {
        const response = await axios.delete(`https://youtube.googleapis.com/youtube/v3/comments?id=${cid}&key=${process.env.REACT_APP_API_KEY}`, {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Accept': 'application/json'
          }
        })
        
        return response
      } else {
        const response = await axios.post(`https://youtube.googleapis.com/youtube/v3/comments/setModerationStatus?id=${cid}&moderationStatus=rejected&key=${process.env.REACT_APP_API_KEY}`, {}, {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Accept': 'application/json'
          }
        })
      
        return response
      }
    });

    const results = await Promise.all(promises);
    // console.log(results);
    return results
  } catch (err) {
    console.error("Error deleting comments", err.message);
    toast.error(err.message)
    setIsDeleting(false)
  } finally {
    toast.success(`${group?.length === 1 ? "Comment": "Comments"} deleted successfully!`);
    setIsDeleting(false)
  }
};

async function updateComment(comment, setUpdate, value, mentionedUserComment){
  try {
    setUpdate((prev) => ({ ...prev, isUpdating: true }))
    const access_token = await getAccessToken()

    const { cid } = comment;
    
    const response = await axios.put(`https://youtube.googleapis.com/youtube/v3/comments?part=snippet&key=${process.env.REACT_APP_API_KEY}`, {
      "id": cid,
      "snippet": {
        "textOriginal": mentionedUserComment ? replaceUsernameToChannelId(value, mentionedUserComment) : value
      }
    },
    {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })

    return response.data
    // console.log(response.data);
  } catch (err) {
    console.error("Error updating comment", err.message);
    toast.error(err.message)
    setUpdate((prev) => ({ ...prev, isUpdating: false }))
  } finally {
    toast.success("Comment updated successfully!")
    setUpdate({ isUpdating: false, showTextarea: false, comment: null });
  }
};

async function hideUserFromChannel(comments, setIsHiding){
  try {
    setIsHiding(true)
    const access_token = await getAccessToken()

    const promises = comments?.map(async ({ cid }) => {
      const response = await axios.post(`https://youtube.googleapis.com/youtube/v3/comments/setModerationStatus?id=${cid}&moderationStatus=rejected&banAuthor=true&key=${process.env.REACT_APP_API_KEY}`, {}, {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Accept': 'application/json'
        }
      })

      return response
    })
    
    const results = await Promise.all(promises);
    return results
  } catch (err) {
    console.error("Error hidding user comments", err.message);
    toast.error(err.message)
    setIsHiding(false)
  } finally {
    toast.success(`User Comments got Hidden successfully!`);
    setIsHiding(false)
  }
};

// async function reply(group){
//   try {
//     const refresh_token =  getCookie('refresh_token');
//     let access_token =  getCookie('access_token');
    
//     if(!access_token) {
//       const response = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
//         client_id: process.env.REACT_APP_CLIENT_ID,
//         client_secret: process.env.REACT_APP_CLIENT_SECRET,
//         refresh_token,
//         grant_type: 'refresh_token',
//       }), {
//         headers: {
//           'Content-Type': 'application/x-www-form-urlencoded',
//         },
//       });

//       const { access_token: newAccessToken, expires_in } = response.data;

//       access_token = newAccessToken;
      
//       const expiresAt = new Date(Date.now() + expires_in * 1000);
//       document.cookie = `access_token=${access_token}; expires=${expiresAt.toUTCString()}; path=/`;
//     }

//     const promises = group?.group_of_comments.map(async (comment) => {
//       const response = await axios.post(`https://youtube.googleapis.com/youtube/v3/comments?part=snippet&key=${process.env.REACT_APP_API_KEY}`, {
//         "snippet": {
//           "parentId": comment?.cid,
//           "textOriginal": group?.reply
//         }
//       }, {
//         headers: {
//           'Authorization': `Bearer ${access_token}`,
//           'Content-Type': 'application/json',
//           'Accept': 'application/json'
//         }
//       })

      
//       return response.data
//     });

//     const results = await Promise.all(promises);
//     console.log(results);
//   } catch (err) {
//     console.error("Error inserting comments", err.message);
//     toast.error(err.message)
//   } finally {
//     toast.success("Reply sent successfully to this group");
//   }
// };

function download({ data, type, fields, fileName }){
  let exportType;

  switch (type) {
    case "txt":
      exportType = exportFromJSON.types.txt;
      break;
    case "html":
      exportType = exportFromJSON.types.html;
      break;
    case "json":
      exportType = exportFromJSON.types.json;
      break;
    case "csv":
      exportType = exportFromJSON.types.csv;
      break;
    case "xls":
      exportType = exportFromJSON.types.xls;
      break;
    default:
      alert("Please enter a valid file type eg: json");
      return;
  }

  exportFromJSON({ data, fileName, fields, exportType });
}

function timeAgo(publishedAt){
  const now = new Date();
  const publishedDate = new Date(publishedAt);
  const diffInSeconds = Math.floor((now - publishedDate) / 1000);

  const units = [
    { name: "year", seconds: 31536000 },
    { name: "month", seconds: 2592000 },
    { name: "week", seconds: 604800 },
    { name: "day", seconds: 86400 },
    { name: "hour", seconds: 3600 },
    { name: "minute", seconds: 60 },
    { name: "second", seconds: 1 }
  ];

  for (const unit of units) {
    const interval = Math.floor(diffInSeconds / unit.seconds);
    if (interval >= 1) {
      return `${interval} ${unit.name}${interval !== 1 ? "s" : ""} ago`;
    }
  }

  return "just now";
}

function formatDate(isoString){
  // Create a Date object from the ISO string
  const date = new Date(isoString);

  // Extract date components
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are zero-indexed
  const year = String(date.getFullYear()).slice(-2); // Get last two digits of the year

  // Extract time components
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");

  // Format the time as hh:mm:ss
  const time = `${hours}:${minutes}:${seconds}`;

  // Return the formatted date string
  return `${day}-${month}-${year} @${time}`;
}

function getCookie(name){
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith(`${name}=`)) {
      return cookie.replace(`${name}=`, "");
    }
  }
  return null;
}

async function getTokenInfo(accessToken){
  const response = await fetch(
    `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`,
  );
  if (!response.ok) {
    throw new Error("Failed to get token info");
  }
  const tokenInfo = await response.json();
  return tokenInfo;
}

function getSessionStorage(name){
  return JSON.parse(sessionStorage.getItem(name)) || null;
}

// Helper functions to render table rows
const renderRow = (comments, index, style) => (
  <div
    key={index}
    style={style}
    className="flex h-fit w-full items-center space-x-4 px-4 py-2"
  >
    <div className="flex w-full items-center space-x-4 overflow-hidden">
      <div className="flex min-h-10 min-w-10 items-center justify-center rounded-full border border-[#252C36] text-[#7D828F]">
        <FaRegUser className="text-lg" />
      </div>
      <div className="flex flex-col space-y-1 overflow-hidden">
        <div className="scrollbar-hide w-full overflow-scroll space-x-2 flex items-center whitespace-nowrap text-sm">
          <span>{comments[index]?.author}</span>
          <span className="text-[#7D828F]">{comments[index]?.time}</span>
        </div>
        <div className="w-full overflow-scroll scrollbar-hide font-thin whitespace-nowrap">
          {comments[index]?.text}
        </div>
      </div>
    </div>
    <div className="flex min-w-fit items-center justify-start space-x-2">
      <Tooltip content="Like Count">
        <div className="flex min-w-fit items-center justify-start space-x-2">
          <span>{comments[index]?.votes}</span>
          <div>
            <FiThumbsUp className="text-green-500" />
          </div>
        </div>
      </Tooltip>
    </div>
  </div>
);

function timeSince(date) {
  const now = new Date();
  const past = new Date(date);
  const secondsPast = Math.floor((now - past) / 1000);

  const years = Math.floor(secondsPast / (365.25 * 24 * 60 * 60));
  if (years > 0) return years + (years === 1 ? " year" : " years");

  const months = Math.floor(secondsPast / (30.44 * 24 * 60 * 60));
  if (months > 0) return months + (months === 1 ? " month" : " months");

  const days = Math.floor(secondsPast / (24 * 60 * 60));
  if (days > 0) return days + (days === 1 ? " day" : " days");

  const hours = Math.floor(secondsPast / (60 * 60));
  if (hours > 0) return hours + (hours === 1 ? " hour" : " hours");

  const minutes = Math.floor(secondsPast / 60);
  if (minutes > 0) return minutes + (minutes === 1 ? " minute" : " minutes");

  return secondsPast + (secondsPast === 1 ? " second" : " seconds");
}

function formatNumber(num) {
  if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1) + 'B';
  }
  if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}

const linkRegex = /(https?\:\/\/)?(www\.)?[^\s]+\.[^\s]+/g;

function replacer(matched) {
  let withProtocol = matched;

  if (!withProtocol.startsWith("http")) {
    withProtocol = "http://" + matched;
  }

  const newStr = `<a
    class="text-link"
    href="${withProtocol}"
  >
    ${matched}
  </a>`;

  return newStr;
}

function sortByCid(array) {
  return array.sort((a, b) => (a.cid > b.cid ? 1 : -1));
}

function arraysAreEqual(array1, array2) {
  if (array1.length !== array2.length) {
    return false;
  }

  const sortedArray1 = sortByCid([...array1]);
  const sortedArray2 = sortByCid([...array2]);

  for (let i = 0; i < sortedArray1.length; i++) {
    if (
      sortedArray1[i].cid !== sortedArray2[i].cid ||
      sortedArray1[i].text !== sortedArray2[i].text
    ) {
      return false;
    }
  }

  return true;
}

// Function to transform text with link
function transformTextWithLink(text) {
  const regex = /@@(\w+)/g;
  const parts = text.split(regex);
  
  return parts.map((part, index) => {
      if (index % 2 === 1) { // Every odd index will be the username
          return (
              <a key={index} target="_blank" rel="noreferrer" href={`https://www.youtube.com/@${part}`} className="text-blue-400">
                  @{part}
              </a>
          );
      }
      return part; // Regular text parts
  });
}

// function to fetch currentUser
async function getCurrentUser() {
  const access_token = await getAccessToken()

   const channelId = await axios
          .get(
            `https://www.googleapis.com/youtube/v3/channels?part=id&mine=true`,
            {
              headers: {
                Authorization: `Bearer ${access_token}`,
                Accept: "application/json",
              },
            },
          )
          .then((res) => res.data.items[0].id);

                
  const currentUserChannel = await axios.get(`${backend_url}/api/channel/${channelId}`).then((res)=> res.data);
  return currentUserChannel;
}

async function getVideoSession(youtubeVideoId, sort, max) {
  const currentVideoSession = await axios.get(`${backend_url}/api/video/${youtubeVideoId}?sort=${sort}&max=${max}`).then((res)=> res.data);
  return currentVideoSession;
}

async function getAllVideoSession(channelId) {
  const allVideoSession = await axios.get(`${backend_url}/api/videos/${channelId}`).then((res)=> res.data);
  return allVideoSession;
}

async function getSentiment(videoId) {
  const sentiment = await axios.get(`${backend_url}/api/sentiment/${videoId}`).then((res)=> res.data);
  return sentiment;
}

async function getGroupification(sentimentId, sentimentKey) {
  const groupification = await axios.get(`${backend_url}/api/groupification/${sentimentId}/${sentimentKey}`).then((res)=> res.data);
  return groupification;
}

const parseDate = (dateString) => {
  const [datePart, timePart] = dateString.split(' @');
  const [day, month, year] = datePart.split('-').map(Number);
  const [hour, minute, second] = timePart.split(':').map(Number);
  return new Date(year + 2000, month - 1, day, hour, minute, second);
};

const getMostRecentDate = (group) =>
  Math.max(
    ...group?.map((group_of_comment) => {
      return group_of_comment ? parseDate(group_of_comment?.publishedAt) : new Date(0);
    }),
  );

const getTotalVotes = (group) =>
  group?.reduce((total, group_of_comment) => {
    return total + (group_of_comment?.votes || 0);
  }, 0);

const getTotalReplies = (group) =>
  group?.reduce((replies, group_of_comment) => {
    return replies + (group_of_comment?.replies || 0);
  }, 0);

const groupificationSortByHelper = (groupification_data, groupificationSortBy) => {
  return groupification_data?.sort((a, b) => {
    if (groupificationSortBy === "most-likes") {
      // Sum the votes for each group of comments
      return (
        getTotalVotes(b?.group_of_comments) -
        getTotalVotes(a?.group_of_comments)
      );
    } else if (groupificationSortBy === "most-replies") {
      // Find the most recent publishedAt in each group of comments
      return (
        getTotalReplies(b?.group_of_comments) -
        getTotalReplies(a?.group_of_comments)
      );
    } else if (groupificationSortBy === "time") {
      // Find the most recent publishedAt in each group of comments
      return (
        getMostRecentDate(b?.group_of_comments) -
        getMostRecentDate(a?.group_of_comments)
      );
    } else {
      // Default sorting by number of comments in each group
      // console.log(list)
      return b?.group_of_comments?.length - a?.group_of_comments?.length;
    }
  })
}

function getOriginalComments(a, b) {
  return a?.filter((comment) => b?.some((cid) => cid === comment?.cid));
}

function groupificationGeneratedToast(setTab) {
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
}

const fetchCommentsDetails = async (list) => {
  const cids = list.join("%2C");

  const getCommentIdsDetails = await axios
    .get(
      `https://youtube.googleapis.com/youtube/v3/comments?part=snippet&id=${cids}&key=${process.env.REACT_APP_API_KEY}`,
    )
    .then((res) => res.data.items);

  const results = getCommentIdsDetails.map((comment) => ({
    cid: comment.id,
    channel: comment.snippet.authorChannelId.value,
  }));

  return results;
};

const fetchModifiedCommentsDetails = async (array, commentKey, conditionWith) => {
  const fetchedCommentsDetails = await fetchCommentsDetails(array);
  return fetchedCommentsDetails
    .filter((com) => !conditionWith.some((comment) => comment[commentKey] === com[commentKey]))
    .map(({ cid }) => cid);
};

const updateSentimentData = async (sentiment, commentKey, conditionWith, sentimentId) => {
  const modifiedSentimentData = {};

  for (const [key, array] of Object.entries(sentiment)) {
    modifiedSentimentData[key] = await fetchModifiedCommentsDetails(array, commentKey, conditionWith);
  }

  await axios.patch(`${backend_url}/api/sentiment/${sentimentId}`, {
    sentiment_data: modifiedSentimentData,
  });
};

const updateGroupificationData = async (groupifications, commentKey, conditionWith) => {
  for (const groupification of groupifications) {
    const modifiedGroupificationData = await Promise.all(
      groupification.groupification_data.map(async (group) => {
        const groupComments = await fetchModifiedCommentsDetails(group.group_of_comments, commentKey, conditionWith);
        return { ...group, group_of_comments: groupComments };
      })
    );

    await axios.patch(`${backend_url}/api/groupification/${groupification.id}`, {
      groupification_data: modifiedGroupificationData,
    });
  }
};

export {
  backend_url, fetchCommentsDetails, getAllVideoSession, commentFormatter, replyFormatter, getOriginalComments, groupificationGeneratedToast, parseDate, groupificationSortByHelper, arraysAreEqual, deleteComments, download, extractVideoId, fetchComments, fetchRejectedComments, formatDate, formatNumber, getAccessToken, getCookie, getCurrentUser, getVideoSession, getSentiment, getGroupification, getSessionStorage, getTokenInfo, handleCategorize, handleGroups, handleSimplified, linkRegex, hideUserFromChannel, renderRow, replacer, replies,
  reply, timeAgo, timeSince, transformTextWithLink, updateComment
};

export { fetchModifiedCommentsDetails, updateSentimentData, updateGroupificationData }