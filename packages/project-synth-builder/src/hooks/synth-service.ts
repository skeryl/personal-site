import { ServicesContext } from "../context/synth-service-context";
import { useContext } from "react";

export function useSynthService() {
  const { synthService } = useContext(ServicesContext);
  return synthService;
}
