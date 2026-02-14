import ChatCard from "@/components/chat-input";
import { IconInnerShadowTop } from "@tabler/icons-react";

export default function Page() {
  return (
    <>
      <div className="w-full flex flex-col text-center gap-5">
        <div className="flex flex-col justify-center items-center">
          <IconInnerShadowTop className="!size-20" />
          <h1 className="font-bold text-6xl text-sidebar-accent-foreground">QDoctor AI</h1>
        </div>
        <ChatCard />
      </div>
    </>
  )
}