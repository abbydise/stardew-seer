'use client'

import { useState, SubmitEvent, ChangeEvent } from 'react';

export default function Textbox({handleSubmit} : {handleSubmit: (question : string) =>  void}) {
    const [value, setValue ] = useState("");

    const handleInput = (event : SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();

        handleSubmit(value);
        setValue("");
    }

    const handleChange = (event : ChangeEvent<HTMLInputElement, HTMLInputElement>) => {
        const input = event.target.value;
        setValue(input);
    }

    return (
        <div>
            <form onSubmit={handleInput}>
                <input type="text" placeholder="Ask a question..." onChange={handleChange} value={value}/>
                <button type="submit">Submit</button>
            </form>
        </div>
    )
}