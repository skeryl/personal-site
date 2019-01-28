
export interface Linkable {
    uri: string;
}

export interface Post extends Linkable {
    title: string;
    subtitle: string;
    timestamp: Date;
}

export interface WriteUp extends Post {
    
}

export interface Experiment extends Post {
}
