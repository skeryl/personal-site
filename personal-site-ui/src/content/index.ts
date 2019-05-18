import {
    ExperimentContent3D,
    Post,
    PostSummary,
    PostType,
    PostTypes,
    StageContent
} from "../../../personal-site-model/models";
import {ComponentClass, ReactElement} from "react";
import {ExperimentComponent} from "../components/post/Experiment";
import {WriteUpComponent} from "../components/post/WriteUp";
import {ProjectComponent} from "../components/post/Project";
import {ExperimentSummary} from "../components/post/ExperimentSummary";
import {ExperimentComponent3D} from "../components/post/Experiment3d";

type ContentRenderers = {
    [key in PostType]: Renderer<key>;
}

export type RenderThing<T extends PostType> = ComponentClass<{ post: PostTypes[T] }, any> |
    ((props: { post: PostTypes[T] }) => (ReactElement<any> | null));

export type Renderer<T extends PostType> = {
    main: RenderThing<T>;
    summary?: RenderThing<T>;
};

export const Renderers: ContentRenderers = {
    [PostType.project]: {
        main: ProjectComponent,
    },
    [PostType.experiment]: {
        main: ExperimentComponent,
        summary: ExperimentSummary
    },
    [PostType.experiment3d]: {
        main: ExperimentComponent3D
    },
    [PostType.writeUp]: {
        main: WriteUpComponent,
    },
};

export interface StaticContent {
    render(): ReactElement<any> | null
}

export type TypeExtras = {
    [PostType.project]: StaticContent,
    [PostType.writeUp]: StaticContent,
    [PostType.experiment]: StageContent,
    [PostType.experiment3d]: ExperimentContent3D,
};

const sortByTimestamp = (a, b) => Math.sign(b.timestamp.getTime() - a.timestamp.getTime());

interface AnyExperiment<T extends PostType.experiment | PostType.experiment3d> {
    type: T,
    experiment: PostTypes[T],
}

export class ContentDatabase {

    static readonly tagPosts: Map<string, string[]> = new Map<string, string[]>();
    static readonly posts: Map<string, Post> = new Map<string, Post>();

    private static getUri(id: string, postType: PostType) {
        const prefix = (postType === PostType.experiment3d || postType === PostType.experiment) ?
            PostType.experiment.toString() :
            postType.toString();
        return `${prefix}s/${id}`;
    }

    static add<T extends PostType>(postSummary: PostSummary, extras: TypeExtras[T]): PostTypes[T] {
        const uri = this.getUri(postSummary.id, postSummary.type);

        if(this.posts.has(uri)){
            throw new Error(`Content with uri: '${uri}' already registered.`);
        }

        const post: Post = {
            uri,
            ...postSummary,
            ...extras,
        };

        post.tags.forEach(tag => {
            if(!this.tagPosts.has(tag)){
                this.tagPosts.set(tag, []);
            }
            this.tagPosts.get(tag).push(post.uri);
        });

        this.posts.set(uri, post);

        return post as PostTypes[T];
    }

    static getExperiment(id: string): AnyExperiment<PostType.experiment | PostType.experiment3d> | undefined {
        const experiment = this.get(id, PostType.experiment);
        if(experiment){
            return { type: PostType.experiment, experiment };
        }
        const experiment3d = this.get(id, PostType.experiment3d);
        if(experiment3d){
            return { type: PostType.experiment3d, experiment: experiment3d };
        }
        return undefined;
    }

    static get<TType extends PostType>(id: string, postType: TType | null = null): PostTypes[TType] | undefined {
        if(postType){
            return this.posts.get(this.getUri(id, postType)) as PostTypes[TType];
        }
        return this.posts.get(id) as PostTypes[TType];
    }

    static summariesByTag(tag: string): PostSummary[] {
        return (this.tagPosts.get(tag) || [])
            .map(post => this.posts.get(post) as PostSummary)
            .filter(Boolean);
    }

    // ToDo: optimize
    static latest(): Post | undefined {
        let sorted = Array.from(this.posts.values())
            .sort(sortByTimestamp);

        return sorted[0];
    }

    static list<T extends PostType>(postType?: T): Array<PostTypes[T]> {
        const sortedPosts = Array.from(this.posts.values())
            .sort(sortByTimestamp);
        return (postType ? sortedPosts
            .filter(post => post.type === postType) : sortedPosts )as Array<PostTypes[T]>;
    }
}

export * from './experiments';