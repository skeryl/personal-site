import React from "react";
import styled from "styled-components";
import { Pitch, PitchInformation } from "../../model/notes";

const SynthContainer = styled("div")`
  width: 100%;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
`;

interface NoteContainerProps {
  playing: boolean;
  sharp: boolean;
}

const NoteContainer = styled("div")`
  display: flex;
  flex-shrink: 1;
  flex-grow: 1;
  flex-basis: 2.5%;
  height: 100px;
  margin: 30px 2px;
  border-radius: 30px;
  text-transform: lowercase;
  opacity: ${({ playing }: NoteContainerProps) => (playing ? "1.0" : "0.85")};

  ${({ sharp, playing }: NoteContainerProps) =>
    sharp
      ? `
  background-color: ${playing ? "#ddaa47" : "rgba(201,165,122,0.36)"};
  transform: translate(0, -30px);
  `
      : `
  background-color: ${playing ? "#ddaa47" : "#ffec985c"};
  `}

  h5 {
    display: flex;
    align-self: flex-end;
    text-align: center;
    margin: 0;
    width: 100%;
    justify-content: space-around;
  }
`;

interface VisualNoteProps {
  note: Pitch;
  isPlaying: boolean;
}

function VisualNote(props: VisualNoteProps) {
  const { note, isPlaying } = props;
  const pitchInfo = PitchInformation[note];
  return (
    <NoteContainer
      playing={isPlaying}
      sharp={pitchInfo.nameShort.endsWith("#")}
    >
      <h5>{pitchInfo.nameShort}</h5>
    </NoteContainer>
  );
}

interface SynthVisualizerProps {
  playing: ReadonlySet<Pitch>;
}

export default function SynthNoteVisualizer(props: SynthVisualizerProps) {
  const { playing } = props;
  return (
    <SynthContainer>
      {Object.values(Pitch)
        .filter((pitch) => {
          const hertz = PitchInformation[pitch].hertz;
          return hertz >= 130.81 && hertz <= 830.61;
        })
        .map((note) => (
          <VisualNote key={note} note={note} isPlaying={playing.has(note)} />
        ))}
    </SynthContainer>
  );
}
