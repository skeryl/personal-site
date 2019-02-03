import {Post, PostSummary, PostType, PostTypes} from "../../../personal-site-model/models";
import {ComponentClass, ReactElement} from "react";
import {ExperimentComponent} from "../components/post/Experiment";
import {WriteUpComponent} from "../components/post/WriteUp";
import {ProjectComponent} from "../components/post/Project";
import {Stage} from "grraf";
import {ExperimentSummary} from "../components/post/ExperimentSummary";
import {PostSummaryComponent} from "../components/post/PostSummary";

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
    [PostType.writeUp]: {
        main: WriteUpComponent,
    },
};



export interface StaticContent {
    render(): ReactElement<any> | null
}

export interface StageContent {
    start(stage: Stage);
    stop();
}

export type TypeExtras = {
    [PostType.project]: StaticContent,
    [PostType.writeUp]: StaticContent,
    [PostType.experiment]: StageContent,
};

export class ContentDatabase {

    static readonly tagPosts: Map<string, string[]> = new Map<string, string[]>();
    static readonly posts: Map<string, Post> = new Map<string, Post>();

    private static getUri(id: string, postType: PostType) {
        return `${postType.toString()}s/${id}`;
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
            .sort((a, b) => Math.sign(b.timestamp.getTime() - a.timestamp.getTime()));

        return sorted[0];
    }

    static list<T extends PostType>(postType: T): Array<PostTypes[T]> {
        return Array.from(this.posts.values())
            .filter(post => post.type === postType) as Array<PostTypes[T]>;
    }
}

export * from './experiments';
export * from './projects';