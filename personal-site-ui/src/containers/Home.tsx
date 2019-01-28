import * as React from "react";
import {RouteComponentProps} from "react-router";
import {useEffect} from "react";
import { Stage, Circle, Color, Text, Animation } from "grraf";

export interface Props {
}

export function Home(props: RouteComponentProps<Props>) {
    return (
        <div className={'container'}>
            <p>
                hi.
            </p>
        </div>
    );
}
