import {Post, PostSummary, PostType, PostTypes} from "../../../personal-site-model/models";
import {ComponentClass, ReactElement} from "react";
import {ExperimentComponent} from "../components/post/Experiment";
import {WriteUpComponent} from "../components/post/WriteUp";
import {ProjectComponent} from "../components/post/Project";
import {Stage} from "grraf";

type ContentRenderers = {
    [key in PostType]: Renderer<key>;
}

export type RenderThing<T extends PostType> = ComponentClass<{ post: PostTypes[T] }, any> |
    ((props: { post: PostTypes[T] }) => (ReactElement<any> | null));

export type Renderer<T extends PostType> = {
    template: RenderThing<T>;
};

export const Renderers: ContentRenderers = {
    [PostType.project]: {
        template: ProjectComponent
    },
    [PostType.experiment]: {
        template: ExperimentComponent
    },
    [PostType.writeUp]: {
        template: WriteUpComponent
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
        return `${postType.toString()}/${id}`;
    }

    static add<T extends Post>(postSummary: PostSummary, extras: TypeExtras[T['type']]): T {
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

        return post as T;
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
            .sort((a, b) => Math.sign(a.timestamp.getTime() - b.timestamp.getTime()));

        return sorted[0];
    }

}

export * from './experiments';