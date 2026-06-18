"use client";

import { useParams } from "next/navigation";
import DiscussionChatClient from "./DiscussionChatClient";

export default function DiscussionChatPage() {
  const params = useParams();
  const discussionId = params?.id;

  return (
    <div className="p-3 md:p-6">
      <div className="w-full mx-auto">
       
        <DiscussionChatClient discussionId={discussionId} />
      </div>
    </div>
  );
}
