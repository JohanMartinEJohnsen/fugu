import React, { Component } from "react";
import Game from "./Game";
//import Board from "./Board";
import PubNubReact from "pubnub-react";
import Swal from "sweetalert2";
import shortid from "shortid";
import "./Game.css";
//import { placeholder } from "@babel/types";

class App extends Component {
  constructor(props) {
    super(props);
    this.pubnub = new PubNubReact({
      publishKey: "pub-c-fae6dfb9-0fd1-4b5e-a0f3-a3d4511085e9",
      subscribeKey: "sub-c-0b5e637c-3675-11eb-b6eb-96faa39b9528"
    });

    this.state = {
      piece: "",
      sushis: [],
      placed: [],
      isPlaying: false,
      isRoomCreator: false,
      isDisabled: false,
      myTurn: false
    };

    this.lobbyChannel = null;
    this.gameChannel = null;
    this.roomId = null;
    this.pubnub.init(this);
    this.userName = null;
    this.players = [];
    this.pieces = [true, true, true, false];
  }

  componentWillUnmount() {
    this.pubnub.unsubscribe({
      channels: [this.lobbyChannel, this.gameChannel]
    });
  }

  componentDidUpdate() {
    // Check that the player is connected to a channel
    if (this.lobbyChannel != null) {
      this.pubnub.getMessage(this.lobbyChannel, msg => {
        if (msg.message.newPlayer) {
          this.players.push(msg.message.userName);
        }
        // Start the game once an opponent joins the channel
        if (msg.message.gameStarted) {
          // Create a different channel for the game
          this.gameChannel = "fuguegame--" + this.roomId;
          this.players = msg.message.players;

          this.pubnub.subscribe({
            channels: [this.gameChannel]
          });

          this.setState({
            isPlaying: true
          });

          // Close the modals if they are opened
          Swal.close();
          console.log(this.state.sushis);
          /*
          (async () => {
            const inputOptions = new Promise(resolve => {
              setTimeout(() => {
                resolve({
                  true: "Normal sushi",
                  false: "Fugu sushi"
                });
              }, 1000);
            });

            const { value: sushi } = await Swal.fire({
              title: "Choose your first move",
              input: "radio",
              inputOptions: inputOptions,
              allowOutsideClick: false,
              allowEscapeKey: false,
              confirmButtonText: "Place sushi",
              inputValidator: value => {
                if (!value) {
                  return "You need to choose something!";
                } else {
                  if (value === "true" && !this.state.sushis.includes(true)) {
                    return "You do not have enough of this type of sushi!";
                  }
                  if (value === "false" && !this.state.sushis.includes(false)) {
                    return "You do not have enough of this type of sushi!";
                  }
                }
              }
            });

            if (sushi) {
              if (sushi === "true") {
                this.state.placed.push(true);
                this.state.sushis.shift();
              }
              if (sushi === "false") {
                this.state.placed.push(false);
                this.state.sushis.pop();
              }
              Swal.fire({ html: `you selected ${sushi}` });
              console.log(this.state.placed);
              console.log(this.state.sushis);
            }
          })();

          */
        }
      });
    }
  }

  // Create a room channel
  onPressCreate = e => {
    // Create a random name for the channel
    this.roomId = shortid.generate().substring(0, 5);
    this.lobbyChannel = "fugulobby--" + this.roomId;
    //this.userName = "Johan";
    //this.players.push("Johan");

    this.pubnub.subscribe({
      channels: [this.lobbyChannel],
      withPresence: true
    });

    // Open the modal
    Swal.mixin({
      allowOutsideClick: false,

      progressSteps: ["1", "2"],
      // Custom CSS
      customClass: {
        heightAuto: false,
        title: "title-class",
        popup: "popup-class",
        confirmButton: "button-class"
      }
    })
      .queue([
        { title: "Share this room ID with your friend", text: this.roomId },
        { title: "Enter your username", input: "text" }
      ])
      .then(result => {
        const answer = JSON.stringify(result.value[1]);
        const editedAnswer = answer.substring(1, answer.length - 1);
        console.log(editedAnswer);
        this.userName = editedAnswer;
        this.players.push(editedAnswer);
      });

    this.setState({
      piece: 1,
      sushis: [true, true, true, false],
      isRoomCreator: true,
      isDisabled: true, // Disable the 'Create' button
      myTurn: true // Room creator makes the 1st move
    });
  };

