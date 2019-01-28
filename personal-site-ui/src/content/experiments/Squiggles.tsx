import * as React from "react";
import {ContentDatabase} from "../index";
import {PostType, WriteUp} from "../../../../personal-site-model/models";

export const CRMForDevs = ContentDatabase.add<WriteUp>({
    id: '1',
    tags: ['meta', 'websites', 'development'],
    title: 'A CRM for developers?',
    subtitle: 'A painful path to pleasant content delivery.',
    timestamp: new Date(2019, 1, 27),
    type: PostType.writeUp
}, {
    render: () => {
        return (
            <div>
                Test
            </div>
        );
    },
});