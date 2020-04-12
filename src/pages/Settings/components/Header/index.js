import React from "react";

export default function Header({text, className}) {
    return (
        <h5 className={className + " pl-3"}>
            <span>{text}</span>
        </h5>
    )
}
