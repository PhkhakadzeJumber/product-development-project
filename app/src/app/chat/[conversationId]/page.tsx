"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { FeedbackChatApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, inputCls } from "@/components/ui";
import { fmtTime } from "@/lib/format";

export default function ChatPage({ params }: { params: { conversationId: string } }) {
  const id = Number(params.conversationId);
  const { userId } = useAuth();
  const { data } = useQuery({ queryKey: ["messages", id], queryFn: () => FeedbackChatApi.messages(id), refetchInterval: 5000 });
  const [body, setBody] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [data?.length]);
  const send = useMutation({
    mutationFn: () => FeedbackChatApi.send(id, body || undefined),
    onSuccess: () => setBody(""),
  });

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!body.trim() || send.isPending) return;
    send.mutate();
  }

  return <div className="max-w-2xl mx-auto space-y-4">
    <div><h1 className="text-2xl font-bold">Chat #{id}</h1>
    <p className="text-sm text-slate-500">Messages refresh every 5 seconds.</p></div>
    <Card className="p-4 h-[480px] overflow-y-auto space-y-2 bg-slate-50/60">
      {(data ?? []).map((m) => {
        const mine = userId !== null && m.sender_id === userId;
        return <div key={m.message_id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
          <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${mine ? "bg-teal-600 text-white rounded-br-md" : "bg-white border border-slate-200 rounded-bl-md"}`}>
            <p>{m.body ?? "📎 attachment"}</p>
            <p className={`text-[11px] mt-1 ${mine ? "text-teal-100" : "text-slate-400"}`}>{m.sent_at ? fmtTime(m.sent_at) : ""}</p>
          </div>
        </div>;
      })}
      {!data?.length && <p className="text-center text-sm text-slate-400 py-10">No messages yet — say hello 👋</p>}
      <div ref={bottom} />
    </Card>
    <form onSubmit={submit} className="flex gap-2">
      <input className={inputCls} value={body} onChange={(e) => setBody(e.target.value)}
        placeholder="Type a message… (Enter to send)" aria-label="Message" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) submit(e); }} />
      <button disabled={!body.trim() || send.isPending} className="bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-semibold px-5 rounded-xl">Send</button>
    </form>
  </div>;
}
