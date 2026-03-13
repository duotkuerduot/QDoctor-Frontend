import ChatScreen from "@/components/ChatScreen";
import { Suspense } from "react";

export default function NewPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChatScreen />
    </Suspense>
  );
}