import { ISynth, SynthService } from "./synths";
import { AsyncProps, PromiseFn } from "react-async";

type ServiceFnIn<S, Result> = (
  props: { service: S } & AsyncProps<Result>,
) => Promise<Result>;
type ServiceFnProps<Service, Result> = {
  service: Service;
} & AsyncProps<Result>;

export function serviceFn<Service, Result>(
  serviceFnIn: ServiceFnIn<Service, Result>,
): PromiseFn<Result> {
  return serviceFnIn as unknown as PromiseFn<Result>;
}

export function loadSynths({
  service,
}: ServiceFnProps<SynthService, ISynth[]>): Promise<ISynth[]> {
  return service.listSynths();
}
