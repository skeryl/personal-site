import { useContext, useEffect, useRef, useState } from "react";
import { Post, PostSummary, PostType } from "personal-site-model";
import { ContentContext } from "../content/ContentContext";
import { PostClient } from "../content/post-client";

export function usePostClient(type: PostType) {
  const contentClientGetter = useContext(ContentContext);
  return contentClientGetter(type);
}

interface AsyncResponse<T> {
  isLoading: boolean;
  result: T | undefined;
  error: Error | undefined;
  cancel: () => void;
}

function usePostClientAction<T>(
  type: PostType,
  fetcher: (client: PostClient) => Promise<T>,
): AsyncResponse<T> {
  const client = usePostClient(type);
  const isCancelled = useRef<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<T | undefined>();
  const [error, setError] = useState<Error>();

  const cancel = () => {
    isCancelled.current = true;
  };

  useEffect(() => {
    setIsLoading(true);
    fetcher(client)
      .then((res) => {
        if (!isCancelled.current) {
          setResult(res);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled.current) {
          setError(err instanceof Error ? err : new Error(err));
          setIsLoading(false);
        }
      });
    return cancel;
  }, []);

  return {
    isLoading,
    result,
    error,
    cancel,
  };
}

export function useListPosts(type: PostType): AsyncResponse<PostSummary[]> {
  return usePostClientAction(type, (cli) => cli.listPosts());
}

export function usePost(
  type: PostType,
  id: string,
): AsyncResponse<Post | undefined> {
  return usePostClientAction(type, (cli) => cli.getPost(id));
}
