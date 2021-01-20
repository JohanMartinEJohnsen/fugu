import React from "react";

class Board extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div id="backgroundBoard">
        <img
          id="emptyBoard"
          src="https://i.imgur.com/LNH3flq.png"
          alt="board0"
          hidden={!(this.props.placed.length === 0)}
        ></img>
        <img
          id="fuguBoard"
          src="https://i.imgur.com/xBtGEro.png"
          alt="board1"
          hidden={!(this.props.placed.length === 1)}
        ></img>
        <img
          id="fuguBoard"
          src="https://i.imgur.com/v6qEAq9.png"
          alt="board2"
          hidden={!(this.props.placed.length === 2)}
        ></img>
        <img
          id="fuguBoard"
          src="https://i.imgur.com/Msw4WCu.png"
          alt="board3"
          hidden={!(this.props.placed.length === 3)}
        ></img>
        <img
          id="fuguBoard"
          src="https://i.imgur.com/656n59P.png"
          alt="board4"
          hidden={!(this.props.placed.length === 4)}
        ></img>
      </div>
    );
  }
}

export default Board;
