import * as React from 'react';
import {useState} from "react";

export function ActionsTray(props: { show: boolean, children: React.ReactChild }){
    const [mouseEntered, setMouseEntered] = useState(false);

    return (
        <div
            className={`actions-tray ${(props.show || mouseEntered) ? 'show' : 'hide'}`}
            onMouseEnter={() => setMouseEntered(true)}
            onMouseLeave={() => setMouseEntered(false)}
        >
            {
                props.children
            }
        </div>
    );
}