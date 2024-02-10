import { ServicesContext } from "../context/synth-service-context";
import { useContext } from "react";

export function useSynthService() {
  const { synths } = useContext(ServicesContext);
  return synths;
}
