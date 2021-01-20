import React from "react";

const ColoredSquare = props => (
  <button className={`coloredSquare`} onClick={props.onClick}>
    {props.value}
  </button>
);

export default ColoredSquare;
