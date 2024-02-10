import React, { useContext, useMemo } from "react";
import { Provider } from "react-redux";
import { createSoundBoothStore } from "../redux";
import { ServicesContext } from "../context/synth-service-context";
import SoundBooth from "./SoundBooth";

export default function SoundBoothWrapper() {
  const services = useContext(ServicesContext);
  const store = useMemo(() => createSoundBoothStore(services), []);
  return (
    <Provider store={store}>
      <SoundBooth />
    </Provider>
  );
}
