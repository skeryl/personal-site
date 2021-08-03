import { Action, Dispatch, Middleware } from "redux";

export type ServiceFunction<Service, Payload, Result> = (
  service: Service,
  payload: Payload,
) => Promise<Result>;

export interface ServiceAction<Service, Payload, Result> extends Action {
  service: string;
  payload: Payload;
  result: Result;
  serviceFunction: ServiceFunction<Service, Payload, Result>;
}

export interface ServiceResolution<Result> extends Action {
  result: Result | undefined;
  error: any | undefined;
}

const serviceActions: <Services extends Record<string, any>>(
  service: Services,
) => Middleware = (services) => (storeAPI) => {
  return function wrapDispatch(next: Dispatch) {
    return function handleAction<
      Service,
      Result,
      Payload,
      A extends ServiceAction<Service, Payload, Result>
    >(action: A) {
      if (action.service) {
        const service = services[action.service];
        if (!service) {
          console.error(
            `Service "${action.service}" not registered with serviceActions middleware. Make sure you include the service in middleware initialization.`,
          );
        }
        console.info("SERVICE! ", service);
        action
          .serviceFunction(service, action.payload)
          .then((result: Result) => {
            storeAPI.dispatch({
              type: `${action.type}-resolved`,
              error: undefined,
              result,
            });
          })
          .catch((error) => {
            storeAPI.dispatch({
              type: `${action.type}-resolved`,
              error,
              result: undefined,
            });
          });
      } else {
        return next(action);
      }
    };
  };
};

export default serviceActions;
