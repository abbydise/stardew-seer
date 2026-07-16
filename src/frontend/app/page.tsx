'use client'

import Textbox from '../components/Textbox';
import Chatbox from '../components/Chatbox';

import { useState } from 'react';

export type Message = {
    origin: "user" | "system",
    content: string
}

export default function Home() {
    const [messageHistory, setMessageHistory ] = useState<Array<Message>>([]);

    const handleSubmit = async (question : string) => {
        const body : Message = {origin: "user", content: question};

        setMessageHistory((prev) => [...prev, body]);

        const response = await fetch('/api/response', {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                "Content-Type": 'application/json'
            }
        })

        if (response.ok) {
            const content = await response.json();
            const answer = content.answer;

            setMessageHistory((prev) => [...prev, {origin: 'system', content: answer}]);
        } else {
            const content = await response.json();
            const error = content.error;
            console.error(error);

            setMessageHistory((prev) => [...prev, {origin: 'system', content: 'An error has occurred. Please try again.'}]);
        }
    }

  return (
      <div className="ml-auto mr-auto">
        <h1>Home Page</h1>
          <div className="messageHistory"><Chatbox messages={messageHistory} /></div>
          <div className="form"><Textbox handleSubmit={handleSubmit}/></div>
      </div>
  )
}