import * as React from "react";

export function Tags(props: { tags: string[] }) {
    return (
        <div className="tag-container">
            {props.tags.map(tag => <span className="tag">{tag}</span>)}
        </div>
    );
}