  // The 'Join' button was pressed
  onPressJoin = e => {
    Swal.mixin({
      input: "text",
      confirmButtonText: "Next &rarr;",
      showCancelButton: true,
      progressSteps: ["1", "2"]
    })
      .queue([
        {
          title: "Game Pin",
          text: "Enter the 5 characters that is unique for your game"
        },
        {
          title: "Username",
          text: "Enter the username you would like to be called "
        }
      ])
      .then(result => {
        if (result.value) {
          const answers = JSON.stringify(result.value);
          Swal.fire({
            title: "All done!",
            html: `
            Your answers:
            <pre><code>${answers}</code></pre>
          `,
            confirmButtonText: "Lovely!"
          });
          this.userName = result.value[1];
          this.joinRoom(result.value[0], result.value[1]);
        }
      });
  };
  getNumberInChannel = e => {
    console.log(this.players);
  };

  // Join a room channel
  joinRoom = (value, username) => {
    this.roomId = value;
    this.lobbyChannel = "fugulobby--" + this.roomId;

    // Check the number of people in the channel
    this.pubnub
      .hereNow({
        channels: [this.lobbyChannel]
      })
      .then(response => {
        if (response.totalOccupancy < 200) {
          this.pubnub.subscribe({
            channels: [this.lobbyChannel],
            withPresence: true
          });

          this.setState({
            piece: response.totalOccupancy + 1,
            sushis: [true, true, true, false]
          });

          console.log("Joined game as player " + this.state.piece);

          this.pubnub.publish({
            message: {
              newPlayer: true,
              userName: username
            },
            channel: this.lobbyChannel
          });
        } else {
          // Game in progress
          Swal.fire({
            position: "top",
            allowOutsideClick: false,
            title: "Error",
            text: "Game in progress. Try another room.",
            width: 275,
            padding: "0.7em",
            customClass: {
              heightAuto: false,
              title: "title-class",
              popup: "popup-class",
              confirmButton: "button-class"
            }
          });
        }
      })
      .catch(error => {
        console.log(error);
      });
  };
  startGame = e => {
    this.pubnub.publish({
      message: {
        gameStarted: true,
        players: this.players
      },
      channel: this.lobbyChannel
    });
  };

  // Reset everything
  endGame = () => {
    this.setState({
      piece: "",
      isPlaying: false,
      isRoomCreator: false,
      isDisabled: false,
      myTurn: false
    });

    this.lobbyChannel = null;
    this.gameChannel = null;
    this.roomId = null;

    this.pubnub.unsubscribe({
      channels: [this.lobbyChannel, this.gameChannel]
    });
  };

  render() {
    return (
      <div className="backGround-Brown">
        <div className="title">
          <p>¡FUGU!</p>
        </div>
        <div className="gamePin"></div>

        {!this.state.isPlaying && (
          <div className="game">
            <p>Gamepin: {this.roomId} </p>
            <p> Velkommen {this.userName}</p>
            <img
              src="https://i.imgur.com/y1DXfJk.png"
              alt="Welcome to FUGU"
              widt="30px"
              heigh="30px"
            />
            <div className="button-container">
              <button
                className="create-button "
                disabled={this.state.isDisabled}
                onClick={e => this.onPressCreate()}
              >
                {" "}
                Create
              </button>
              <button className="join-button" onClick={e => this.onPressJoin()}>
                {" "}
                Join
              </button>
              <button
                className="start-button"
                hidden={!this.state.isRoomCreator}
                onClick={e => this.startGame()}
              >
                {" "}
                Start
              </button>
            </div>
          </div>
        )}

        {this.state.isPlaying && (
          <Game
            pubnub={this.pubnub}
            gameChannel={this.gameChannel}
            piece={this.state.piece}
            isRoomCreator={this.state.isRoomCreator}
            myTurn={this.state.myTurn}
            xUsername={this.state.xUsername}
            oUsername={this.state.oUsername}
            endGame={this.endGame}
            placed={this.state.placed}
            sushis={this.state.sushis}
            occupancy={this.players.length}
            players={this.players}
            userName={this.userName}
            pieces={this.pieces}
            isPlaying={this.isPlaying}
          />
        )}
      </div>
    );
  }
}

export default App;
