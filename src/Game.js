import * as cards from './Cards';
import axios from "axios";
import { useEffect, useState } from "react";
import {   useRouteMatch } from "react-router-dom";
import { useToasts } from 'react-toast-notifications';
import Hammer from 'react-hammerjs';

let count = 0;

export const Game = () => {
    const { params } = useRouteMatch();
    const { addToast } = useToasts();
    const [, setSocketCount] = useState(0);
    const [positions, setPositions] = useState(0);
    const [showColorModal, setShowColorModal] = useState(false);
    const [turn, setTurn] = useState(null);

    const [game, setGame] = useState({
        room: {
            current_player: {},
            players: [],
            board: []
        },
        player: {
            hand: []
        }
    });

    useEffect(() => {
        axios.get(`/play/${params.id}`).then(({ data }) => {
            setGame(data);
            setPositions(data.player.hand.map((_, i) => i));
        });
    }, [count]);

    const connect = () => {
        const socket = new WebSocket(
            `ws://localhost:8080/api/state/${params.id}`
        );
    
        socket.onmessage = ev => {
            count = count + 1;
            setSocketCount(count);
            console.log(ev);
        };
    
        socket.onerror = ev => {
            console.log(ev);
            setTimeout(connect, 1000);
        };
    };

    useEffect(() => {
        connect();
    }, []);
    
    const cell = window.innerWidth / (game.player.hand.length + 1);
    let frame = 0;

    const onPan = ev => {
        if (frame < 20) {
            frame++;
            return;
        }
        
        frame = 0;

        const newPositions = [...positions];
        
        if (ev.direction === 4) {
            newPositions.push(newPositions.shift());
        } else if (ev.direction === 2) {
            newPositions.unshift(newPositions.pop());
        } else {
            return;
        }

        setPositions(newPositions);
    };

    const onSwipe = async ev => {
        if (ev.direction === 8) {
            const length = game.player.hand.length;
            const half = Math.floor(length / 2 + length % 2) % length;
            const [card_id, card] = game.player.hand[(length - positions[half]) % length];

            console.log(card);
            const turn = { card_id };
            setTurn(turn);

            if (isColorCard(card)) {
                setShowColorModal(true);
            } else {
                doTurn(turn);
            }
        }
    };

    const onError = error => {
        addToast(error.response.data, { appearance: 'error', autoDismiss: true });
    };

    const doTurn = turn => {
        axios.post(`/turn/${params.id}`, turn).catch(onError);
    };

    const top = game.room.board[game.room.board.length - 1];
    const { text, onclick, className } = action(onError, params.id, game.room, game.player); 

    return (
        <main>
            <div id="control">
                <div id="players">
                    {game.room.players.map(player =>
                        <div key={player.name} className={player.id === game.room.current_player.id ? 'current player' : 'player'}>
                            <div>{player.name}</div>
                            <div>
                                <div>
                                    {player.hand.length}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                <button id="action" onClick={onclick} className={className}>
                    {text}
                </button>
                {isColorCard(top) && <div style={{ color: 'white' }}>
                    Current color is {game.room.color}
                </div>}
            </div>
            <div className="form">
                <div id="board">
                    {game.room.board.map((card, i) =>
                    <img
                        style={{ top: -i }}
                        key={card[0]}
                        alt={toImage(card)}
                        src={cards[toImage(card)]} />)}
                </div>
                <Hammer onPan={onPan} onSwipe={onSwipe} direction="DIRECTION_ALL">                    
                    <div id="hand">
                        {game.player.hand.map((card, i) =>
                        <img
                            alt={toImage(card)}
                            style={{
                                left: (positions[i] + 1) * cell + 'px',
                                ...topZ(positions[i], game.player.hand.length)
                            }}
                            draggable={false}
                            key={card[0]}
                            src={cards[toImage(card)]} />)}
                    </div>
                </Hammer>
            </div>

            {showColorModal && <div id="choose-color">
                {['Red', 'Green', 'Blue', 'Yellow'].map(color => <>
                    <div
                        key={color}
                        id={color.toLowerCase()}
                        onClick={() => {
                            const newTurn = { ...turn, color };
                            setTurn(newTurn);
                            doTurn(newTurn);
                            setShowColorModal(false);
                        }}>
                    </div>
                </>)}
            </div>}
        </main>
    )
};

const isColorCard = card => card === 'Plus4' || card === 'ChangeColor';

const topZ = (index = 0, length = 0) => {
    const half = Math.floor(length / 2);
    const style = { marginBottom: 0, zIndex: 0 };

    if (index < half) {
        style.zIndex = index + 1;
    } else if (index === half) {
        style.zIndex = half + 1;
        style.bottom = 10;
    } else {
        style.zIndex = length - index;
    }

    return style;
};

const toImage = cardTuple => {
    const [, card] = cardTuple;

    if (card.Number) {
        const [number, color] = card.Number;
        return `${color.toLowerCase()[0]}${number}`;
    }

    if (typeof card === 'object') {
        const [[type, color]] = Object.entries(card);
        return `${color.toLowerCase()[0]}_${type.toLowerCase()}`;
    }

    if (card === 'ChangeColor') {
        return 'color';
    }

    return card.toLowerCase();
};

const action = (onError, roomId, { state, chain_count: count, current_player }, { id, drawed }) => {
    let action = {};

    if (current_player.id != id) {
        action.text = 'Stand by';
        action.className = 'disabled';
        action.onclick = () => {

        };
    } else if (state === "Plus2") {
        action.text = 'Draw ' + count * 2;
        action.onclick = () => {
            axios.post('/penalty/' + roomId).catch(onError);
        };
    } else if (state === "Plus4") {
        action.text = 'Draw ' + count * 4;
        action.onclick = () => {
            axios.post('/penalty/' + roomId).catch(onError);
        };
    } else if (state === "Stop") {
        action.text = 'Pass';
        action.onclick = () => {
            axios.post('/penalty/' + roomId).catch(onError);
        };
    } else if (drawed) {
        action.text = 'Pass';
        action.onclick = () => {
            axios.post('/pass/' + roomId).catch(onError);
        };
    } else {
        action.text = 'Draw';
        action.onclick = () => {
            axios.post('/draw/' + roomId).catch(onError);
        };
    }

    return action;
};
