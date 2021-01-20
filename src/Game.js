import React from "react";
import Board from "./Board";
import EatingBoard from "./EatingBoard";
import Swal from "sweetalert2";
import { throwStatement } from "@babel/types";

class Game extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      whosTurn: this.props.myTurn,
      bidding: false,
      passBidding: false,
      lastBidding: false,
      eatingStage: false,
      nextRound: false,
      placed: this.props.placed
    };
    this.pieces = [true, true, true, false];
    this.sushis = [true, true, true, false];
    this.turn = 0;
    this.whosBidding = null;
    this.gameOver = false;
    this.counter = 0;
    this.bid = 0;
    this.passedPlayers = [];
  }

  componentDidMount() {
    this.props.pubnub.getMessage(this.props.gameChannel, msg => {
      this.turn = msg.message.turn;
      //Makes it the right players turn
      if (this.props.players[msg.message.turn] === this.props.userName) {
        this.myMove(msg.message.index, msg.message.piece);
      }
      //Sets the game into bidding stage
      else if (msg.message.bidding) {
        if (msg.message.amountBidden > 0) {
          this.publishBidding(msg.message.amountBidden, msg.message.ateBy);
          console.log(
            "Player " + msg.message.ateBy + "bid " + msg.message.amountBidden
          );
          this.publishBidding(msg.message.amountBidden, msg.message.ateBy);
        } else if (msg.message.amountBidden === null) {
          console.log(msg.message.ateBy + " passed");
          if (!this.passedPlayers.includes(msg.message.ateBy)) {
            this.passedPlayers.push(msg.message.ateBy);
          }

          if (
            this.passedPlayers.length === this.props.players.length - 1 &&
            !this.state.passBidding
          ) {
            console.log("du er den siste som er igjen");
            this.setState({
              lastBidding: true
            });
            this.announceEating(this.userName, this.bid);
            Swal.close();
          } else {
            this.publishBidding(msg.message.lastAmount, msg.message.ateBy);
          }
        } else {
          console.log(
            "Vi er inne i elsen og denne spilleren skal begynne å by " +
              this.whosBidding
          );
          this.setState({
            bidding: true
          });
        }
        console.log("LETS START BIDDING!");
      }
      //Sets the game into the eating stage
      else if (msg.message.eatingStage) {
        Swal.close();
        this.setState({
          eatingStage: true,
          bidding: false
        });
        console.log("eating stage");
      }
      //Eating player recives the sushi they clicked
      else if (msg.message.clicked && this.state.lastBidding) {
        this.eatSushi(msg.message.sushi);
      }
      //Fails the eating attempt
      else if (msg.message.failed) {
        Swal.fire({
          type: "error",
          title: "Oops...",
          text:
            "The attempt failed. The atempting player will loose a random sushi."
        }).then(result => {
          this.newRound(msg.message.userName);
          console.log("Nå ble den trykket");
        });
      }
      //The eating attempt is a success
      else if (msg.message.success) {
        Swal.fire({
          type: "success",
          title: "Wohooo!",
          confirmButtonText: "Next Round",
          text:
            "The attempt was a success. The atempting player will receive one point!."
        }).then(result => {
          this.newRound(msg.message.userName);
          console.log("Nå ble den trykket");
        });
        console.log("The bet was successfull");
      }

      // End the game and go back to the lobby
      else if (msg.message.endGame) {
        Swal.close();
        this.props.endGame();
      }
    });
  }
  newRound = player => {
    console.log("NEW ROUND BLIR KJØRT");

    if (this.state.lastBidding) {
      //Makes the one who bidded highest last round start
      this.setState({
        whosTurn: true,
        bidding: false,
        passBidding: false,
        lastBidding: false,
        eatingStage: false,
        placed: []
      });
      const piecesClone = [...this.pieces];
      this.sushis = piecesClone;
      this.bid = 0;
      this.turn = this.props.players.indexOf(this.props.userName);
      this.whosBidding = null;
      this.passedPlayers = [];
    } else {
      // Resets for everyone else
      console.log("nullstiller for ikke høyeste budgiver");
      this.setState({
        whosTurn: false,
        bidding: false,
        passBidding: false,
        lastBidding: false,
        eatingStage: false,
        placed: []
      });
      const piecesClone = [...this.pieces];
      this.sushis = piecesClone;
      this.turn = this.props.players.indexOf(player);
      this.bid = 0;
      this.whosBidding = null;
      this.passedPlayers = [];
    }
  };
  announceEating = (player, amount) => {
    this.props.pubnub.publish({
      message: {
        eatingStage: true,
        whoEating: player,
        amount: amount,
        bidding: false
      },
      channel: this.props.gameChannel
    });
  };

  announceBidding = (e, player, lastAmount) => {
    //tell other players the game is moving into the bidding phase
    this.props.pubnub.publish({
      message: {
        bidding: true,
        amountBidden: e,
        ateBy: player,
        lastAmount: lastAmount
      },
      channel: this.props.gameChannel
    });
  };

  annouceWinner = bidder => {
    console.log("Announce winner");
    this.props.pubnub.publish({
      message: {
        success: true,
        userName: this.props.userName,
        reset: true
      },
      channel: this.props.gameChannel
    });
  };
  annouceFail = bidder => {
    this.props.pubnub.publish({
      message: {
        failed: true,
        userName: this.props.userName,
        reset: true
      },
      channel: this.props.gameChannel
    });
  };

  // Opponent's move is annpunced
  myMove = e => {
    //this.turn = this.turn === 1 ? 2 : 1;
    this.setState({
      whosTurn: !this.state.whosTurn
    });
  };

  publishBidding = (e, player) => {
    //Setter whos bidding til neste som skal spise
    this.whosBidding =
      player + 1 === this.props.players.length ? 0 : player + 1;
    if (this.whosBidding === this.props.players.indexOf(this.props.userName)) {
      if (this.state.passBidding) {
        this.setState({
          whosTurn: !this.state.whosTurn
        });
        this.announceBidding(null, this.whosBidding, e);
        this.setState({
          whosTurn: !this.state.whosTurn
        });
      } else {
        this.setState({
          whosTurn: true
        });
        this.makeBid(e, this.whosBidding);
      }
    } else {
      console.log("Noen andre skal spise akkuratt nå");
    }
  };

  onMakeMove = sushi => {
    console.log("We are about to make a move");

    // Check if the square is empty and if it's the player's turn to make a move

    //squares[index] = this.props.piece;

    this.setState({
      whosTurn: !this.state.whosTurn
    });
    console.log("now this player is making a move" + this.turn);
    console.log("the total capacity is" + this.props.occupancy);

    // Other player's turn to make a move
    this.turn = this.turn + 1 === this.props.players.length ? 0 : this.turn + 1;
    console.log(
      " next move will be made by player " + this.props.players[this.turn]
    );

    // Publish move to the channel
    this.props.pubnub.publish({
      message: {
        piece: this.props.piece,
        turn: this.turn
      },
      channel: this.props.gameChannel
    });
    console.log("We made a move");

    //Check if there is a winner
    //this.checkForWinner(squares);
  };
  makeBid = (e, player) => {
    if (this.state.lastBidding) {
      return;
    }
    const a = parseInt(e) + 1;
    console.log("The last amount you bid was" + this.bid);
    Swal.fire({
      title: "How many pieces do you think you can eat?",
      input: "number",
      showCancelButton: true,
      cancelButtonText: "Pass",
      cancelButtonColor: "Orange",
      inputAttributes: {
        min: a
      },
      confirmButtonText: "Bid",
      allowOutsideClick: false
    }).then(result => {
      if (result.value) {
        console.log("DU mener du kan spise " + result.value);
        this.bid = result.value;
        this.setState({
          whosTurn: !this.state.whosTurn
        });
        this.announceBidding(result.value, player);
      } else {
        this.setState({
          passBidding: true,
          bidding: false
        });
        console.log("Du har passet");
        this.setState({
          whosTurn: !this.state.whosTurn
        });
        this.announceBidding(null, player, e);
      }
    });
  };

  showChoices = e => {
    (async () => {
      /* inputOptions can be an object or Promise */
      const inputOptions = new Promise(resolve => {
        setTimeout(() => {
          resolve({
            true: "Normal sushi",
            false: "Fugu sushi",
            eat: "Start bidding!"
          });
        }, 1000);
      });

      const { value: sushi } = await Swal.fire({
        title: "What sushi would you like to place?",
        input: "radio",
        inputOptions: inputOptions,
        allowOutsideClick: false,
        allowEscapeKey: false,
        confirmButtonText: "Place sushi",
        inputValidator: value => {
          if (!value) {
            return "You need to choose something!";
          } else {
            if (value === "true" && !this.sushis.includes(true)) {
              return "You do not have enough of this type of sushi!";
            }

            if (value === "false" && !this.sushis.includes(false)) {
              return "You do not have enough of this type of sushi!";
            }
          }
        }
      });

      if (sushi) {
        if (sushi === "eat") {
          this.whosBidding = this.turn;
          this.announceBidding(0);
          this.setState({
            bidding: true
          });
          this.makeBid(0, this.whosBidding);
        } else {
          if (sushi === "true") {
            this.state.placed.push(true);
            this.sushis.shift();
            console.log("this is what you have placed " + this.state.placed);
            console.log("And this is what you have left " + this.sushis);
          }
          if (sushi === "false") {
            this.state.placed.push(false);
            this.sushis.pop();
            console.log("this is what you have placed" + this.state.placed);
            console.log("And this is what you have left " + this.props.players);
          }
          this.onMakeMove(sushi);
          console.log(this.state.placed);
          console.log(this.sushis);
        }
      }
    })();
  };
  //If their screen is clicked they send a sushi to the last bidder.
  sendSushi = e => {
    this.props.pubnub.publish({
      message: {
        clicked: true,
        sushi: this.state.placed.pop()
      },
      channel: this.props.gameChannel
    });
    console.log("Sushi har blitt sendt");
  };
  //Eats all their own sushi at once. Fails bid if not enough sushis.
  eatOwnSushi = placed => {
    while (this.state.placed.length > 0) {
      const s = this.state.placed.pop();
      if (!s) {
        this.LoosePiece();
        this.annouceFail();
        break;
      } else {
        this.bid -= 1;
        if (this.bid === 0) {
          this.annouceWinner(); // Needs to be implemented
          break;
        }
      }
    }
    console.log("Vi er ferdig meg while løkken");
    console.log(this.bid);
  };

  eatSushi = sushi => {
    console.log("Nå skal vi spise en sushi");
    if (!sushi) {
      this.LoosePiece();
      this.annouceFail(); //This person has failed the attempt and looses a piece.
    } else if (sushi) {
      this.bid -= 1;
      console.log("Vi har trukket fra en sushi");
      console.log(this.bid);
      if (this.bid === 0) {
        console.log("Vi er inne i vinner iffen");
        this.annouceWinner();
      }
    }
  };

  LoosePiece = e => {
    if (this.pieces.includes(false)) {
      const n = Math.floor(Math.random() * this.pieces.length);
      if (n === 1) {
        this.pieces.pop();
        console.log("Du mistet en fugu sushi");
      } else {
        this.pieces.shift();
        console.log("Du mistet en vanlig sushi");
      }
    } else {
      this.pieces.pop();
      console.log(
        "Du mistet en valig sushi siden du ikke har noen fuguer igjen"
      );
    }
  };

  render() {
    let status;
    // Change to current player's turn
    status = `${this.state.whosTurn ? "Your turn" : "Opponent's turn"}`;

    return (
      <div className="game">
        {!this.state.eatingStage && (
          <div className="board">
            <Board
              squares={this.state.squares}
              //onClick={index => this.onMakeMove(index)}
              placed={this.state.placed}
            />
            <div id="functions">
              <p className="status-info">{status}</p>
              <button
                className="move-button"
                disabled={!this.state.whosTurn}
                onClick={e => this.showChoices()}
                hidden={
                  this.state.bidding ||
                  this.state.passBidding ||
                  this.state.eatingStage
                }
              >
                {" "}
                Make move
              </button>
            </div>
          </div>
        )}
        {this.state.eatingStage && (
          <EatingBoard
            squares={this.state.squares}
            onClick={e => this.sendSushi()}
            placed={this.state.placed}
            lastBidding={this.state.lastBidding}
            eatOwn={e => this.eatOwnSushi()}
          />
        )}
      </div>
    );
  }
}

export default Game;
