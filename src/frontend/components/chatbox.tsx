'use client'

import type { Message } from '../app/page.tsx';

export default function Chatbox ({messages} : {messages : Array<Message>}) {
    return (
        messages.map((message, index) => (
            <div key={index} className={message.origin === "user" ? "user-message" : "system-message"}>
                <p>{message.content}</p>
            </div>
        ))
    )
}